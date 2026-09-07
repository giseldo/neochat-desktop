import { useState } from 'react';

export default function Assessment({ project, kind, onChange, busy }) {
  const [label, setLabel] = useState('');
  const assessment = project.assessment || { qualityFields: [], extractionFields: [], answers: [], searches: [] };
  const fieldsKey = kind === 'quality' ? 'qualityFields' : 'extractionFields';
  const fields = assessment[fieldsKey];
  const studies = (project.references || []).filter(item => item.fullText === 'include');
  const update = next => onChange('assessment', { ...assessment, ...next });
  const answer = (referenceId, fieldId, patch) => {
    const existing = assessment.answers.find(item => item.referenceId === referenceId && item.fieldId === fieldId);
    const next = { referenceId, fieldId, value: '', evidence: '', page: '', ...existing, ...patch };
    update({ answers: [...assessment.answers.filter(item => item !== existing), next] });
  };
  return <section><div className="research-card"><h2>{kind === 'quality' ? 'Checklist de qualidade' : 'Formulário de extração'}</h2>
    <p>Defina os campos aplicados aos estudos incluídos após a leitura do texto completo. As respostas abaixo são preenchidas pelo pesquisador.</p>
    <form onSubmit={event => { event.preventDefault(); if (!label.trim()) return; update({ [fieldsKey]: [...fields, { id: crypto.randomUUID(), label: label.trim() }] }); setLabel(''); }}>
      <label>{kind === 'quality' ? 'Novo item do checklist' : 'Novo campo de extração'}<input required maxLength={1000} value={label} onChange={event => setLabel(event.target.value)} placeholder={kind === 'quality' ? 'O método está descrito de forma reproduzível?' : 'Método utilizado'} /></label><button className="research-primary" disabled={busy}>Adicionar campo</button>
    </form>
    {fields.map(field => <label key={field.id}>Nome do campo<input disabled={busy} value={field.label} onChange={event => update({ [fieldsKey]: fields.map(item => item.id === field.id ? { ...item, label: event.target.value } : item) })} /></label>)}
  </div>
    {!studies.length && <p>Inclua estudos na etapa de texto completo para preencher este formulário.</p>}
    {studies.map(study => <article className="research-card" key={study.id}><h2>{study.title}</h2>
      {fields.map(field => {
        const current = assessment.answers.find(item => item.referenceId === study.id && item.fieldId === field.id) || { value: '', evidence: '', page: '' };
        return <fieldset disabled={busy} className="research-answer" key={field.id}><legend>{field.label}</legend>
          <label>Resposta{kind === 'quality' ? <select value={current.value} onChange={event => answer(study.id, field.id, { value: event.target.value })}><option value="">Não avaliado</option><option value="yes">Sim</option><option value="partial">Parcialmente</option><option value="no">Não</option><option value="na">Não se aplica</option></select> : <textarea value={current.value} onChange={event => answer(study.id, field.id, { value: event.target.value })} />}</label>
          <label>Trecho de evidência / justificativa<textarea value={current.evidence} onChange={event => answer(study.id, field.id, { evidence: event.target.value })} /></label>
          <label>Página(s)<input maxLength={100} value={current.page} onChange={event => answer(study.id, field.id, { page: event.target.value })} /></label>
        </fieldset>;
      })}
    </article>)}
  </section>;
}
