export function composeAgentSystemPrompt({ activeProject, activePersona, canvasDoc, selectedText }) {
  const parts = [];
  if (activeProject?.customPrompt?.trim()) {
    parts.push(`[Instruções do Projeto "${activeProject.name}"]:\n${activeProject.customPrompt.trim()}`);
  }
  if (activePersona?.systemPrompt?.trim()) parts.push(activePersona.systemPrompt.trim());
  if (canvasDoc?.content) {
    let canvasContext = `[Documento Canvas Ativo]:\nTítulo: "${canvasDoc.title}"\nFormato: ${canvasDoc.language || 'markdown'}`;
    if (selectedText) canvasContext += `\nTrecho selecionado:\n${selectedText}`;
    canvasContext += `\nConteúdo:\n${canvasDoc.content}`;
    parts.push(canvasContext);
  }
  return parts.join('\n\n');
}
