const fetch = require('node-fetch');
const { BUILT_IN_PLUGINS } = require('./plugins/neoChatCatalog');

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const PLUGIN_ID_RE = /^[A-Za-z0-9._:-]+$/;
const MAX_FUNCTIONS = 20;
const MAX_RESPONSE_CHARS = 1000000;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeHttpUrl(value, base) {
  const url = base ? new URL(value, base) : new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Plugin URLs must use HTTP(S) and cannot contain credentials.');
  }
  return url;
}

function sanitizeFunctionName(value, fallback) {
  const cleaned = String(value || '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 128);
  const name = cleaned || fallback;
  return /^\d/.test(name) ? `fn_${name}` : name;
}

function convertOpenApiSpecToPlugin(spec, basePlugin = {}, manifestUrl = '') {
  if (!isRecord(spec) || !isRecord(spec.paths)) {
    throw new Error('The URL does not contain a valid OpenAPI paths object.');
  }

  const server = Array.isArray(spec.servers) && spec.servers.find(item => item?.url)?.url;
  const swaggerBase = spec.host
    ? `${Array.isArray(spec.schemes) && spec.schemes.includes('http') ? 'http' : 'https'}://${spec.host}${spec.basePath || ''}`
    : '';
  const baseUrl = safeHttpUrl(
    String(basePlugin.baseUrl || server || swaggerBase || '').replace(/\{[^}]+\}/g, ''),
    manifestUrl || undefined
  ).toString().replace(/\/$/, '');

  let auth;
  const schemes = spec.components?.securitySchemes || spec.securityDefinitions;
  const scheme = isRecord(schemes) ? Object.values(schemes).find(isRecord) : null;
  if (scheme?.type === 'apiKey') auth = { type: 'apiKey', name: scheme.name, in: scheme.in };
  else if (scheme?.type === 'oauth2') auth = { type: 'oauth2', required: true };
  else if (scheme?.type === 'http' && scheme.scheme === 'bearer') auth = { type: 'bearer', required: true };
  else auth = { type: 'none' };

  const functions = [];
  for (const [route, operations] of Object.entries(spec.paths).slice(0, 200)) {
    if (!route.startsWith('/') || route.startsWith('//') || !isRecord(operations)) continue;
    for (const [rawMethod, operation] of Object.entries(operations)) {
      const method = rawMethod.toUpperCase();
      if (!HTTP_METHODS.has(method) || !isRecord(operation)) continue;
      const description = String(operation.summary || operation.description || '').slice(0, 1024);
      if (!description) continue;

      const properties = {};
      const required = [];
      for (const parameter of (operation.parameters || []).slice(0, 50)) {
        if (!isRecord(parameter) || !['path', 'query'].includes(parameter.in) || !parameter.name) continue;
        const name = String(parameter.name).replace(/[^a-zA-Z0-9_]/g, '_');
        properties[name] = {
          type: parameter.schema?.type || parameter.type || 'string',
          description: parameter.description || parameter.name
        };
        if (parameter.required) required.push(name);
      }

      const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
      if (isRecord(bodySchema?.properties)) {
        Object.assign(properties, bodySchema.properties);
        for (const name of bodySchema.required || []) if (!required.includes(name)) required.push(name);
      }

      functions.push({
        name: sanitizeFunctionName(operation.operationId || `${method}_${route}`, `fn_${functions.length + 1}`),
        description,
        method,
        path: route.slice(0, 1024),
        parameters: { type: 'object', properties, ...(required.length ? { required } : {}) }
      });
      if (functions.length >= MAX_FUNCTIONS) break;
    }
    if (functions.length >= MAX_FUNCTIONS) break;
  }

  if (!functions.length) throw new Error('The OpenAPI document exposes no supported operations.');
  const info = isRecord(spec.info) ? spec.info : {};
  const id = String(basePlugin.id || info.title || 'openapi-plugin').toLowerCase().replace(/[^a-z0-9._:-]+/g, '-').replace(/^-|-$/g, '');
  return {
    id,
    title: basePlugin.title || info.title || id,
    description: basePlugin.description || info.description || '',
    logoUrl: basePlugin.logoUrl || '',
    manifestUrl,
    externalDocsUrl: basePlugin.externalDocsUrl,
    baseUrl,
    category: basePlugin.category || 'openapi',
    source: 'openapi',
    builtIn: false,
    functions,
    auth
  };
}

