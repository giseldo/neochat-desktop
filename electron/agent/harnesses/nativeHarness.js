const { agentLoop } = require('../agentLoop');

class NativeHarnessAdapter {
  constructor(loop = agentLoop) {
    this.id = 'native';
    this.name = 'Neo Native';
    this.description = 'Runtime nativo do NeoChat com suporte multiprovedor.';
    this.loop = loop;
  }

  async run(options) {
    return this.loop.run(options);
  }
}

module.exports = { NativeHarnessAdapter };
