const promptExtensions = require('../shared/system-prompt-extensions.json');

const DIAGRAM_PROMPT = promptExtensions.diagram;
const IMAGE_PROMPT = promptExtensions.image;
const HTML_VISUAL_PROMPT = promptExtensions.htmlVisual;

function appendSystemPromptExtensions(basePrompt, settings = {}, options = {}) {
    const sections = [String(basePrompt || '').trim()].filter(Boolean);

    if (settings.enableDiagramPrompt !== false) sections.push(DIAGRAM_PROMPT);
    if (settings.enableImagePrompt !== false) sections.push(IMAGE_PROMPT);
    if (settings.enableHtmlVisualPrompt !== false) sections.push(HTML_VISUAL_PROMPT);
    if (settings.enableCurrentDateTimePrompt !== false) {
        const dateTime = options.dateTimeString || new Date().toString();
        sections.push(`Current date and time: ${dateTime}`);
    }

    return sections.join('\n\n');
}

module.exports = {
    DIAGRAM_PROMPT,
    IMAGE_PROMPT,
    HTML_VISUAL_PROMPT,
    appendSystemPromptExtensions
};
