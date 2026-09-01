/**
 * Welcome Screen Content: Greetings, Application Tips, AI Humor & Quick Prompts
 * Inspired by Claude's thoughtful and witty welcome experience.
 */

export const GREETINGS = {
  pt: [
    "Vamos matutar",
    "No que você está pensando?",
    "O que vamos explorar hoje?",
    "Pronto para criar algo incrível?",
    "Vamos desenrolar essa ideia?",
    "Hora de filosofar com silício",
    "Café na mão, prompt na mente",
    "Em que posso te surpreender hoje?",
    "Qual é a missão de hoje?",
    "Vamos colocar as ideias no papel?",
    "Bora simplificar o complexo?",
    "Ideias brilhantes começam aqui",
    "Desafio aceito. O que faremos?",
    "Mente afiada, modelo pronto",
    "O que sua imaginação está tramando?",
    "Criatividade em 100%. O que manda?",
    "Pronto para hackear a produtividade?",
    "Um bom prompt resolve qualquer dilema",
    "Transformando café em raciocínio",
    "Pausa estratégica para matutar",
    "Foco total: por onde começamos?",
    "Que código ou ideia vamos lapidar?"
  ],
  en: [
    "Let's brainstorm",
    "What's on your mind?",
    "What shall we explore today?",
    "Ready to build something great?",
    "Let's untangle that idea",
    "Time to think with silicon",
    "Coffee ready, prompt set",
    "How can I help you today?",
    "What is today's mission?",
    "Let's turn ideas into reality",
    "Making the complex simple",
    "Bright ideas start here",
    "Challenge accepted. What's next?",
    "Sharp mind, model ready",
    "What is your imagination crafting?",
    "100% creative juice. What's up?",
    "Ready to boost productivity?",
    "A great prompt solves any dilemma",
    "Turning coffee into intelligence",
    "Strategic pause to ponder"
  ]
};

