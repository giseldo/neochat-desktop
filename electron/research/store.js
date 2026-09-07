const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { librarySchema, assessmentSchema, historySchema } = require('./schema');
const { parseRis, addReferences } = require('./library');

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
    const project = JSON.parse(fs.readFileSync(this.file(id), 'utf8'));
    project.references = (project.references || []).map(item => ({ ...item, hasPdf: fs.existsSync(this.pdfPath(id, item.id)) }));
    project.assessment = assessmentSchema.parse(project.assessment || {});
    return project;
  }

  pdfPath(id, referenceId) {
    this.file(id); this.file(referenceId);
    return path.join(this.directory, 'pdfs', id, `${referenceId}.pdf`);
  }

  attachPdf(id, referenceId, bytes) {
    const project = this.get(id);
    if (!project.references.some(item => item.id === referenceId)) throw new Error('Estudo não encontrado.');
    if (bytes.length > 50000000 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Selecione um PDF válido de até 50 MB.');
    const target = this.pdfPath(id, referenceId);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(`${target}.tmp`, bytes);
    fs.renameSync(`${target}.tmp`, target);
    return this.get(id);
  }

  backup(id) {
    const project = this.get(id);
    const pdfs = {};
    let size = 0;
    for (const reference of project.references.filter(item => item.hasPdf)) {
      const filename = this.pdfPath(id, reference.id);
      size += fs.statSync(filename).size;
      if (size > 150000000) throw new Error('O backup excede o limite de 150 MB de PDFs.');
      pdfs[reference.id] = fs.readFileSync(filename).toString('base64');
    }
    return JSON.stringify({ format: 'neochat-research', version: 1, project, pdfs }, null, 2);
  }

  restore(text) {
    const backup = JSON.parse(text);
    if (backup.format !== 'neochat-research' || backup.version !== 1 || !backup.project || backup.project.schemaVersion !== 1) throw new Error('Backup incompatível.');
    const references = librarySchema.parse(backup.project.references || []);
    const history = historySchema.parse(backup.project.history || []);
    const files = [];
    let size = 0;
    for (const [id, base64] of Object.entries(backup.pdfs || {})) {
      if (!references.some(item => item.id === id) || typeof base64 !== 'string') throw new Error('Anexo inválido no backup.');
      const bytes = Buffer.from(base64, 'base64');
      size += bytes.length;
      if (bytes.length > 50000000 || size > 150000000 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('PDF inválido no backup.');
      files.push([id, bytes]);
    }
    // Validate all metadata and attachments before creating an independent copy.
    const project = this.save({ ...backup.project, id: undefined, title: `${backup.project.title}` });
    try {
      for (const [id, bytes] of files) this.attachPdf(project.id, id, bytes);
      const restored = { ...this.get(project.id), history };
      fs.writeFileSync(`${this.file(project.id)}.tmp`, JSON.stringify(restored, null, 2), 'utf8');
      fs.renameSync(`${this.file(project.id)}.tmp`, this.file(project.id));
      return this.get(project.id);
    } catch (error) {
      fs.unlinkSync(this.file(project.id));
      fs.rmSync(path.join(this.directory, 'pdfs', project.id), { recursive: true, force: true });
      throw error;
    }
  }

  importRis({ id, revision, text }) {
    if (typeof text !== 'string' || text.length > 20000000) throw new Error('Arquivo RIS inválido ou maior que 20 MB.');
    const project = this.get(id);
    if (project.revision !== revision) throw new Error('O projeto mudou. Reabra antes de importar.');
    const { references, duplicates } = addReferences(project.references || [], parseRis(text));
    return { project: this.save({ ...project, references }), duplicates };
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
    const references = librarySchema.parse(input.references ?? previous?.references ?? []);
    const assessment = assessmentSchema.parse(input.assessment ?? previous?.assessment ?? {});
    const fieldIds = new Set([...assessment.qualityFields, ...assessment.extractionFields].map(field => field.id));
    if (fieldIds.size !== assessment.qualityFields.length + assessment.extractionFields.length) throw new Error('Campos repetidos.');
    const answerIds = new Set();
    for (const answer of assessment.answers) {
      const key = `${answer.referenceId}/${answer.fieldId}`;
      if (answerIds.has(key) || !fieldIds.has(answer.fieldId) || !references.some(item => item.id === answer.referenceId)) throw new Error('Resposta inválida.');
      answerIds.add(key);
      if (assessment.qualityFields.some(field => field.id === answer.fieldId) && !['', 'yes', 'partial', 'no', 'na'].includes(answer.value)) throw new Error('Avaliação de qualidade inválida.');
    }
    const history = [...(previous?.history || [])];
    for (const item of references) {
      const old = previous?.references?.find(reference => reference.id === item.id);
      for (const stage of ['screening', 'fullText']) {
        if ((old?.[stage] || 'pending') !== item[stage] || (old?.[`${stage}Reason`] || '') !== item[`${stage}Reason`]) history.push({ referenceId: item.id, stage, decision: item[stage], reason: item[`${stage}Reason`], at: now, actor: 'researcher' });
      }
    }
    const project = { ...values, references, assessment, history, id: previous?.id || randomUUID(), createdAt: previous?.createdAt || now, updatedAt: now, revision: (previous?.revision || 0) + 1, schemaVersion: 1 };
    const target = this.file(project.id);
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(project, null, 2), 'utf8');
    fs.renameSync(temporary, target);
    return this.get(project.id);
  }
}

module.exports = { ResearchStore, fields };
