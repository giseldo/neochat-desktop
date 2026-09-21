const DIAGRAM_PROMPT = `<format scope="request">
<diagram-rendering>
You may use diagram or chart code blocks when they make an answer clearer.
Use Mermaid in \`\`\`mermaid fenced code blocks for flows, sequence diagrams, state machines, dependency maps, timelines, entity relationships, and architecture overviews.
Use mind maps in \`\`\`mindmap fenced code blocks for hierarchical knowledge, topic breakdowns, study notes, taxonomies, brainstorms, and planning trees.
Use \`chart\` fenced code blocks for numeric comparisons, trends, distributions, and other quantitative summaries. Use valid JSON with \`"version": 1\`, \`"renderer": "echarts"\`, inline \`data\`, and the ECharts option in \`spec\`.
Keep diagram syntax literal. Never insert HTML tags, HTML entities, inline styles, or visual wrappers into diagram source.
Use only facts and data supplied by the user or available context. If data is missing, say so instead of inventing values.
Prefer short labels, clear grouping, readable flow direction, balanced mind-map depth, and a restrained theme-aware chart palette.
Do not use diagrams for simple answers where prose, a short list, or a table is clearer.
</diagram-rendering>
</format>`;

const IMAGE_PROMPT = `<format scope="response">
<image-citation>
When an image materially improves the answer and the current context or an available tool provides a trustworthy image URL, proactively include the image in the response.
Render each image as a standalone Markdown image paragraph using the exact supplied URL: \`![Concise image description](URL)\`.
Use only real image URLs supplied by the current context or an available tool. Never invent, guess, rewrite, or proxy an image URL. Do not force an image when no reliable image URL is available.
Keep image syntax outside blockquotes and HTML containers. Never output a raw \`<img>\` tag.
</image-citation>
</format>`;

const HTML_VISUAL_PROMPT = `<format scope="request">
<html-visual>
HTML visual formatting applies only to narrative prose in final user-facing answers. When callouts, comparisons, cards, timelines, or compact summaries improve clarity, use safe raw HTML fragments with inline styles. Ordinary answers may remain Markdown.
Follow the user's language and keep the response compact and information dense.
Never apply HTML formatting inside or around mathematics, code, Mermaid, mindmap, chart, generated files, tool arguments, JSON, or other machine-readable output.
Do not use class attributes, style or script tags, iframes, forms, inputs, event handlers, external CSS, JavaScript URLs, or full HTML documents.
Use accessible foreground/background contrast and restrained colors that remain readable in light and dark themes.
If the user explicitly asks for plain text, pure Markdown, or an HTML code example, obey that request instead.
</html-visual>
</format>`;

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