export const TIPS_AND_HUMOR = [
  // --- Funcionalidades e Atalhos do App ---
  {
    id: "voice_shortcut",
    type: "shortcut",
    badge: { pt: "Atalho Rápido", en: "Quick Shortcut" },
    icon: "Mic",
    text: {
      pt: "Segure Ctrl+Alt para ditar sua mensagem por voz e solte para transcrever instantaneamente com Whisper.",
      en: "Hold Ctrl+Alt to speak and dictate your message with Whisper, release to transcribe instantly."
    }
  },
  {
    id: "snip_and_ask",
    type: "feature",
    badge: { pt: "Dica de Uso", en: "Feature Tip" },
    icon: "Camera",
    text: {
      pt: "Use o botão 'Capturar Tela' (Snip & Ask) para recortar uma janela ou área da tela e perguntar diretamente sobre ela.",
      en: "Use 'Capture Screen' (Snip & Ask) to crop any window or screen area and ask questions about it directly."
    }
  },
  {
    id: "agent_mode",
    type: "feature",
    badge: { pt: "Modo Agente", en: "Agent Mode" },
    icon: "Bot",
    text: {
      pt: "Ative o Modo Agente na barra inferior para deixar a IA planejar, raciocinar e executar ferramentas autonomamente em loop.",
      en: "Enable Agent Mode in the bottom bar to let AI plan, reason, and invoke tools autonomously in a loop."
    }
  },
  {
    id: "compare_models",
    type: "feature",
    badge: { pt: "Comparação", en: "Comparison" },
    icon: "Scale",
    text: {
      pt: "Clique em 'Comparar Modelos' no topo para ver duas IAs diferentes respondendo ao mesmo tempo lado a lado.",
      en: "Click 'Compare Models' at the top to watch two different AI models respond side-by-side to the same prompt."
    }
  },
  {
    id: "mcp_store",
    type: "feature",
    badge: { pt: "Loja MCP", en: "MCP Store" },
    icon: "Sparkles",
    text: {
      pt: "Conecte ferramentas externas como GitHub, SQLite, PostgreSQL, Fetch e filesystem na Loja MCP.",
      en: "Connect external tools like GitHub, SQLite, PostgreSQL, Fetch, and filesystem via the MCP Store."
    }
  },
  {
    id: "global_popup",
    type: "shortcut",
    badge: { pt: "Atalho Global", en: "Global Shortcut" },
    icon: "Zap",
    text: {
      pt: "Pressione Ctrl+G (ou Cmd+G) de qualquer aplicativo no seu computador para invocar a janela rápida do NeoChat.",
      en: "Press Ctrl+G (or Cmd+G) from any application on your OS to summon NeoChat's quick popup window."
    }
  },
  {
    id: "slash_commands",
    type: "shortcut",
    badge: { pt: "Comandos Rápidos", en: "Quick Commands" },
    icon: "Terminal",
    text: {
      pt: "Digite '/' no campo de texto para acessar templates prontos para código, redação, resumos e tradução.",
      en: "Type '/' in the input box to access ready-to-use prompt templates for code, writing, summaries, and translation."
    }
  },
  {
    id: "knowledge_base",
    type: "feature",
    badge: { pt: "Base de Conhecimento", en: "Knowledge Base" },
    icon: "FolderKanban",
    text: {
      pt: "Associe pastas locais a projetos para que o assistente consulte seus arquivos e código como fonte de verdade (RAG local).",
      en: "Attach local folders to projects so the assistant can search and reference your files as ground truth (local RAG)."
    }
  },
  {
    id: "interactive_artifacts",
    type: "feature",
    badge: { pt: "Artefatos Vivos", en: "Live Artifacts" },
    icon: "FileCode",
    text: {
      pt: "Peça código HTML, React, SVG ou Markdown para visualizar o resultado renderizado em tempo real no painel de Artefatos.",
      en: "Ask for HTML, React, SVG, or Markdown code to preview live rendered components in the Artifacts side panel."
    }
  },
  {
    id: "thinking_models",
    type: "feature",
    badge: { pt: "Raciocínio Profundo", en: "Deep Reasoning" },
    icon: "Sparkles",
    text: {
      pt: "Modelos com raciocínio (como DeepSeek R1 e QwQ) mostram o processo de reflexão interno antes de entregar a resposta.",
      en: "Reasoning models (like DeepSeek R1 and QwQ) display their internal train of thought before producing final answers."
    }
  },
  {
    id: "web_search",
    type: "feature",
    badge: { pt: "Busca em Tempo Real", en: "Real-time Search" },
    icon: "Globe",
    text: {
      pt: "Ative o botão 'Busca Web' para que o assistente consulte as últimas notícias e artigos atualizados da internet.",
      en: "Turn on 'Web Search' so the assistant fetches the latest news, documentation, and live web information."
    }
  },
  {
    id: "workflows_automation",
    type: "feature",
    badge: { pt: "Automação", en: "Automation" },
    icon: "Zap",
    text: {
      pt: "Use o botão 'Workflows' no cabeçalho para criar sequências de tarefas automatizadas e prompts reutilizáveis.",
      en: "Use 'Workflows' in the top header to chain automated tasks and run reusable multi-step prompts."
    }
  },
  {
    id: "export_chats",
    type: "feature",
    badge: { pt: "Exportação", en: "Export" },
    icon: "FolderKanban",
    text: {
      pt: "Exporte conversas inteiras em Markdown (.md), HTML estilizado ou JSON no menu de opções de cada chat na barra lateral.",
      en: "Export entire conversations to clean Markdown (.md), styled HTML, or JSON from the chat options menu in the sidebar."
    }
  },

  // --- Humor & Curiosidades Tech ---
  {
    id: "humor_survival",
    type: "humor",
    badge: { pt: "Dica de Sobrevivência", en: "Survival Tip" },
    icon: "Coffee",
    text: {
      pt: "IAs não julgam se você pedir para explicar o mesmo conceito de programação pela décima vez hoje.",
      en: "AIs won't judge you for asking to explain the exact same programming concept for the tenth time today."
    }
  },
  {
    id: "humor_rubber_duck",
    type: "humor",
    badge: { pt: "Fato Comprovado", en: "Proven Fact" },
    icon: "Bot",
    text: {
      pt: "9 entre 10 bugs somem misteriosamente no instante exato em que você começa a explicar o problema para a IA.",
      en: "9 out of 10 bugs mysteriously vanish the exact moment you start explaining the problem to the AI."
    }
  },
  {
    id: "humor_magic",
    type: "humor",
    badge: { pt: "Magia Moderna", en: "Modern Sorcery" },
    icon: "Sparkles",
    text: {
      pt: "Antigamente se usavam poções e pergaminhos. Hoje você só digita em linguagem natural com temperatura 0.7.",
      en: "In the old days they used potions and scrolls. Nowadays you just type natural language with temperature 0.7."
    }
  },
  {
    id: "humor_first_try",
    type: "humor",
    badge: { pt: "Regra de Ouro", en: "Golden Rule" },
    icon: "Terminal",
    text: {
      pt: "Se o seu código rodou de primeira sem nenhum erro... desconfie imediatamente. Algo muito estranho está acontecendo.",
      en: "If your code compiled and ran on the first try with zero errors... be suspicious. Something weird is going on."
    }
  },
  {
    id: "humor_coffee",
    type: "humor",
    badge: { pt: "Combustível Dev", en: "Dev Fuel" },
    icon: "Coffee",
    text: {
      pt: "Um bom café e um prompt bem escrito movem montanhas (ou pelo menos evitam horas de refatoração no final de semana).",
      en: "A strong coffee and a well-crafted prompt move mountains (or at least save your weekend from refactoring)."
    }
  },
  {
    id: "humor_no_grudge",
    type: "humor",
    badge: { pt: "Paz de Espírito", en: "Peace of Mind" },
    icon: "Smile",
    text: {
      pt: "Fique tranquilo: eu não guardo rancor de todas as vezes em que você clicou no botão 'Parar Geração' no meio da frase.",
      en: "Rest assured: I hold no grudge for all the times you clicked 'Stop Generation' mid-sentence."
    }
  },
  {
    id: "humor_line_42",
    type: "humor",
    badge: { pt: "Sabedoria do Prompt", en: "Prompt Wisdom" },
    icon: "Zap",
    text: {
      pt: "'Arrume meu código' gera orações. Mas 'Veja a linha 42 e trate o caso de borda' gera milagres em segundos.",
      en: "'Fix my code' yields prayers. But 'Check line 42 and handle the edge case' yields miracles in seconds."
    }
  },
  {
    id: "humor_safe_electrons",
    type: "humor",
    badge: { pt: "Selo de Garantia", en: "Quality Seal" },
    icon: "ShieldCheck",
    text: {
      pt: "Garantia de segurança: nenhum elétron ou neurônio biológico foi ferido durante a inicialização desta tela.",
      en: "Safety guarantee: no electrons or biological neurons were harmed during the initialization of this screen."
    }
  },
  {
    id: "humor_virtual_brain",
    type: "humor",
    badge: { pt: "Status do Sistema", en: "System Status" },
    icon: "Cpu",
    text: {
      pt: "Baterias carregadas, bilhões de parâmetros alinhados e transistores a postos. Qual é a boa de hoje?",
      en: "Batteries charged, billions of parameters aligned, and transistors ready. What are we building today?"
    }
  },
  {
    id: "humor_console_log",
    type: "humor",
    badge: { pt: "Dica Secreta", en: "Secret Tip" },
    icon: "Terminal",
    text: {
      pt: "Às vezes a resposta que você tanto procura estava escondida naquele console.log esquecido da semana passada.",
      en: "Sometimes the answer you seek was hiding in that forgotten console.log left behind last week."
    }
  }
];

