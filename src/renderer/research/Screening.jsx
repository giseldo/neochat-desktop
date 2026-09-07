import { useState } from 'react';

export default function Screening({ project, onChange, busy }) {
  const [stage, setStage] = useState('screening');
  const [filter, setFilter] = useState('all');
  const references = project.references || [];
  const eligible = references.filter(item => stage === 'screening' || item.screening === 'include');
  const update = (id, field, value) => onChange('references', references.map(item => item.id !== id ? item : { ...item, [field]: value, ...(field === 'screening' && value !== 'include' ? { fullText: 'pending', fullTextReason: '' } : {}) }));
  return <section>
    <div className="research-card"><h2>Seleção dos estudos</h2><p>Registre uma decisão por etapa. Toda exclusão precisa de uma justificativa antes de salvar.</p>
      <label>Etapa<select value={stage} onChange={event => setStage(event.target.value)}><option value="screening">Título e resumo</option><option value="fullText">Texto completo</option></select></label>
      <label>Mostrar<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos</option><option value="pending">Pendentes</option><option value="include">Incluídos</option><option value="exclude">Excluídos</option></select></label>
      <p>{eligible.length} estudos nesta etapa · {eligible.filter(item => item[stage] === 'pending').length} pendentes</p>
      <details><summary>Consultar critérios do protocolo</summary><h3>Inclusão</h3><p style={{ whiteSpace: 'pre-wrap' }}>{project.inclusion || 'Não definidos'}</p><h3>Exclusão</h3><p style={{ whiteSpace: 'pre-wrap' }}>{project.exclusion || 'Não definidos'}</p></details>
    </div>
    {eligible.filter(item => filter === 'all' || item[stage] === filter).map(item => <article className="research-card" key={item.id}>
      <h2>{item.title}</h2><p>{item.authors} · {item.year}</p><p>{item.abstract || 'Resumo não informado.'}</p>
      {item.duplicateOf && <p>Possível duplicata. Confira antes de decidir.</p>}
      <label>Decisão<select disabled={busy} value={item[stage]} onChange={event => update(item.id, stage, event.target.value)}><option value="pending">Pendente</option><option value="include">Incluir</option><option value="exclude">Excluir</option></select></label>
      <label>Justificativa {item[stage] === 'exclude' ? '(obrigatória)' : '(opcional)'}<textarea disabled={busy} value={item[`${stage}Reason`]} onChange={event => update(item.id, `${stage}Reason`, event.target.value)} /></label>
    </article>)}
    {!eligible.length && <p>Nenhum estudo disponível. Para avaliar o texto completo, inclua estudos na triagem inicial.</p>}
  </section>;
}
