const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const fields = ['title', 'objectives', 'questions', 'inclusion', 'exclusion', 'population', 'intervention', 'comparison', 'outcomes', 'context'];

class ResearchStore {
  constructor(directory) {
    this.directory = directory;
    fs.mkdirSync(directory, { recursive: true });
  }

  file(id) {
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('Identificador inválido.');
    return path.join(this.directory, `${id}.json`);
  }

  list() {
    return fs.readdirSync(this.directory).filter(name => name.endsWith('.json')).map(name => {
      const project = JSON.parse(fs.readFileSync(path.join(this.directory, name), 'utf8'));
      return { id: project.id, title: project.title, updatedAt: project.updatedAt };
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id) {
    return JSON.parse(fs.readFileSync(this.file(id), 'utf8'));
  }

  save(input) {
    if (!input || typeof input !== 'object') throw new Error('Projeto inválido.');
    const values = {};
    for (const field of fields) {
      if (typeof input[field] !== 'string' || input[field].length > 100000) throw new Error(`Campo inválido: ${field}`);
      values[field] = input[field];
    }
    values.title = values.title.trim();
    if (!values.title || values.title.length > 200) throw new Error('Informe um título de até 200 caracteres.');
    const previous = input.id ? this.get(input.id) : null;
    if (previous && input.revision !== previous.revision) throw new Error('O projeto mudou. Reabra antes de salvar.');
    const now = new Date().toISOString();
    const project = { ...values, id: previous?.id || randomUUID(), createdAt: previous?.createdAt || now, updatedAt: now, revision: (previous?.revision || 0) + 1, schemaVersion: 1 };
    const target = this.file(project.id);
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(project, null, 2), 'utf8');
    fs.renameSync(temporary, target);
    return project;
  }
}

module.exports = { ResearchStore, fields };
