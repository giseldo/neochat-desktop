/**
 * Knowledge Graph & Data Studio Plugin for NeoChat Desktop
 * 
 * Provides:
 * - 2D Graph extraction of RAG documents, entities, and conceptual connections
 * - Automatic tabular data parsing (CSV, TSV, JSON) and chart recommendation
 */

const fs = require('fs');
const path = require('path');

class KnowledgeGraphEngine {
  /**
   * Extract knowledge graph nodes and links from RAG store or raw content
   */
  async getKnowledgeGraphData({ projectId = 'default', appDataDir = '' }) {
    // Collect local knowledge files if available
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    const addNode = (id, label, type, val = 1, metadata = {}) => {
      if (!nodeMap.has(id)) {
        const node = { id, label, type, val, metadata };
        nodeMap.set(id, node);
        nodes.push(node);
      } else {
        const existing = nodeMap.get(id);
        existing.val += val;
      }
    };

    const addLink = (source, target, relationship = 'relates_to') => {
      if (source !== target) {
        links.push({ source, target, relationship });
      }
    };

    // Add Central Workspace Root node
    addNode('workspace_root', 'Base de Conhecimento', 'root', 5, { color: '#6366f1' });

    try {
      const ragService = require('../ragService');
      const stats = ragService.getProjectKnowledgeStats(projectId);

      if (stats && Array.isArray(stats.folders)) {
        stats.folders.forEach((folder, fIdx) => {
          const folderId = `folder_${fIdx}`;
          const folderName = path.basename(folder.path || `Pasta ${fIdx + 1}`);
          addNode(folderId, folderName, 'folder', 3, { path: folder.path, color: '#ec4899' });
          addLink('workspace_root', folderId, 'contains_folder');

          if (Array.isArray(folder.files)) {
            folder.files.forEach((file, fileIdx) => {
              const fileId = `file_${fIdx}_${fileIdx}`;
              const ext = path.extname(file.name || '').toLowerCase();
              addNode(fileId, file.name, 'file', 2, { ext, path: file.path, color: '#3b82f6' });
              addLink(folderId, fileId, 'contains_file');

              // Extract tag nodes
              if (file.tags && Array.isArray(file.tags)) {
                file.tags.forEach(tag => {
                  const tagId = `tag_${tag.toLowerCase().replace(/\s+/g, '_')}`;
                  addNode(tagId, `#${tag}`, 'tag', 1, { color: '#10b981' });
                  addLink(fileId, tagId, 'tagged_with');
                });
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn('[KnowledgeGraph] RAG service stats fallback:', e.message);
    }

    // If few nodes, generate representative conceptual knowledge graph sample
    if (nodes.length <= 1) {
      const concepts = [
        { id: 'c_arch', label: 'Arquitetura do Sistema', type: 'concept', val: 3, color: '#3b82f6' },
        { id: 'c_agent', label: 'Neo Agent Loop', type: 'module', val: 4, color: '#8b5cf6' },
        { id: 'c_mcp', label: 'MCP Connectors', type: 'module', val: 3, color: '#10b981' },
        { id: 'c_rag', label: 'RAG Embeddings', type: 'module', val: 3, color: '#f59e0b' },
        { id: 'c_models', label: 'Multi-Provider Routing', type: 'feature', val: 3, color: '#ec4899' },
        { id: 'c_tools', label: 'Tool Execution Catalog', type: 'feature', val: 2, color: '#06b6d4' },
        { id: 'c_memory', label: 'Context Compaction', type: 'concept', val: 2, color: '#84cc16' }
      ];

      concepts.forEach(c => addNode(c.id, c.label, c.type, c.val, { color: c.color }));
      addLink('workspace_root', 'c_arch');
      addLink('c_arch', 'c_agent');
      addLink('c_agent', 'c_tools');
      addLink('c_agent', 'c_mcp');
      addLink('c_agent', 'c_memory');
      addLink('workspace_root', 'c_rag');
      addLink('c_arch', 'c_models');
      addLink('c_models', 'c_agent');
    }

    return {
      nodes,
      links,
      stats: {
        totalNodes: nodes.length,
        totalLinks: links.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Parse tabular text (CSV, TSV, Markdown table) into structured chart datasets
   */
  parseTabularData(rawText = '') {
    if (!rawText || typeof rawText !== 'string') {
      return { columns: [], rows: [], recommendedChart: 'bar' };
    }

    const lines = rawText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return { columns: [], rows: [], recommendedChart: 'bar' };
    }

    // Determine separator: comma, semicolon, tab, or markdown pipe
    let separator = ',';
    const firstLine = lines[0];
    if (firstLine.includes('|')) {
      separator = '|';
    } else if (firstLine.includes('\t')) {
      separator = '\t';
    } else if (firstLine.includes(';') && !firstLine.includes(',')) {
      separator = ';';
    }

    let headers = [];
    let dataRows = [];

    if (separator === '|') {
      // Markdown table
      const cleanLine = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      headers = cleanLine(lines[0]);
      // Skip separator line (e.g. |---|---|)
      const contentLines = lines.slice(1).filter(l => !/^[|\s\-:]+$/.test(l));
      dataRows = contentLines.map(l => cleanLine(l));
    } else {
      headers = lines[0].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
      dataRows = lines.slice(1).map(l => l.split(separator).map(c => c.trim().replace(/^["']|["']$/g, '')));
    }

    // Convert rows into objects and detect numerical columns
    const columns = headers.map(h => ({ key: h, label: h, isNumeric: false }));
    const parsedRows = [];

    dataRows.forEach(rowArr => {
      const rowObj = {};
      headers.forEach((h, idx) => {
        const val = rowArr[idx] !== undefined ? rowArr[idx] : '';
        const num = Number(val.replace(',', '.'));
        if (!isNaN(num) && val.trim() !== '') {
          rowObj[h] = num;
          columns[idx].isNumeric = true;
        } else {
          rowObj[h] = val;
        }
      });
      parsedRows.push(rowObj);
    });

    const numericCount = columns.filter(c => c.isNumeric).length;
    let recommendedChart = 'bar';
    if (headers.some(h => /data|date|ano|mes|time|hora|timestamp/i.test(h))) {
      recommendedChart = 'line';
    } else if (numericCount >= 1 && parsedRows.length <= 7) {
      recommendedChart = 'pie';
    } else if (numericCount > 1) {
      recommendedChart = 'bar';
    }

    return {
      columns,
      rows: parsedRows,
      recommendedChart,
      totalRows: parsedRows.length
    };
  }
}

const knowledgeGraphEngine = new KnowledgeGraphEngine();

module.exports = {
  id: 'knowledge-graph',
  name: 'Knowledge Graph & Data Studio',
  description: 'Visualizador 2D interativo de nós/conexões do RAG e gerador automático de gráficos para dados tabulares',
  category: 'intelligence',
  lazy: true,

  init: async (ctx) => {
    ctx.registerIpcHandler('knowledge-graph:get-data', async (_event, params = {}) => {
      const appDataDir = ctx.app ? ctx.app.getPath('userData') : '';
      return await knowledgeGraphEngine.getKnowledgeGraphData({ ...params, appDataDir });
    });

    ctx.registerIpcHandler('data-studio:parse-table', async (_event, { rawText }) => {
      return knowledgeGraphEngine.parseTabularData(rawText);
    });
  },

  activate: async () => {
    console.log('[KnowledgeGraphPlugin] Activated.');
  },

  deactivate: async () => {
    console.log('[KnowledgeGraphPlugin] Deactivated.');
  }
};
