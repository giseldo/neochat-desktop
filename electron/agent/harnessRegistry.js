const { NativeHarnessAdapter } = require('./harnesses/nativeHarness');
const { PiHarnessAdapter } = require('./harnesses/piHarness');

const VALID_HARNESSES = new Set(['native', 'pi']);

function normalizeHarnessId(value) {
  return VALID_HARNESSES.has(value) ? value : 'native';
}

class HarnessRegistry {
  constructor(adapters = [new NativeHarnessAdapter(), new PiHarnessAdapter()]) {
    this.adapters = new Map();
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter) {
    if (!adapter?.id || typeof adapter.run !== 'function') throw new TypeError('Invalid harness adapter.');
    this.adapters.set(adapter.id, adapter);
  }

  get(id) {
    return this.adapters.get(normalizeHarnessId(id)) || this.adapters.get('native');
  }

  list() {
    return Array.from(this.adapters.values()).map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      description: adapter.description
    }));
  }

  run(options) {
    const harnessId = normalizeHarnessId(options?.settings?.agentHarness);
    return this.get(harnessId).run(options);
  }
}

const harnessRegistry = new HarnessRegistry();

module.exports = { HarnessRegistry, VALID_HARNESSES, harnessRegistry, normalizeHarnessId };