export const SUGGESTION_PROMPTS = [
  {
    id: "explain",
    icon: "💡",
    label: {
      pt: "Explicar conceito complexo",
      en: "Explain complex concept"
    },
    prompt: {
      pt: "Explique o conceito de [inserir tema aqui] de forma simples, didática e com analogias do dia a dia.",
      en: "Explain the concept of [insert topic here] simply, clearly, and using everyday analogies."
    }
  },
  {
    id: "code_review",
    icon: "💻",
    label: {
      pt: "Analisar e debugar código",
      en: "Analyze & debug code"
    },
    prompt: {
      pt: "Revise o seguinte trecho de código, identifique potenciais bugs, problemas de performance e sugira melhorias:\n\n```\n\n```",
      en: "Review the following code snippet, identify potential bugs or performance bottlenecks, and suggest optimizations:\n\n```\n\n```"
    }
  },
  {
    id: "write_email",
    icon: "✍️",
    label: {
      pt: "Redigir e-mail profissional",
      en: "Draft professional email"
    },
    prompt: {
      pt: "Escreva um e-mail profissional, claro e objetivo para [destinatário] sobre o seguinte assunto: [descrever contexto]",
      en: "Draft a professional, clear, and concise email to [recipient] regarding the following subject: [describe context]"
    }
  },
  {
    id: "action_plan",
    icon: "⚡",
    label: {
      pt: "Criar plano de ação",
      en: "Create step-by-step plan"
    },
    prompt: {
      pt: "Crie um plano de ação estruturado passo a passo para atingir o seguinte objetivo: [descrever objetivo]",
      en: "Create a structured step-by-step action plan to accomplish the following goal: [describe goal]"
    }
  },
  {
    id: "web_trends",
    icon: "🌐",
    label: {
      pt: "Pesquisar novidades na web",
      en: "Research web trends"
    },
    prompt: {
      pt: "Pesquise na web e resuma os principais desenvolvimentos e notícias recentes sobre: [tema]",
      en: "Search the web and summarize recent key developments and news regarding: [topic]"
    }
  },
  {
    id: "joke",
    icon: "😄",
    label: {
      pt: "Me conte uma piada",
      en: "Tell me a joke"
    },
    prompt: {
      pt: "Me conte uma piada engraçada e criativa.",
      en: "Tell me a funny and creative joke."
    }
  },
  {
    id: "canva_poetry",
    icon: "🎨",
    label: {
      pt: "Crie uma poesia no Canva sobre a beleza",
      en: "Create a poem on Canva about beauty"
    },
    prompt: {
      pt: "Crie uma poesia sobre a beleza com sugestões visuais de formatação e tipografia para um design no Canva.",
      en: "Write a poem about beauty with visual layout, typography, and design suggestions for Canva."
    }
  },
  {
    id: "python_hello_world",
    icon: "🐍",
    label: {
      pt: "Crie um olá mundo simples em Python",
      en: "Create a simple hello world in Python"
    },
    prompt: {
      pt: "Crie um Olá Mundo simples em Python e explique brevemente como executá-lo.",
      en: "Create a simple Hello World in Python and briefly explain how to run it."
    }
  }
];

/**
 * Returns a random greeting for the given language.
 */
export function getRandomGreeting(lang = "pt") {
  const list = GREETINGS[lang] || GREETINGS.pt;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

/**
 * Returns a random tip or humorous quote, avoiding the current one if possible.
 */
export function getRandomTip(lang = "pt", currentTipId = null) {
  let available = TIPS_AND_HUMOR;
  if (currentTipId && TIPS_AND_HUMOR.length > 1) {
    available = TIPS_AND_HUMOR.filter(item => item.id !== currentTipId);
  }
  const index = Math.floor(Math.random() * available.length);
  const selected = available[index] || TIPS_AND_HUMOR[0];
  
  return {
    id: selected.id,
    type: selected.type,
    icon: selected.icon,
    badge: selected.badge[lang] || selected.badge.pt,
    text: selected.text[lang] || selected.text.pt
  };
}
