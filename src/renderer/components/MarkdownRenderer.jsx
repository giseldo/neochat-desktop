import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import "katex/dist/katex.min.css";
import CodeBlock from './CodeBlock';
import { extractThinking, preprocessCitations } from '../lib/messageUtils';

const imageFileExtensionsRegex = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;

/**
 * Preprocesses markdown content for LaTeX math equations while preserving code blocks.
 * Converts LaTeX display math \[ ... \] to $$ ... $$ and inline math \( ... \) to $ ... $.
 * Does NOT convert ```latex or ```tex code blocks to math.
 */
function preprocessMarkdownMath(content) {
  if (!content) return '';

  // Split content by code blocks and inline code to protect them from math replacement
  const parts = content.split(/(```[\s\S]*?```|`[^`\n]*?`)/g);

  return parts
    .map((part, index) => {
      // Odd indices are code blocks or inline code
      if (index % 2 === 1) {
        // If explicitly tagged as ```math or ```katex, convert to $$ display math
        const mathBlockMatch = /^```(?:math|katex)\r?\n([\s\S]*?)```$/.exec(part);
        if (mathBlockMatch) {
          return `\n$$\n${mathBlockMatch[1].trim()}\n$$\n`;
        }
        // Preserve all other code blocks (including ```latex, ```tex, etc.) unchanged
        return part;
      }

      let res = part;
      // Convert LaTeX display math delimiters \[ ... \] to $$ ... $$
      res = res.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);

      // Convert LaTeX inline math delimiters \( ... \) to $ ... $
      res = res.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

      // Escape currency dollar signs ($50, $10.99) so they are not parsed as math
      res = res.replace(/(^|[^\\])\$(?=\s*\d+([.,]\d+)?)/g, '$1\\$');

      return res;
    })
    .join('');
}

function MarkdownRenderer({ content = '', sources = [], disableMath = false, onPreviewArtifact }) {
  let processedContent = String(content || '');
  
  // If rendering regular message content (disableMath is false), strip any think tags
  if (!disableMath) {
    processedContent = extractThinking(processedContent).cleanContent;
  } else {
    // If rendering reasoning content, strip raw think tags wrappers
    processedContent = processedContent.replace(/<\/?\s*(think|thought|thinking)(?:\s[^>]*)?>/gi, '');
  }

  // Preprocess citation markers (e.g. 【3†source】, [3†source], [1], [2]) into clickable markdown links
  processedContent = preprocessCitations(processedContent, sources);

  // Process LaTeX math formulas if math rendering is enabled
  if (!disableMath) {
    processedContent = preprocessMarkdownMath(processedContent);
  }

  // Remark & Rehype plugins
  const remarkPlugins = disableMath ? [remarkGfm] : [remarkGfm, [remarkMath, { singleDollarTextMath: true }]];
  const rehypePlugins = disableMath ? [] : [[rehypeKatex, { throwOnError: false, strict: 'ignore' }]];

  const components = {
    span: ({ node, children, ...props }) => {
      // Apply word-wrap styles to KaTeX elements to prevent overflow
      if (props.className && props.className.includes('katex')) {
        return (
          <span 
            {...props} 
            style={{
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              wordBreak: 'break-all',
              ...props.style
            }}
          >
            {children}
          </span>
        );
      }
      return <span {...props}>{children}</span>;
    },
    // Custom renderer for code blocks and inline code
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children || '');

      // If inline or no newline and short, render as inline code badge
      if (inline || (!match && !codeString.includes('\n') && codeString.length < 80)) {
        return (
          <code 
            className="px-1.5 py-0.5 mx-0.5 rounded font-mono text-xs bg-muted text-foreground border border-border/60"
            {...props}
          >
            {children}
          </code>
        );
      }

      // Block code
      return (
        <CodeBlock
          language={match ? match[1] : ''}
          code={codeString}
          onPreviewArtifact={onPreviewArtifact}
        />
      );
    },
    // Avoid double pre wrappers around CodeBlock
    pre({ children }) {
      return <>{children}</>;
    },
    h1: ({ node: _, children, ...props }) => (
      <h1 className="text-xl font-bold mb-3 mt-4 text-foreground border-b border-border pb-1" {...props}>
        {children}
      </h1>
    ),
    h2: ({ node: _, children, ...props }) => (
      <h2 className="text-lg font-semibold mb-2 mt-3 text-foreground" {...props}>
        {children}
      </h2>
    ),
    h3: ({ node: _, children, ...props }) => (
      <h3 className="text-base font-medium mb-2 mt-3 text-foreground" {...props}>
        {children}
      </h3>
    ),
    h4: ({ node: _, children, ...props }) => (
      <h4 className="text-sm font-semibold mb-1 mt-2 text-foreground" {...props}>
        {children}
      </h4>
    ),
    h5: ({ node: _, children, ...props }) => (
      <h5 className="text-sm font-medium mb-1 mt-2 text-foreground" {...props}>
        {children}
      </h5>
    ),
    h6: ({ node: _, children, ...props }) => (
      <h6 className="text-xs font-semibold mb-1 mt-2 text-foreground uppercase tracking-wider" {...props}>
        {children}
      </h6>
    ),
    table: ({ node: _, ...props }) => (
      <div className="overflow-x-auto my-3 rounded-lg border border-border">
        <table className="table-auto w-full text-left text-sm" {...props} />
      </div>
    ),
    thead: ({ node: _, ...props }) => (
      <thead className="bg-muted/80 text-foreground border-b border-border font-medium" {...props} />
    ),
    tbody: ({ node: _, ...props }) => <tbody className="divide-y divide-border" {...props} />,
    tr: ({ node: _, ...props }) => <tr className="hover:bg-muted/40 transition-colors" {...props} />,
    td: ({ node: _, children, ...props }) => (
      <td className="p-2.5 text-sm text-foreground" {...props}>
        {children}
      </td>
    ),
    th: ({ node: _, children, ...props }) => (
      <th className="p-2.5 font-semibold text-sm text-foreground" {...props}>
        {children}
      </th>
    ),
    ol: ({ node: _, children, ...props }) => (
      <ol className="ml-5 mb-3 list-decimal space-y-1 text-foreground" {...props}>
        {children}
      </ol>
    ),
    ul: ({ node: _, children, ...props }) => (
      <ul className="ml-5 mb-3 list-disc space-y-1 text-foreground" {...props}>
        {children}
      </ul>
    ),
    li: ({ node: _, ...props }) => <li className="pl-1" {...props} />,
    p({ children, ...props }) {
      return (
        <p className="text-left mb-3 text-sm text-foreground leading-relaxed" {...props}>
          {children}
        </p>
      );
    },
    blockquote: ({ node: _, children, ...props }) => (
      <blockquote className="border-l-4 border-primary/60 bg-muted/40 pl-3.5 py-1 my-3 text-muted-foreground italic rounded-r" {...props}>
        {children}
      </blockquote>
    ),
    hr: ({ node: _, ...props }) => <hr className="my-4 border-border" {...props} />,
    img({ src, alt, ...props }) {
      return <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-2 border border-border" {...props} />;
    },
    a({ href, children, ...props }) {
      const isImageLink = href && imageFileExtensionsRegex.test(href);
      if (isImageLink) {
        return (
          <div>
            <a href={href} {...props} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {children}
            </a>
            <div className="mt-2">
              <img
                src={href}
                alt={`Image at ${href}`}
                className="max-w-full h-auto rounded-lg border border-border"
              />
            </div>
          </div>
        );
      }

      // Check if this link is a citation badge (e.g. [1], [2], 3, or [3])
      const childStr = typeof children === 'string'
        ? children.trim()
        : Array.isArray(children) && children.length === 1 && typeof children[0] === 'string'
          ? children[0].trim()
          : '';

      const isCitationBadge = /^\[?\d+\]?$/.test(childStr);

      if (isCitationBadge) {
        const cleanNumber = childStr.replace(/[[\]]/g, '');
        return (
          <a
            href={href}
            title={props.title || (href ? `Abrir fonte [${cleanNumber}]: ${href}` : `Fonte ${cleanNumber}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 mx-0.5 text-[10.5px] font-bold rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-500/30 transition-all no-underline align-baseline cursor-pointer shadow-xs hover:border-blue-500/50"
            {...props}
          >
            {cleanNumber}
          </a>
        );
      }

      return (
        <a
          href={href}
          {...props}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline font-medium"
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className="font-inter text-sm markdown-content text-foreground">
      <ReactMarkdown
        components={components}
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default React.memo(MarkdownRenderer);