const fetch = require('node-fetch');

const MCP_REGISTRY_BASE_URL = 'https://registry.modelcontextprotocol.io/v0.1';
const HEADER_NAME_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function trimString(value, max = 2048) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function shortHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(trimString(value));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeHeaders(remote) {
  const headers = {};
  let auth = null;
  for (const entry of Array.isArray(remote.headers) ? remote.headers : []) {
    if (!isRecord(entry)) continue;
    const name = trimString(entry.name, 120);
    if (!HEADER_NAME_RE.test(name)) continue;
    const value = trimString(entry.value, 4096);
    const hasVariable = /\{[^}]+\}/.test(value);
    if (value && !hasVariable && entry.isSecret !== true) {
      headers[name] = value;
    } else if (entry.isSecret === true || entry.isRequired === true || hasVariable) {
      if (auth) return null;
      auth = {
        type: name.toLowerCase() === 'authorization' ? 'bearer' : 'apiKey',
        name,
        required: entry.isRequired === true
      };
    }
  }
  return { headers, auth };
}

function normalizeRegistryServer(value) {
  const server = isRecord(value?.server) ? value.server : value;
  if (!isRecord(server)) return null;
  const name = trimString(server.name, 200);
  if (!name) return null;

  let endpoint = null;
  for (const preferred of ['streamable-http', 'sse']) {
    for (const remote of Array.isArray(server.remotes) ? server.remotes : []) {
      if (!isRecord(remote)) continue;
      const transport = trimString(remote.type || remote.transport, 80);
      const url = safeHttpUrl(remote.url);
      if (transport !== preferred || !url || /\{[^}]+\}/.test(String(remote.url)) || (isRecord(remote.variables) && Object.keys(remote.variables).length > 0)) continue;
      const headerInfo = normalizeHeaders(remote);
      if (!headerInfo) continue;
      endpoint = { transport, url, ...headerInfo };
      break;
    }
    if (endpoint) break;
  }
  if (!endpoint) return null;

  const version = trimString(server.version || server.latestVersion, 100) || 'latest';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'server';
  const repository = isRecord(server.repository) ? server.repository : {};
  return {
    id: `registry-${slug}-${shortHash(`${name}:${version}`)}`,
    registryName: name,
    name,
    version,
    author: trimString(server.publisher || server.author, 120) || 'MCP Registry',
    description: trimString(server.description, 1000) || 'No description provided',
    iconUrl: safeHttpUrl(server.iconUrl || server.logoUrl),
    docsUrl: safeHttpUrl(server.homepage || server.websiteUrl || repository.url || server.repositoryUrl),
    category: 'remote',
    badge: endpoint.transport === 'sse' ? 'SSE' : 'Streamable HTTP',
    source: 'registry',
    transport: endpoint.transport === 'sse' ? 'sse' : 'streamableHttp',
    url: endpoint.url,
    headers: endpoint.headers,
    auth: endpoint.auth,
    manifestUrl: `${MCP_REGISTRY_BASE_URL}/servers/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`
  };
}

function normalizeRegistryServers(payload, limit = 50) {
  const entries = isRecord(payload) && Array.isArray(payload.servers) ? payload.servers : Array.isArray(payload) ? payload : [];
  const servers = [];
  const seen = new Set();
  for (const entry of entries) {
    const server = normalizeRegistryServer(entry);
    if (!server || seen.has(server.id)) continue;
    seen.add(server.id);
    servers.push(server);
    if (servers.length >= limit) break;
  }
  return servers;
}

function getNextCursor(payload) {
  if (!isRecord(payload)) return '';
  return trimString(payload.nextCursor || payload.next_cursor || payload.metadata?.nextCursor || payload.metadata?.next_cursor, 512);
}

async function fetchRegistryPage({ search = '', cursor = '', limit = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const url = new URL(`${MCP_REGISTRY_BASE_URL}/servers`);
  url.searchParams.set('limit', String(safeLimit));
  url.searchParams.set('version', 'latest');
  if (trimString(search, 120)) url.searchParams.set('search', trimString(search, 120));
  if (trimString(cursor, 512)) url.searchParams.set('cursor', trimString(cursor, 512));
  const response = await fetch(url.toString(), { timeout: 15000, size: 3000000 });
  if (!response.ok) throw new Error(`MCP Registry returned HTTP ${response.status}`);
  const payload = await response.json();
  return { servers: normalizeRegistryServers(payload, safeLimit), nextCursor: getNextCursor(payload) };
}

module.exports = {
  MCP_REGISTRY_BASE_URL,
  fetchRegistryPage,
  normalizeRegistryServer,
  normalizeRegistryServers,
  safeHttpUrl
};
