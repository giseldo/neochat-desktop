// Small strict BibTeX reader. Keeps LaTeX commands intact rather than guessing translations.
function parseBibtex(text) {
  let position = 0;
  const records = [];
  const macros = new Map();
  const error = message => { throw new Error(`BibTeX: ${message} (posição ${position}).`); };
  const skip = () => {
    while (position < text.length) {
      if (/\s/.test(text[position])) { position++; continue; }
      if (text[position] === '%') { while (position < text.length && text[position] !== '\n') position++; continue; }
      break;
    }
  };
  const token = () => {
    skip();
    const match = text.slice(position).match(/^[\w:./+-]+/);
    if (!match) error('identificador esperado');
    position += match[0].length;
    return match[0];
  };
  const group = () => {
    const opening = text[position++];
    const closing = opening === '{' ? '}' : '"';
    let depth = 0;
    let result = '';
    while (position < text.length) {
      const char = text[position++];
      if (char === '\\') {
        result += char;
        if (position < text.length) result += text[position++];
      } else if (char === '{') { depth++; result += char; }
      else if (char === '}' && depth > 0) { depth--; result += char; }
      else if (char === closing && depth === 0) return result;
      else result += char;
    }
    error('valor sem fechamento');
  };
  const value = () => {
    let result = '';
    while (true) {
      skip();
      if (['{', '"'].includes(text[position])) result += group();
      else {
        const name = token();
        if (/^\d+$/.test(name)) result += name;
        else if (macros.has(name.toLowerCase())) result += macros.get(name.toLowerCase());
        else error(`macro não definida: ${name}`);
      }
      skip();
      if (text[position] !== '#') return result.replace(/\s+/g, ' ').trim();
      position++;
    }
  };
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  months.forEach(month => macros.set(month, month));
  while (position < text.length) {
    skip();
    if (position >= text.length) break;
    if (text[position] !== '@') { position++; continue; }
    position++;
    const type = token().toLowerCase();
    skip();
    const opening = text[position++];
    if (!['{', '('].includes(opening)) error('entrada sem abertura');
    const closing = opening === '{' ? '}' : ')';
    if (type === 'comment') {
      let depth = 1;
      while (position < text.length && depth) {
        const char = text[position++];
        if (char === '\\') position++;
        else if (char === opening) depth++;
        else if (char === closing) depth--;
      }
      if (depth) error('comentário sem fechamento');
      continue;
    }
    if (type === 'preamble') {
      value(); skip();
      if (text[position++] !== closing) error('preâmbulo sem fechamento');
      continue;
    }
    if (type !== 'string') {
      skip();
      while (position < text.length && ![',', closing].includes(text[position])) position++;
      if (text[position++] !== ',') error('entrada sem campos');
    }
    const fields = {};
    while (position < text.length) {
      skip();
      if (text[position] === closing) break;
      const name = token().toLowerCase();
      skip();
      if (text[position++] !== '=') error('esperado =');
      const parsed = value();
      if (type === 'string') macros.set(name, parsed);
      else fields[name] = parsed;
      skip();
      if (position >= text.length) error('entrada sem fechamento');
      if (text[position] === ',') position++;
      else if (text[position] !== closing) error('esperada vírgula');
    }
    if (text[position++] !== closing) error('entrada sem fechamento');
    if (type === 'string') continue;
    if (!fields.title) error('referência sem título (herança crossref não é suportada)');
    records.push({ title: fields.title, authors: fields.author || '', year: fields.year || fields.date?.slice(0, 4) || '', doi: fields.doi || '', abstract: fields.abstract || '', source: fields.journal || fields.booktitle || '', url: fields.url || '' });
  }
  if (!records.length) error('nenhuma referência encontrada');
  return records;
}
module.exports = { parseBibtex };
