import { useState } from 'react';

const blank = { title: '', authors: '', year: '', doi: '', abstract: '', source: '', url: '' };
const labels = { title: 'Título', authors: 'Autores', year: 'Ano', doi: 'DOI', abstract: 'Resumo', source: 'Periódico / fonte', url: 'URL' };

export default function Library({ project, onChange, onImport, onFile, busy }) {
  const [draft, setDraft] = useState(blank);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const references = project.references || [];
  const add = event => {
    event.preventDefault();
    const reference = { ...draft, id: editing || crypto.randomUUID() };
    onChange('references', editing ? references.map(item => item.id === editing ? { ...item, ...reference } : item) : [...references, { ...reference, duplicateOf: '', screening: 'pending', screeningReason: '', fullText: 'pending', fullTextReason: '' }]);
    setDraft(blank); setEditing(null);
  };
  return <section>
    <div className="research-card"><h2>Biblioteca de estudos</h2><p>Importe um arquivo RIS ou BibTeX exportado de uma base bibliográfica ou cadastre um estudo. Possíveis duplicatas importadas são marcadas e preservadas para conferência.</p>
      <label>Importar referências (.ris, .bib)<input type="file" accept=".ris,.bib" disabled={busy || !project.id} onChange={event => { const file = event.target.files[0]; if (file) onImport(file); event.target.value = ''; }} /></label>
      {!project.id && <p>Salve o projeto antes de importar.</p>}
      <label>Buscar na biblioteca<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Título, autores ou DOI" /></label>
      <p>{references.length} registros · {references.filter(item => item.duplicateOf).length} possíveis duplicatas</p>
    </div>
    <form className="research-card" onSubmit={add}><h2>{editing ? 'Editar referência' : 'Adicionar referência'}</h2>
      <fieldset disabled={busy}>{Object.entries(labels).map(([field, label]) => <label key={field}>{label}{field === 'abstract' ? <textarea value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} /> : <input required={field === 'title'} maxLength={field === 'title' ? 2000 : 100000} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} />}</label>)}</fieldset>
      <button className="research-primary" disabled={busy}>{editing ? 'Aplicar edição' : 'Adicionar ao projeto'}</button>
      {editing && <button type="button" onClick={() => { setDraft(blank); setEditing(null); }}>Cancelar edição</button>}
    </form>
    {references.filter(item => `${item.title} ${item.authors} ${item.doi}`.toLowerCase().includes(query.toLowerCase())).map(item => <article className="research-card" key={item.id}>
      <h2>{item.title}</h2><p>{item.authors} · {item.year}</p><p>{item.doi}</p>
      {item.duplicateOf && <p className="research-status">Possível duplicata de: {references.find(other => other.id === item.duplicateOf)?.title}</p>}
      <button disabled={busy} onClick={() => { setEditing(item.id); setDraft(Object.fromEntries(Object.keys(blank).map(key => [key, item[key] || '']))); }}>Editar referência</button>
      <button disabled={busy || !project.id} onClick={() => onFile('attach', item.id)}>{item.hasPdf ? 'Substituir PDF' : 'Anexar PDF'}</button>
      {item.hasPdf && <button disabled={busy} onClick={() => onFile('openPdf', item.id)}>Abrir PDF</button>}
      {item.duplicateOf && <button disabled={busy} onClick={() => onChange('references', references.map(other => other.id === item.id ? { ...other, duplicateOf: '' } : other))}>Marcar como estudo distinto</button>}
    </article>)}
  </section>;
}
