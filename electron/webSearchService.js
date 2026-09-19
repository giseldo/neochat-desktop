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
 * Sanitize and clean search queries (removes redundant quotes, fixes bracket syntax)
 */
function sanitizeSearchQuery(query) {
  if (!query) return '';
  let q = query.trim();
  // Remove outer repeated quotes e.g. ""query"" or "\"query\""
  q = q.replace(/^["'\s]+|["'\s]+$/g, '').replace(/""+/g, '"');
  return q;
}

/**
 * Check if query is looking for current news / breaking events
 */
function isNewsQuery(query) {
  const q = String(query || '').toLowerCase();
  return /\b(not[ií]cia|not[ií]cias|news|hoje|today|manchete|manchetes|lan[çc]amento|atualidade|atualidades|acontece|fato|fatos|tecnologia|inform[aá]tica)\b/i.test(q);
}

/**
 * Google News RSS Search (Zero-Config, Real-time news & headlines)
 */
async function searchGoogleNews(query, maxResults = 5) {
  try {
    let cleanQ = sanitizeSearchQuery(query)
      .replace(/["']/g, ' ')
      .replace(/\b(202[0-9]|203[0-9])\b/g, '') // remove specific future/mock year lock
      .replace(/\b(site:[^\s]+)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQ) cleanQ = query;

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQ)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      },
      timeout: 6000
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const results = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && results.length < maxResults) {
      const itemBlock = match[1];
      const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemBlock);
      const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemBlock);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemBlock);
      const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/i.exec(itemBlock);
      const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(itemBlock);

      if (titleMatch) {
        const title = decodeHtmlEntities(titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim());
        const link = linkMatch ? linkMatch[1].trim() : '';
        const source = sourceMatch ? decodeHtmlEntities(sourceMatch[1].trim()) : '';
        let snippet = '';

        if (descMatch) {
          const rawDesc = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          snippet = decodeHtmlEntities(rawDesc);
        }

        let dateStr = '';
        if (pubDateMatch) {
          try {
            const d = new Date(pubDateMatch[1].trim());
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
          } catch {}
        }

        const fullSnippet = [source ? `[${source}]` : '', dateStr ? `(${dateStr})` : '', snippet || title]
          .filter(Boolean)
          .join(' ');

        if (title && link) {
          results.push({
            title,
            url: link,
            snippet: cleanAndTrimSnippet(fullSnippet, 280),
            domain: source || 'news.google.com',
            source: 'google_news'
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.warn('[GoogleNews] Error:', err.message);
    return [];
  }
}

/**
 * DuckDuckGo HTML Search (Zero-Config, Organic results)
 */
async function searchDuckDuckGo(query, maxResults = 5) {
  try {
    const cleanQ = sanitizeSearchQuery(query);
    const url = 'https://html.duckduckgo.com/html/';
    const body = `q=${encodeURIComponent(cleanQ)}&kl=br-pt`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      body,
      timeout: 7000
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    const bodyRegex = /<div class="[^"]*result__body[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match;

    while ((match = bodyRegex.exec(html)) !== null && results.length < maxResults) {
      const block = match[1];
      const titleMatch = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
      const snippetMatch = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(block);

      if (titleMatch) {
        const rawUrl = titleMatch[1];
        const uddgMatch = /[?&]uddg=([^&]+)/.exec(rawUrl);
        const realUrl = uddgMatch ? decodeURIComponent(uddgMatch[1]) : rawUrl;
        const title = decodeHtmlEntities(titleMatch[2]);
        const snippet = snippetMatch ? cleanAndTrimSnippet(snippetMatch[1]) : title;
        const domain = getDomainFromUrl(realUrl);

        if (title && realUrl && realUrl.startsWith('http') && !results.some(r => r.url === realUrl)) {
          results.push({
            title,
            url: realUrl,
            snippet: snippet || title,
            domain,
            source: 'duckduckgo'
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.warn('[DuckDuckGo] Error:', err.message);
    return [];
  }
}

/**
 * Direct Local Web Search (Zero-Config, Free, Multi-Engine)
 * Runs directly from the user's computer combining Google News, DuckDuckGo and Bing.
 */
async function searchLocalDirect(query, maxResults = 5) {
  const cleanQ = sanitizeSearchQuery(query);
  const results = [];
  const seenUrls = new Set();

  function addResult(item) {
    if (!item || !item.url || seenUrls.has(item.url)) return;
    seenUrls.add(item.url);
    results.push(item);
  }

  // 1. If query is news related, fetch Google News RSS first
  if (isNewsQuery(cleanQ)) {
    const newsResults = await searchGoogleNews(cleanQ, Math.min(maxResults, 5));
    for (const r of newsResults) addResult(r);
  }

  // 2. Query DuckDuckGo
  if (results.length < maxResults) {
    const ddgResults = await searchDuckDuckGo(cleanQ, maxResults - results.length + 2);
    for (const r of ddgResults) {
      if (results.length >= maxResults) break;
      addResult(r);
    }
  }

  // 3. Fallback to Bing
  if (results.length < maxResults) {
    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(cleanQ)}&setlang=pt-br&count=10`;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      };

      const response = await fetch(url, { method: 'GET', headers, timeout: 7000 });
      if (response.ok) {
        const html = await response.text();
        const blockRegex = /<li class="b_algo"[\s\S]*?<\/li>/gi;
        const blocks = html.match(blockRegex) || [];

        for (const block of blocks) {
          if (results.length >= maxResults) break;

          const linkMatch = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
          if (!linkMatch) continue;

          const rawUrl = linkMatch[1].replace(/&amp;/g, '&');
          const realUrl = extractRealUrl(rawUrl);
          const title = decodeHtmlEntities(linkMatch[2]);

          const snippetMatch = /<(?:p|div)[^>]*class="[^"]*(?:b_lineclamp|b_caption|b_snippet|b_algoSlug)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i.exec(block) ||
                               /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
          const rawSnippet = snippetMatch ? snippetMatch[1] : title;
          const snippet = cleanAndTrimSnippet(rawSnippet, 240);
          const domain = getDomainFromUrl(realUrl);

          if (title && realUrl && realUrl.startsWith('http')) {
            addResult({
              title,
              url: realUrl,
              snippet: snippet || title,
              domain,
              source: 'bing'
            });
          }
        }
      }
    } catch (bingErr) {
      console.warn('[Bing] Error:', bingErr.message);
    }
  }

  // 4. Relaxed query fallback if 0 results found (e.g. over-quoted query)
  if (results.length === 0) {
    const relaxed = cleanQ
      .replace(/["']/g, ' ')
      .replace(/\b(202[0-9]|203[0-9])\b/g, '')
      .replace(/\b(site:[^\s]+)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (relaxed && relaxed !== cleanQ) {
      const fallbackNews = await searchGoogleNews(relaxed, maxResults);
      for (const r of fallbackNews) addResult(r);
      if (results.length < maxResults) {
        const fallbackDDG = await searchDuckDuckGo(relaxed, maxResults);
        for (const r of fallbackDDG) addResult(r);
      }
    }
  }

  return results.slice(0, maxResults);
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
  const maxResults = Math.min(Math.max(options.maxResults || 5, 1), 10);

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Search query cannot be empty.');
  }

  const cleanQuery = sanitizeSearchQuery(query);
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
      // Default: Local Direct Search (Zero-Config, Free, Multi-Engine)
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
      description: 'Search the live web for real-time information, news, current events, facts, weather, technical docs, and latest data. Returns concise search results with titles, URLs, and descriptive snippets. For best results, use clear keywords (e.g. "notícias tecnologia hoje") and avoid overly restrictive exact-match quotes.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up on the web. Be specific and include key search terms.'
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
  searchGoogleNews,
  searchDuckDuckGo,
  searchTavily,
  searchBrave,
  cleanAndTrimSnippet
};
