const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dialog, shell } = require('electron');

let appInstance = null;

/**
 * Ignored folder names for recursive scanning
 */
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'release',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.output',
  'coverage',
  '.idea',
  '.vscode',
  'vendor',
  'target',
  'bin',
  'obj',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  '.cache',
  'tmp',
  'temp',
  '.terraform'
]);

/**
 * Supported file extensions for indexing
 */
const SUPPORTED_EXTENSIONS = new Set([
  // JavaScript & TypeScript
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  // Web
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
  // Python & Data
  '.py', '.ipynb', '.sql', '.r',
  // Systems & Native
  '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.java', '.kt', '.swift', '.rb', '.php',
  // Config & Data formats
  '.json', '.jsonc', '.yaml', '.yml', '.toml', '.xml', '.ini', '.env.example',
  // Shell scripts
  '.sh', '.bash', '.zsh', '.ps1', '.cmd', '.bat',
  // Documents & Markdown
  '.md', '.markdown', '.txt', '.csv', '.tsv', '.log', '.rst', '.adoc'
]);

/**
 * Maximum file size to index (500 KB per file)
 */
const MAX_FILE_SIZE_BYTES = 500 * 1024;

/**
 * Initialize ragService with Electron app instance
 */
function initialize(app) {
  appInstance = app;
}

/**
 * Get directory path where RAG indexes are cached
 */
function getRagCacheDir() {
  if (!appInstance) {
    throw new Error('RAG service not initialized with app instance');
  }
  const cacheDir = path.join(appInstance.getPath('userData'), 'rag_cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

/**
 * Get file path for a project's index cache
 */
function getProjectIndexPath(projectId = 'global') {
  const sanitized = (projectId || 'global').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getRagCacheDir(), `${sanitized}_index.json`);
}

/**
 * Open native OS directory picker
 */
async function selectFolderDialog(browserWindow = null) {
  const options = {
    title: 'Selecionar Pasta para Base de Conhecimento (RAG)',
    properties: ['openDirectory']
  };

  const result = browserWindow 
    ? await dialog.showOpenDialog(browserWindow, options)
    : await dialog.showOpenDialog(options);

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    return {
      canceled: false,
      folderPath: selectedPath,
      folderName: path.basename(selectedPath)
    };
  }

  return { canceled: true, folderPath: null, folderName: null };
}

/**
 * Open folder in native OS file explorer
 */
function openFolderInExplorer(folderPath) {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
}

/**
 * Tokenize text into normalized keywords for BM25 indexing & query matching
 */
function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];

  // Split on camelCase (e.g. getUserById -> getUserById, get, User, By, Id)
  const expandedText = text.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Tokenize alphanumeric words (including underscores and hyphens)
  const rawTokens = expandedText.toLowerCase().match(/[a-z0-9_]{2,}/g) || [];
  
  // Filter out pure single digits and common stop words
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 'with',
    'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'nao', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais'
  ]);

  return rawTokens.filter(t => !stopWords.has(t) && t.length >= 2);
}

/**
 * Infer code/document language from file extension
 */
function getLanguageFromExt(ext) {
  const map = {
    '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
    '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c',
    '.cs': 'csharp', '.go': 'go', '.rs': 'rust', '.php': 'php', '.rb': 'ruby',
    '.sql': 'sql', '.html': 'html', '.css': 'css', '.scss': 'scss',
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
    '.sh': 'bash', '.ps1': 'powershell', '.md': 'markdown', '.txt': 'text'
  };
  return map[ext.toLowerCase()] || 'text';
}

/**
 * Chunk file content with sliding window by lines & characters
 */
