const { randomUUID } = require('crypto');

function parseRis(text) {
  const records = [];
  let current = null;
  let last = '';
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9]{2})\s{2}-\s?(.*)$/);
    if (!match) {
      if (current && last && line.trim()) current[last][current[last].length - 1] += ` ${line.trim()}`;
      continue;
    }
    const [, tag, value] = match;
    if (tag === 'TY') {
      if (current) throw new Error('RIS incompleto: registro sem ER.');
      current = {}; last = '';
    } else if (tag === 'ER') {
      if (!current) throw new Error('RIS inválido.');
      const first = (...tags) => tags.map(key => current[key]?.[0]).find(Boolean) || '';
      const title = first('TI', 'T1', 'CT');
      if (!title.trim()) throw new Error('Há uma referência sem título no RIS.');
      records.push({ title, authors: (current.AU || current.A1 || []).join('; '), year: first('PY', 'Y1').slice(0, 4), doi: first('DO'), abstract: first('AB', 'N2'), source: first('JO', 'JF', 'T2'), url: first('UR') });
      current = null; last = '';
    } else if (current) {
      (current[tag] ||= []).push(value); last = tag;
    }
  }
  if (current) throw new Error('RIS incompleto: registro sem ER.');
  if (!records.length) throw new Error('Nenhuma referência RIS encontrada.');
  return records;
}

const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const doiKey = value => value.toLowerCase().trim().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '');

function addReferences(existing, incoming) {
  const references = [...existing];
  let duplicates = 0;
  for (const entry of incoming) {
    const match = references.find(item => (entry.doi && item.doi && doiKey(entry.doi) === doiKey(item.doi)) || (normalize(entry.title) === normalize(item.title) && entry.year === item.year));
    references.push({ ...entry, id: randomUUID(), duplicateOf: match?.id || '', screening: 'pending', screeningReason: '', fullText: 'pending', fullTextReason: '' });
    if (match) duplicates++;
  }
  return { references, duplicates };
}

module.exports = { parseRis, addReferences };
