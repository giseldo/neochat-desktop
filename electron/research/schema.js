const { z } = require('zod');
const text = z.string().max(100000).default('');
const decision = z.enum(['pending', 'include', 'exclude']).default('pending');
const reference = z.object({
  id: z.string().uuid(), title: z.string().trim().min(1).max(2000), authors: text, year: text, doi: text, abstract: text, source: text, url: text,
  duplicateOf: z.union([z.literal(''), z.string().uuid()]).default(''),
  screening: decision, screeningReason: text, fullText: decision, fullTextReason: text,
});
const librarySchema = z.array(reference).max(50000).superRefine((items, ctx) => {
  const ids = new Set(items.map(item => item.id));
  if (ids.size !== items.length) ctx.addIssue({ code: 'custom', message: 'Referências com IDs repetidos.' });
  for (const item of items) {
    if (item.duplicateOf && (!ids.has(item.duplicateOf) || item.duplicateOf === item.id)) ctx.addIssue({ code: 'custom', message: 'Duplicata inválida.' });
    if ((item.screening === 'exclude' && !item.screeningReason.trim()) || (item.fullText === 'exclude' && !item.fullTextReason.trim())) ctx.addIssue({ code: 'custom', message: 'Informe o motivo da exclusão.' });
    if (item.fullText !== 'pending' && item.screening !== 'include') ctx.addIssue({ code: 'custom', message: 'Inclua o estudo na triagem antes de avaliar o texto completo.' });
  }
});
const formField = z.object({ id: z.string().uuid(), label: z.string().trim().min(1).max(1000) });
const assessmentSchema = z.object({
  qualityFields: z.array(formField).max(200).default([]),
  extractionFields: z.array(formField).max(200).default([]),
  answers: z.array(z.object({ referenceId: z.string().uuid(), fieldId: z.string().uuid(), value: text, evidence: text, page: z.string().max(100).default('') })).max(100000).default([]),
  searches: z.array(z.object({ id: z.string().uuid(), database: z.string().trim().min(1).max(1000), query: text, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), count: z.number().int().min(0), notes: text })).max(10000).default([]),
});
module.exports = { librarySchema, assessmentSchema };