function chunkFileContent(fileContent, relativePath, fullPath) {
  const lines = fileContent.split('\n');
  const totalLines = lines.length;
  const chunks = [];

  // If the file is small (under 60 lines or 1500 chars), keep as a single chunk
  if (totalLines <= 60 || fileContent.length <= 1500) {
    chunks.push({
      id: crypto.createHash('md5').update(`${relativePath}:1-${totalLines}`).digest('hex'),
      filePath: fullPath,
      relativePath: relativePath.replace(/\\/g, '/'),
      fileName: path.basename(fullPath),
      startLine: 1,
      endLine: totalLines,
      content: fileContent,
      characterCount: fileContent.length,
      language: getLanguageFromExt(path.extname(fullPath))
    });
    return chunks;
  }

  // Sliding window chunking by lines: window size ~45 lines, step ~30 lines (15 lines overlap)
  const windowSize = 45;
  const stepSize = 30;

  for (let i = 0; i < totalLines; i += stepSize) {
    const startLine = i + 1;
    const endLine = Math.min(i + windowSize, totalLines);
    const chunkLines = lines.slice(i, endLine);
    const chunkText = chunkLines.join('\n');

    if (chunkText.trim().length > 0) {
      chunks.push({
        id: crypto.createHash('md5').update(`${relativePath}:${startLine}-${endLine}`).digest('hex'),
        filePath: fullPath,
        relativePath: relativePath.replace(/\\/g, '/'),
        fileName: path.basename(fullPath),
        startLine,
        endLine,
        content: chunkText,
        characterCount: chunkText.length,
        language: getLanguageFromExt(path.extname(fullPath))
      });
    }

    if (endLine >= totalLines) break;
  }

  return chunks;
}

/**
 * Scan a directory recursively and extract text chunks from all supported files
 */
function scanDirectory(folderPath, baseFolder = null, onProgress = null, stats = { scannedFiles: 0 }) {
  if (!fs.existsSync(folderPath)) return [];
  const root = baseFolder || folderPath;
  let chunks = [];

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      const subChunks = scanDirectory(fullPath, root, onProgress, stats);
      chunks = chunks.concat(subChunks);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        continue;
      }

      try {
        const fileStat = fs.statSync(fullPath);
        if (fileStat.size > MAX_FILE_SIZE_BYTES || fileStat.size === 0) {
          continue;
        }

        const relativePath = path.relative(root, fullPath);
        const fileContent = fs.readFileSync(fullPath, 'utf8');

        const fileChunks = chunkFileContent(fileContent, relativePath, fullPath);
        chunks = chunks.concat(fileChunks);

        stats.scannedFiles++;
        if (onProgress && typeof onProgress === 'function') {
          onProgress({
            scannedFiles: stats.scannedFiles,
            currentFile: relativePath,
            chunksCreated: chunks.length
          });
        }
      } catch (err) {
        console.warn(`[RAG] Error reading file ${fullPath}: ${err.message}`);
      }
    }
  }

  return chunks;
}

/**
 * Build inverted index and document frequencies for BM25
 */
function buildBM25Index(chunks) {
  const invertedIndex = {}; // term -> { docId -> termFrequency }
  const docLengths = {}; // chunkId -> tokenCount
  const chunkMap = {}; // chunkId -> chunk object
  let totalLength = 0;

  for (const chunk of chunks) {
    chunkMap[chunk.id] = chunk;
    const tokens = tokenizeText(`${chunk.relativePath} ${chunk.fileName} ${chunk.content}`);
    docLengths[chunk.id] = tokens.length || 1;
    totalLength += tokens.length;

    const termFreqs = {};
    for (const t of tokens) {
      termFreqs[t] = (termFreqs[t] || 0) + 1;
    }

    for (const [term, freq] of Object.entries(termFreqs)) {
      if (!invertedIndex[term]) {
        invertedIndex[term] = {};
      }
      invertedIndex[term][chunk.id] = freq;
    }
  }

  const numDocs = chunks.length;
  const avgDocLength = numDocs > 0 ? (totalLength / numDocs) : 1;

  return {
    invertedIndex,
    docLengths,
    avgDocLength,
    totalDocs: numDocs,
    chunkMap
  };
}

/**
 * Load project index from cache file
 */
