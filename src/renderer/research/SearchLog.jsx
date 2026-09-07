import { useState } from 'react';

export default function SearchLog({ project, onChange, busy }) {
  const [draft, setDraft] = useState({ database: '', query: '', date: new Date().toLocaleDateString('en-CA'), count: 0, notes: '' });
  const assessment = project.assessment || { qualityFields: [], extractionFields: [], answers: [], searches: [] };
  return <section><form className="research-card" onSubmit={event => { event.preventDefault(); onChange('assessment', { ...assessment, searches: [...assessment.searches, { ...draft, id: crypto.randomUUID() }] }); setDraft({ ...draft, query: '', notes: '', count: 0 }); }}>
    <h2>Registro das buscas</h2><p>Registre a consulta executada em cada base. Este formulário documenta a busca; não consulta a base automaticamente.</p>
    <fieldset disabled={busy}>{[['database', 'Base bibliográfica'], ['query', 'String de busca'], ['notes', 'Observações']].map(([key, label]) => <label key={key}>{label}<textarea required={key !== 'notes'} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
      <label>Data<input required type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>Resultados encontrados<input required min="0" step="1" type="number" value={draft.count} onChange={event => setDraft({ ...draft, count: Number(event.target.value) })} /></label>
    </fieldset><button disabled={busy} className="research-primary">Registrar busca</button>
  </form>{assessment.searches.map(item => <article key={item.id} className="research-card"><h2>{item.database} · {item.date}</h2><p>{item.count} resultados</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.query}</pre><p>{item.notes}</p></article>)}</section>;
}