class ExternalPluginManager {
  constructor() {
    this.loadSettings = () => ({});
    this.saveSettings = () => {};
  }

  initialize({ loadSettings, saveSettings } = {}) {
    if (typeof loadSettings === 'function') this.loadSettings = loadSettings;
    if (typeof saveSettings === 'function') this.saveSettings = saveSettings;
  }

  _settings() {
    const settings = this.loadSettings() || {};
    return {
      settings,
      custom: Array.isArray(settings.externalPlugins) ? settings.externalPlugins : [],
      active: Array.isArray(settings.activeExternalPlugins) ? settings.activeExternalPlugins : [],
      configs: isRecord(settings.externalPluginConfigs) ? settings.externalPluginConfigs : {}
    };
  }

  _allDefinitions() {
    const { custom } = this._settings();
    return Array.from(new Map([...BUILT_IN_PLUGINS, ...custom].map(plugin => [plugin.id, plugin])).values());
  }

  list() {
    const { active, configs } = this._settings();
    return this._allDefinitions().map(plugin => ({
      ...plugin,
      name: plugin.title,
      version: plugin.version || '1.0.0',
      enabled: active.includes(plugin.id),
      active: active.includes(plugin.id),
      initialized: true,
      lazy: true,
      config: { ...(configs[plugin.id] || {}), authValue: undefined },
      pluginType: 'api'
    }));
  }

  get(id) {
    return this._allDefinitions().find(plugin => plugin.id === id);
  }

  toggle(id, enabled) {
    if (!this.get(id)) throw new Error(`Plugin ${id} not found`);
    const { settings, active } = this._settings();
    const next = new Set(active);
    if (enabled) next.add(id); else next.delete(id);
    this.saveSettings({ ...settings, activeExternalPlugins: Array.from(next) });
    return { success: true, plugin: this.list().find(plugin => plugin.id === id) };
  }

  configure(id, config = {}) {
    if (!this.get(id)) throw new Error(`Plugin ${id} not found`);
    const { settings, configs } = this._settings();
    const nextConfig = {
      ...(configs[id] || {}),
      ...(typeof config.baseUrl === 'string' ? { baseUrl: safeHttpUrl(config.baseUrl).toString().replace(/\/$/, '') } : {}),
      ...(typeof config.authValue === 'string' ? { authValue: config.authValue.trim() } : {}),
      ...(Array.isArray(config.enabledFunctions) ? { enabledFunctions: config.enabledFunctions.filter(Boolean) } : {})
    };
    this.saveSettings({ ...settings, externalPluginConfigs: { ...configs, [id]: nextConfig } });
    return { success: true, plugin: this.list().find(plugin => plugin.id === id) };
  }

  async installFromUrl(inputUrl) {
    const url = safeHttpUrl(inputUrl).toString();
    const response = await fetch(url, { timeout: 15000, size: 2000000 });
    if (!response.ok) throw new Error(`Unable to download plugin: HTTP ${response.status}`);
    let document = await response.json();
    let base = { manifestUrl: url };

    if (document.schema_version && document.api?.url) {
      base = {
        id: document.name_for_model || document.name_for_human,
        title: document.name_for_human,
        description: document.description_for_human || document.description_for_model,
        logoUrl: document.logo_url || '',
        manifestUrl: url
      };
      const specUrl = safeHttpUrl(document.api.url, url).toString();
      const specResponse = await fetch(specUrl, { timeout: 15000, size: 2000000 });
      if (!specResponse.ok) throw new Error(`Unable to download OpenAPI spec: HTTP ${specResponse.status}`);
      document = await specResponse.json();
      base.manifestUrl = specUrl;
    }

    const plugin = convertOpenApiSpecToPlugin(document, base, base.manifestUrl || url);
    if (!PLUGIN_ID_RE.test(plugin.id)) throw new Error('Plugin ID contains unsupported characters.');
    const { settings, custom } = this._settings();
    const next = [...custom.filter(item => item.id !== plugin.id), plugin];
    this.saveSettings({ ...settings, externalPlugins: next });
    return { success: true, plugin };
  }