function loadProjectIndex(projectId = 'global') {
  const indexPath = getProjectIndexPath(projectId);
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[RAG] Error loading index cache for project ${projectId}:`, err);
    return null;
  }
}

/**
 * Save project index to cache file
 */
function saveProjectIndex(projectId = 'global', indexData) {
  const indexPath = getProjectIndexPath(projectId);
  try {
    fs.writeFileSync(indexPath, JSON.stringify(indexData), 'utf8');
    console.log(`[RAG] Saved index cache for project ${projectId} (${indexData.chunks?.length || 0} chunks) at ${indexPath}`);
  } catch (err) {
    console.error(`[RAG] Error saving index cache for project ${projectId}:`, err);
    throw err;
  }
}

/**
 * Index a folder for a project
 */
async function indexFolder(folderPath, projectId = 'global', onProgress = null) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    throw new Error(`Directory does not exist: ${folderPath}`);
  }

  const folderName = path.basename(folderPath);
  console.log(`[RAG] Starting indexing for folder: ${folderPath} (Project: ${projectId})`);

  const startTime = Date.now();
  const stats = { scannedFiles: 0 };
  const newChunks = scanDirectory(folderPath, folderPath, onProgress, stats);

  // Load existing index to merge if multiple folders are linked to the project
  const existing = loadProjectIndex(projectId) || { folders: {}, chunks: [] };
  
  // Remove previous chunks belonging to this folder path
  const normalizedFolderPath = path.resolve(folderPath).replace(/\\/g, '/');
  const filteredExistingChunks = (existing.chunks || []).filter(c => {
    const cFolder = path.resolve(c.filePath).replace(/\\/g, '/');
    return !cFolder.startsWith(normalizedFolderPath);
  });

  const mergedChunks = [...filteredExistingChunks, ...newChunks];
  const bm25 = buildBM25Index(mergedChunks);

  existing.folders = existing.folders || {};
  existing.folders[folderPath] = {
    folderPath,
    folderName,
    fileCount: stats.scannedFiles,
    chunkCount: newChunks.length,
    lastIndexedAt: new Date().toISOString()
  };

  const fullIndexData = {
    projectId,
    updatedAt: new Date().toISOString(),
    folders: existing.folders,
    totalFiles: Object.values(existing.folders).reduce((acc, f) => acc + (f.fileCount || 0), 0),
    totalChunks: mergedChunks.length,
    chunks: mergedChunks,
    bm25: {
      invertedIndex: bm25.invertedIndex,
      docLengths: bm25.docLengths,
      avgDocLength: bm25.avgDocLength,
      totalDocs: bm25.totalDocs
    }
  };

  saveProjectIndex(projectId, fullIndexData);

  const durationMs = Date.now() - startTime;
  console.log(`[RAG] Finished indexing for ${folderName}: ${stats.scannedFiles} files, ${newChunks.length} chunks in ${durationMs}ms`);

  return {
    success: true,
    folderPath,
    folderName,
    fileCount: stats.scannedFiles,
    chunkCount: newChunks.length,
    totalChunks: mergedChunks.length,
    durationMs
  };
}

/**
 * Remove a folder from a project's index
 */
function removeFolderFromProject(projectId, folderPath) {
  const existing = loadProjectIndex(projectId);
  if (!existing) return { success: true };

  const normalizedTarget = path.resolve(folderPath).replace(/\\/g, '/');
  const filteredChunks = (existing.chunks || []).filter(c => {
    const cPath = path.resolve(c.filePath).replace(/\\/g, '/');
    return !cPath.startsWith(normalizedTarget);
  });

  if (existing.folders && existing.folders[folderPath]) {
    delete existing.folders[folderPath];
  }

  const bm25 = buildBM25Index(filteredChunks);
  const updatedData = {
    ...existing,
    updatedAt: new Date().toISOString(),
    totalFiles: Object.values(existing.folders || {}).reduce((acc, f) => acc + (f.fileCount || 0), 0),
    totalChunks: filteredChunks.length,
    chunks: filteredChunks,
    bm25: {
      invertedIndex: bm25.invertedIndex,
      docLengths: bm25.docLengths,
      avgDocLength: bm25.avgDocLength,
      totalDocs: bm25.totalDocs
    }
  };

  saveProjectIndex(projectId, updatedData);
  return { success: true, remainingFolders: Object.keys(updatedData.folders || {}).length };
}

/**
 * Execute BM25 search over a project's index
 */
function queryKnowledge(query, options = {}) {
  const { projectId = 'global', maxResults = 5, minScore = 0.1 } = options;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return { results: [], query, totalMatches: 0 };
  }

  const cleanQuery = query.trim();
  const indexData = loadProjectIndex(projectId);

  if (!indexData || !indexData.chunks || indexData.chunks.length === 0) {
    return { results: [], query: cleanQuery, totalMatches: 0, message: 'No knowledge base indexed for this project.' };
  }

  const { invertedIndex, docLengths, avgDocLength, totalDocs } = indexData.bm25 || {};
  if (!invertedIndex) {
    return { results: [], query: cleanQuery, totalMatches: 0 };
  }

  const queryTokens = tokenizeText(cleanQuery);
  if (queryTokens.length === 0) {
    return { results: [], query: cleanQuery, totalMatches: 0 };
  }

  const k1 = 1.5;
  const b = 0.75;
  const scores = {}; // chunkId -> score

  // Map of chunks for fast lookup
  const chunkMap = {};
  for (const c of indexData.chunks) {
    chunkMap[c.id] = c;
  }

  const lowerQuery = cleanQuery.toLowerCase();

  for (const token of queryTokens) {
    const postingList = invertedIndex[token];
    if (!postingList) continue;

    // Document frequency for token
    const docFreq = Object.keys(postingList).length;
    // IDF calculation (Standard BM25 IDF)
    const idf = Math.log(1 + (totalDocs - docFreq + 0.5) / (docFreq + 0.5));

    for (const [chunkId, termFreq] of Object.entries(postingList)) {
      const docLength = docLengths[chunkId] || avgDocLength;
      // BM25 term weight
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
      const termScore = idf * (numerator / denominator);

      scores[chunkId] = (scores[chunkId] || 0) + termScore;
    }
  }

  // Exact phrase and path boosting
  for (const [chunkId, rawScore] of Object.entries(scores)) {
    const chunk = chunkMap[chunkId];
    if (!chunk) continue;

    let boost = 1.0;
    const contentLower = chunk.content.toLowerCase();
    const relPathLower = chunk.relativePath.toLowerCase();

    // Exact phrase match in content: +50% boost
    if (contentLower.includes(lowerQuery)) {
      boost += 0.5;
    }

    // Matching terms in file path / file name: +30% boost
    for (const t of queryTokens) {
      if (relPathLower.includes(t)) {
        boost += 0.3;
      }
    }

    scores[chunkId] = rawScore * boost;
  }

  // Sort chunks by score descending
  const sortedIds = Object.keys(scores)
    .filter(id => scores[id] >= minScore)
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, maxResults);

  const results = sortedIds.map(id => {
    const chunk = chunkMap[id];
    return {
      id: chunk.id,
      filePath: chunk.filePath,
      relativePath: chunk.relativePath,
      fileName: chunk.fileName,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      content: chunk.content,
      language: chunk.language,
      score: parseFloat(scores[id].toFixed(4))
    };
  });

  return {
    query: cleanQuery,
    projectId,
    totalMatches: results.length,
    results
  };
}

/**
 * Read specific content or range of lines from an indexed file
 */
function readFileContent(filePath, startLine = null, endLine = null) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const totalLines = lines.length;

  if (startLine != null && endLine != null) {
    const s = Math.max(1, parseInt(startLine, 10));
    const e = Math.min(totalLines, parseInt(endLine, 10));
    const slice = lines.slice(s - 1, e).join('\n');
    return {
      filePath,
      fileName: path.basename(filePath),
      totalLines,
      startLine: s,
      endLine: e,
      content: slice
    };
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    totalLines,
    startLine: 1,
    endLine: totalLines,
    content: raw
  };
}

/**
 * Get stats of a project's knowledge base
 */
function getProjectKnowledgeStats(projectId = 'global') {
  const indexData = loadProjectIndex(projectId);
  if (!indexData) {
    return {
      hasIndex: false,
      projectId,
      totalFiles: 0,
      totalChunks: 0,
      folders: []
    };
  }

  return {
    hasIndex: true,
    projectId,
    updatedAt: indexData.updatedAt,
    totalFiles: indexData.totalFiles || 0,
    totalChunks: indexData.totalChunks || 0,
    folders: Object.values(indexData.folders || {})
  };
}

/**
 * Get native tool definitions for AI models to query project knowledge
 */
function getRagToolDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'query_project_knowledge',
        description: 'Search local indexed project files, code, and documentation using BM25 hybrid ranking. Returns the most relevant code and text snippets with exact file paths and line numbers.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query or keywords (e.g. function names, file topics, architecture concepts, error messages).'
            },
            projectId: {
              type: 'string',
              description: 'Optional project ID to search within. Defaults to current project.'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'read_project_file',
        description: 'Read the content or a specific line range of an indexed file from the local project.',
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'The absolute or relative file path to read.'
            },
            startLine: {
              type: 'integer',
              description: 'Optional starting line number (1-indexed).'
            },
            endLine: {
              type: 'integer',
              description: 'Optional ending line number (1-indexed).'
            }
          },
          required: ['filePath']
        }
      }
    }
  ];
}

module.exports = {
  initialize,
  selectFolderDialog,
  openFolderInExplorer,
  indexFolder,
  removeFolderFromProject,
  queryKnowledge,
  readFileContent,
  getProjectKnowledgeStats,
  getRagToolDefinitions,
  tokenizeText
};
