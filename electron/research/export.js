function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(project) {
  const fields = [...project.assessment.qualityFields, ...project.assessment.extractionFields];
  const headers = ['ID', 'Título', 'Autores', 'Ano', 'DOI', 'Triagem', 'Motivo triagem', 'Texto completo', 'Motivo texto completo', ...fields.flatMap(field => [field.label, `${field.label} — evidência`, `${field.label} — página`])];
  const rows = project.references.map(reference => [reference.id, reference.title, reference.authors, reference.year, reference.doi, reference.screening, reference.screeningReason, reference.fullText, reference.fullTextReason, ...fields.flatMap(field => {
    const answer = project.assessment.answers.find(item => item.referenceId === reference.id && item.fieldId === field.id);
    return [answer?.value || '', answer?.evidence || '', answer?.page || ''];
  })]);
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}

function exportMarkdown(project) {
  const clean = value => String(value || '').replace(/([\\`*_{}[\]<>#|])/g, '\\$1');
  const sections = [['Objetivos', 'objectives'], ['Perguntas', 'questions'], ['Critérios de inclusão', 'inclusion'], ['Critérios de exclusão', 'exclusion'], ['População', 'population'], ['Intervenção', 'intervention'], ['Comparação', 'comparison'], ['Resultados esperados', 'outcomes'], ['Contexto', 'context']];
  const decisions = { pending: 'Pendente', include: 'Incluído', exclude: 'Excluído' };
  const lines = [`# ${clean(project.title)}`, '', `Exportado do NeoChat Research. Revisão do projeto: ${project.revision}.`, '', ...sections.flatMap(([label, key]) => [`## ${label}`, '', clean(project[key]) || 'Não informado.', '']), '## Buscas registradas', ''];
  for (const search of project.assessment.searches) lines.push(`### ${clean(search.database)} — ${search.date}`, '', clean(search.query), '', `${search.count} resultados. ${clean(search.notes)}`, '');
  lines.push('## Estudos e evidências', '');
  for (const reference of project.references) {
    lines.push(`### ${clean(reference.title)}`, '', `${clean(reference.authors)} (${clean(reference.year)}). DOI: ${clean(reference.doi) || 'Não informado'}`, '', `Triagem: ${decisions[reference.screening]}. ${clean(reference.screeningReason)}`, '', `Texto completo: ${decisions[reference.fullText]}. ${clean(reference.fullTextReason)}`, '');
    for (const field of [...project.assessment.qualityFields, ...project.assessment.extractionFields]) {
      const answer = project.assessment.answers.find(item => item.referenceId === reference.id && item.fieldId === field.id);
      if (answer) lines.push(`**${clean(field.label)}:** ${clean(answer.value)}`, '', `Evidência: ${clean(answer.evidence)} — página(s): ${clean(answer.page)}`, '');
    }
  }
  return lines.join('\n');
}
module.exports = { exportCsv, exportMarkdown };
