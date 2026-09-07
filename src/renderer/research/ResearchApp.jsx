import React, { useEffect, useState } from 'react';
import './research.css';

const empty = { title: '', objectives: '', questions: '', inclusion: '', exclusion: '', population: '', intervention: '', comparison: '', outcomes: '', context: '' };
const sections = [
  ['Objetivos e perguntas', [['objectives', 'Objetivos da revisão'], ['questions', 'Perguntas de pesquisa — uma por linha']]],
  ['Critérios de elegibilidade', [['inclusion', 'Critérios de inclusão — um por linha'], ['exclusion', 'Critérios de exclusão — um por linha']]],
  ['PICOC · opcional', [['population', 'População'], ['intervention', 'Intervenção'], ['comparison', 'Comparação'], ['outcomes', 'Resultados'], ['context', 'Contexto']]],
];

export default function ResearchApp() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    document.title = 'NeoChat Research';
    window.research.list().then(setProjects).catch(error => setError(error.message));
  }, []);

  useEffect(() => {
    const preventLoss = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  const mayLeave = () => !dirty || window.confirm('Descartar as alterações não salvas?');
  const start = () => {
    if (!mayLeave()) return;
    setProject({ ...empty }); setDirty(false); setError(''); setStatus('');
  };
  const open = async id => {
    if (!mayLeave()) return;
    setBusy(true); setError('');
    try { setProject(await window.research.get(id)); setDirty(false); setStatus(''); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError(''); setStatus('');
    try {
      const saved = await window.research.save(project);
      setProject(saved); setDirty(false); setStatus('Protocolo salvo no computador.');
      setProjects(await window.research.list());
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const change = (field, value) => { setProject(current => ({ ...current, [field]: value })); setDirty(true); setStatus(''); };

  return <div className="research-app">
    <aside className="research-sidebar">
      <div className="research-brand">N<span>NeoChat <strong>Research</strong></span></div>
      <p className="research-caption">SEU ESPAÇO DE PESQUISA</p>
      <button className="research-primary" onClick={start} disabled={busy}>+ Nova revisão</button>
      <label className="research-search">Buscar revisões<input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Título do projeto" /></label>
      <nav aria-label="Projetos de revisão">
        {projects.filter(item => item.title.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(item => <button key={item.id} disabled={busy} aria-current={project?.id === item.id ? 'page' : undefined} onClick={() => open(item.id)}>
          <strong>{item.title}</strong><small>Atualizado em {new Date(item.updatedAt).toLocaleDateString('pt-BR')}</small>
        </button>)}
        {!projects.length && <p className="research-muted">Suas revisões aparecerão aqui.</p>}
      </nav>
      <footer>Uso individual · Armazenamento local</footer>
    </aside>
    <main className="research-main">
      <header className="research-top"><span>Revisões de literatura / {project ? 'Protocolo' : 'Início'}</span><span>NeoChat Research</span></header>
      {error && <div className="research-error" role="alert">{error}</div>}
      {!project ? <section className="research-welcome">
        <span className="research-tag">DO PLANEJAMENTO À EVIDÊNCIA</span>
        <h1>Sua próxima revisão<br />começa com uma boa pergunta.</h1>
        <p>Organize os objetivos, as perguntas e os critérios da sua revisão de literatura em um projeto local.</p>
        <button className="research-primary" onClick={start} disabled={busy}>Criar projeto de revisão</button>
        <div className="research-intro"><article><b>01 · Defina</b><p>Registre o que você pretende investigar.</p></article><article><b>02 · Delimite</b><p>Estabeleça os critérios de elegibilidade.</p></article><article><b>03 · Preserve</b><p>Salve e retome seu protocolo neste computador.</p></article></div>
      </section> : <form onSubmit={save} className="research-form">
        <div className="research-heading"><div><span className="research-tag">PLANEJAMENTO DA REVISÃO</span><h1>{project.id ? 'Protocolo de pesquisa' : 'Nova revisão'}</h1><p>Você pode salvar um rascunho e completar os campos depois.</p></div><button className="research-primary" disabled={busy}>{busy ? 'Aguarde…' : 'Salvar protocolo'}</button></div>
        <div role="status" className="research-status">{dirty ? 'Alterações não salvas' : status || (project.id ? `Salvo · versão ${project.revision}` : 'Novo projeto')}</div>
        <fieldset disabled={busy}>
          <section className="research-card"><label>Título da revisão <span aria-hidden="true">*</span><input required maxLength={200} value={project.title} onChange={event => change('title', event.target.value)} placeholder="Ex.: IA no ensino de programação" /></label></section>
          {sections.map(([title, fields]) => <section className="research-card" key={title}><h2>{title}</h2>{fields.map(([field, label]) => <label key={field}>{label}<textarea rows={field === 'objectives' ? 4 : 3} maxLength={100000} value={project[field]} onChange={event => change(field, event.target.value)} /></label>)}</section>)}
        </fieldset>
        <button className="research-primary" disabled={busy}>Salvar protocolo</button>
      </form>}
    </main>
  </div>;
}