  remove(id) {
    const plugin = this.get(id);
    if (!plugin || plugin.builtIn) throw new Error('Only custom plugins can be removed.');
    const { settings, custom, active, configs } = this._settings();
    const nextConfigs = { ...configs };
    delete nextConfigs[id];
    this.saveSettings({
      ...settings,
      externalPlugins: custom.filter(item => item.id !== id),
      activeExternalPlugins: active.filter(item => item !== id),
      externalPluginConfigs: nextConfigs
    });
    return { success: true, pluginId: id };
  }

  getToolDefinitions(isResponsesApi = false) {
    const { active, configs } = this._settings();
    const tools = [];
    for (const plugin of this._allDefinitions().filter(item => active.includes(item.id))) {
      const enabledFunctions = configs[plugin.id]?.enabledFunctions;
      for (const fn of plugin.functions || []) {
        if (Array.isArray(enabledFunctions) && !enabledFunctions.includes(fn.name)) continue;
        const name = sanitizeFunctionName(`${plugin.id}__${fn.name}`, fn.name);
        const definition = { name, description: fn.description || '', parameters: fn.parameters || { type: 'object', properties: {} } };
        tools.push(isResponsesApi ? { type: 'function', ...definition } : { type: 'function', function: definition });
      }
    }
    return tools;
  }

  _resolveTool(toolName) {
    const { active, configs } = this._settings();
    for (const plugin of this._allDefinitions().filter(item => active.includes(item.id))) {
      for (const fn of plugin.functions || []) {
        if (sanitizeFunctionName(`${plugin.id}__${fn.name}`, fn.name) === toolName) {
          return { plugin, fn, config: configs[plugin.id] || {} };
        }
      }
    }
    return null;
  }

  async executeTool(toolName, args = {}) {
    const resolved = this._resolveTool(toolName);
    if (!resolved) return null;
    const { plugin, fn, config } = resolved;
    const method = String(fn.method || 'GET').toUpperCase();
    if (!HTTP_METHODS.has(method) || !String(fn.path || '').startsWith('/') || String(fn.path).startsWith('//')) {
      throw new Error('Plugin function has an unsafe method or path.');
    }

    let route = fn.path;
    const remaining = { ...args };
    route = route.replace(/\{([^}]+)\}/g, (_match, key) => {
      const value = remaining[key] ?? remaining.url;
      if (value === undefined) throw new Error(`Missing required path parameter: ${key}`);
      delete remaining[key];
      return encodeURIComponent(String(value));
    });
    const url = safeHttpUrl(route, config.baseUrl || plugin.baseUrl);
    const headers = { Accept: 'application/json, text/plain;q=0.9, */*;q=0.8' };
    const authValue = config.authValue;
    const auth = plugin.auth || {};
    if (authValue && (auth.type === 'bearer' || auth.type === 'oauth2')) headers.Authorization = `Bearer ${authValue}`;
    if (authValue && auth.type === 'apiKey') {
      if (auth.in === 'query') url.searchParams.set(auth.name || 'api_key', authValue);
      else headers[auth.name || 'X-API-Key'] = authValue;
    }

    const request = { method, headers, timeout: 30000, size: 5000000 };
    if (['GET', 'DELETE'].includes(method)) {
      for (const [key, value] of Object.entries(remaining)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    } else {
      headers['Content-Type'] = 'application/json';
      request.body = JSON.stringify(remaining);
    }

    const response = await fetch(url.toString(), request);
    const text = (await response.text()).slice(0, MAX_RESPONSE_CHARS);
    if (!response.ok) throw new Error(`Plugin request failed with HTTP ${response.status}: ${text.slice(0, 1000)}`);
    try { return JSON.parse(text); } catch { return text; }
  }
}

const externalPluginManager = new ExternalPluginManager();

module.exports = { ExternalPluginManager, externalPluginManager, convertOpenApiSpecToPlugin, safeHttpUrl };
