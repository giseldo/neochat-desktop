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

module.exports = { exportCsv };
