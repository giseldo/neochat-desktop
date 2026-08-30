const fetch = require('node-fetch');

/**
 * Service to handle web searches across multiple providers (Tavily, Brave)
 */

/**
 * Clean and decode HTML entities
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .trim();
}

/**
 * Clean, decode HTML entities and trim snippets for token efficiency
 */
function cleanAndTrimSnippet(text, maxLength = 220) {
  if (!text) return '';
  let clean = decodeHtmlEntities(text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (clean.length > maxLength) {
    const truncated = clean.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    clean = (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }
  return clean;
}

/**
 * Extract domain from a URL
 */
function getDomainFromUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Search Tavily Search API (Optimized for LLMs)
 */
async function searchTavily(query, apiKey, maxResults = 3) {
  if (!apiKey) {
    throw new Error('A chave de API do Tavily é necessária. Obtenha uma chave gratuita em https://tavily.com e adicione nas Configurações.');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false
    }),
    timeout: 12000
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tavily API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const results = (data.results || []).map(r => ({
    title: decodeHtmlEntities(r.title || 'Untitled'),
    url: r.url,
    snippet: cleanAndTrimSnippet(r.content || '', 220),
    domain: getDomainFromUrl(r.url)
  }));

  return {
    results,
    answer: data.answer ? cleanAndTrimSnippet(data.answer, 300) : null
  };
}

/**
 * Search Brave Search API
 */
async function searchBrave(query, apiKey, maxResults = 3) {
  if (!apiKey) {
    throw new Error('A chave de API do Brave Search é necessária. Obtenha uma chave gratuita em https://brave.com/search/api e adicione nas Configurações.');
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey
    },
    timeout: 10000
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brave Search API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawResults = data.web?.results || [];

  const results = rawResults.map(r => ({
    title: decodeHtmlEntities(r.title || ''),
    url: r.url,
    snippet: cleanAndTrimSnippet(r.description || '', 220),
    domain: getDomainFromUrl(r.url)
  }));

  return results;
}

/**
 * Unpack redirect URLs (Bing & generic)
 */
function extractRealUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const uMatch = /[?&]u=([a-zA-Z0-9_-]+)/.exec(rawUrl);
    if (uMatch) {
      const rawB64 = uMatch[1].startsWith('a1') ? uMatch[1].slice(2) : uMatch[1];
      const decoded = Buffer.from(rawB64, 'base64').toString('utf8');
      if (decoded.startsWith('http')) return decoded;
    }
  } catch (e) {}
  return rawUrl;
}

/**
 * Direct Local Web Search (Zero-Config, Free, No API key or credit card required)
 * Runs directly from the user's computer.
 */
async function searchLocalDirect(query, maxResults = 3) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=pt-br`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none'
  };

  const response = await fetch(url, {
    method: 'GET',
    headers,
    timeout: 10000
  });

  if (!response.ok) {
    throw new Error(`Busca local retornou status ${response.status}`);
  }

  const html = await response.text();
  const results = [];
  const blockRegex = /<li class="b_algo"[\s\S]*?<\/li>/gi;
  const blocks = html.match(blockRegex) || [];

  for (const block of blocks) {
    if (results.length >= maxResults) break;

    const linkMatch = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!linkMatch) continue;

    const rawUrl = linkMatch[1].replace(/&amp;/g, '&');
    const realUrl = extractRealUrl(rawUrl);
    const title = decodeHtmlEntities(linkMatch[2]);

    const snippetMatch = /<(?:p|div)[^>]*class="[^"]*(?:b_lineclamp|b_caption|b_snippet)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i.exec(block) ||
                         /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
    const rawSnippet = snippetMatch ? snippetMatch[1] : title;
    const snippet = cleanAndTrimSnippet(rawSnippet, 220);
    const domain = getDomainFromUrl(realUrl);

    if (title && realUrl && realUrl.startsWith('http') && !results.some(r => r.url === realUrl)) {
      results.push({
        title,
        url: realUrl,
        snippet: snippet || title,
        domain
      });
    }
  }

  return results;
}

/**
 * Main Web Search Dispatcher
 * @param {string} query - The search query
 * @param {object} options - Search options { provider, apiKey, maxResults }
 */
async function executeWebSearch(query, options = {}) {
  let provider = options.provider || 'local';
  if (provider === 'duckduckgo') {
    provider = 'local';
  }
  const apiKey = options.apiKey || '';
  const maxResults = Math.min(Math.max(options.maxResults || 3, 1), 10);

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Search query cannot be empty.');
  }

  const cleanQuery = query.trim();
  console.log(`[WebSearch] Executing search for "${cleanQuery}" via provider: ${provider} (maxResults: ${maxResults})`);

  let results = [];
  let summaryAnswer = null;

  try {
    if (provider === 'brave') {
      results = await searchBrave(cleanQuery, apiKey, maxResults);
    } else if (provider === 'tavily') {
      const tavilyRes = await searchTavily(cleanQuery, apiKey, maxResults);
      results = tavilyRes.results || [];
      summaryAnswer = tavilyRes.answer || null;
    } else {
      // Default: Local Direct Search (Zero-Config, Free)
      results = await searchLocalDirect(cleanQuery, maxResults);
    }
  } catch (err) {
    // If primary cloud provider fails due to missing key or network, fallback to local direct search
    if (provider !== 'local') {
      console.warn(`[WebSearch] Provider ${provider} failed (${err.message}). Falling back to Local Direct Search.`);
      try {
        results = await searchLocalDirect(cleanQuery, maxResults);
      } catch (fallbackErr) {
        throw new Error(`${err.message} (Fallback local também falhou: ${fallbackErr.message})`);
      }
    } else {
      throw err;
    }
  }

  return {
    query: cleanQuery,
    provider,
    resultsCount: results.length,
    results,
    summaryAnswer
  };
}

/**
 * Returns the native tool definition for OpenAI/Groq function calling
 */
function getWebSearchToolDefinition() {
  return {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the live web for real-time information, news, current events, facts, weather, technical docs, and latest data. Returns concise search results with titles, URLs, and descriptive snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up on the web. Be specific and include key terms.'
          }
        },
        required: ['query']
      }
    }
  };
}

module.exports = {
  executeWebSearch,
  searchWeb: executeWebSearch,
  getWebSearchToolDefinition,
  searchLocalDirect,
  searchTavily,
  searchBrave,
  cleanAndTrimSnippet
};
