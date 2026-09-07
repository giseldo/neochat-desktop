export const ACADEMIC_TEMPLATES = [
  {
    id: 'article',
    label: 'Artigo científico',
    description: 'Estrutura IMRaD com resumo e referências',
    title: 'Novo Artigo Científico',
    content: String.raw`\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[brazil]{babel}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}

\title{Título do artigo}
\author{Nome do autor}
\date{\today}

\begin{document}
\maketitle

\begin{abstract}
Apresente objetivo, método, resultados e conclusão.
\end{abstract}

\textbf{Palavras-chave:} palavra-chave 1; palavra-chave 2; palavra-chave 3.

\section{Introdução}
Contextualize o problema, a lacuna e o objetivo da pesquisa.

\section{Referencial teórico}
Apresente os conceitos e trabalhos relacionados.

\section{Metodologia}
Descreva participantes, instrumentos, procedimentos e análise.

\section{Resultados}
Apresente os resultados com tabelas, figuras e medidas adequadas.

\section{Discussão}
Interprete os achados à luz da literatura.

\section{Conclusão}
Sintetize contribuições, limitações e trabalhos futuros.

\bibliographystyle{plain}
\bibliography{referencias}
\end{document}
`
  },
  {
    id: 'thesis',
    label: 'Tese ou dissertação',
    description: 'Capítulos acadêmicos e elementos pré-textuais',
    title: 'Nova Tese ou Dissertação',
    content: String.raw`\documentclass[12pt,a4paper,oneside]{report}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[brazil]{babel}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}

\title{Título da pesquisa}
\author{Nome do autor}
\date{\today}

\begin{document}
\maketitle

\begin{abstract}
Resumo da pesquisa.
\end{abstract}

\tableofcontents

\chapter{Introdução}
Apresente contexto, problema, objetivos, justificativa e organização do trabalho.

\chapter{Fundamentação teórica}
Desenvolva os conceitos centrais da pesquisa.

\chapter{Trabalhos relacionados}
Compare criticamente os estudos relacionados.

\chapter{Metodologia}
Descreva o desenho da pesquisa e os procedimentos de análise.

\chapter{Resultados e discussão}
Apresente e discuta as evidências produzidas.

\chapter{Considerações finais}
Sintetize contribuições, limitações e trabalhos futuros.

\bibliographystyle{plain}
\bibliography{referencias}
\end{document}
`
  },
  {
    id: 'report',
    label: 'Relatório acadêmico',
    description: 'Documento curto para ensino ou pesquisa',
    title: 'Novo Relatório Acadêmico',
    content: String.raw`\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[brazil]{babel}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}

\title{Título do relatório}
\author{Nome do autor}
\date{\today}

\begin{document}
\maketitle

\section{Objetivo}
Informe o propósito do relatório.

\section{Atividades desenvolvidas}
Descreva as atividades realizadas.

\section{Resultados}
Apresente os resultados e as evidências.

\section{Dificuldades e limitações}
Registre os obstáculos encontrados.

\section{Conclusão}
Sintetize o trabalho e indique os próximos passos.

\end{document}
`
  }
];

export const ACADEMIC_AI_ACTIONS = [
  { id: 'academic-style', label: 'Escrita científica', desc: 'Aprimorar precisão, coesão e impessoalidade', prompt: 'Revisar em linguagem científica, preservando o significado, melhorando precisão conceitual, coesão e clareza, sem inventar resultados ou referências' },
  { id: 'structure', label: 'Revisar estrutura', desc: 'Avaliar organização e encadeamento das seções', prompt: 'Revisar a estrutura acadêmica e o encadeamento argumentativo; reorganize apenas quando necessário e explique as mudanças no resumo da versão' },
  { id: 'abstract', label: 'Gerar resumo', desc: 'Criar resumo estruturado a partir do texto', prompt: 'Gerar ou revisar o resumo contendo objetivo, metodologia, principais resultados e conclusão, sem acrescentar informações ausentes' },
  { id: 'citations', label: 'Verificar citações', desc: 'Sinalizar afirmações que precisam de fonte', prompt: 'Identificar afirmações que precisam de citação e inserir marcadores TODO-CITACAO; não invente autores, obras, DOI ou referências' }
];

export function latexToPreviewMarkdown(source = '') {
  return String(source)
    .replace(/^[ \t]*%.*$/gm, '')
    .replace(/\\(?:documentclass|usepackage)(?:\[[^\]]*\])?\{[^}]*\}/g, '')
    .replace(/\\begin\{document\}|\\end\{document\}/g, '')
    .replace(/\\maketitle|\\tableofcontents/g, '')
    .replace(/\\title\{([^}]*)\}/g, '# $1')
    .replace(/\\author\{([^}]*)\}/g, '**Autor:** $1')
    .replace(/\\date\{([^}]*)\}/g, '**Data:** $1')
    .replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, '## Resumo\n\n$1')
    .replace(/\\(?:chapter|section)\*?\{([^}]*)\}/g, '\n## $1\n')
    .replace(/\\subsection\*?\{([^}]*)\}/g, '\n### $1\n')
    .replace(/\\subsubsection\*?\{([^}]*)\}/g, '\n#### $1\n')
    .replace(/\\textbf\{([^}]*)\}/g, '**$1**')
    .replace(/\\textit\{([^}]*)\}/g, '*$1*')
    .replace(/\\emph\{([^}]*)\}/g, '*$1*')
    .replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '[$2]($1)')
    .replace(/\\(?:bibliographystyle|bibliography)\{[^}]*\}/g, '')
    .replace(/\\today/g, 'Hoje')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
