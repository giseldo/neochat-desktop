---
layout: home

hero:
  name: "NeoChat Desktop"
  text: "Arquitetura & Engenharia"
  tagline: "Documentação técnica aprofundada do ecossistema desktop de IA universal, local-first, construído com Electron 37, React 19 e Model Context Protocol (MCP)."
  actions:
    - theme: brand
      text: 🚀 Explorar Arquitetura
      link: /guide/overview
    - theme: alt
      text: 🧩 Model Context Protocol
      link: /guide/mcp
    - theme: alt
      text: 📦 Repositório GitHub
      link: https://github.com/giseldo/neochat-desktop

features:
  - icon: 🌐
    title: Multi-Provider Universal
    details: Suporte unificado para Groq, OpenAI, Anthropic, DeepSeek, Google Gemini, Ollama, LM Studio, Mistral e endpoints customizados com streaming em tempo real e fallback resiliente.
  - icon: 🔌
    title: Model Context Protocol (MCP)
    details: Integração nativa com a especificação aberta MCP da Anthropic, orquestrando servidores locais (stdio) e remotos (SSE) com scripts multiplataforma.
  - icon: 📚
    title: RAG Local & Busca Vetorial
    details: Base de conhecimento 100% offline com parsing de PDF, DOCX, XLSX e Markdown, chunking semântico e busca por similaridade de cossenos.
  - icon: 🛡️
    title: Segurança & Zero-Trust Local
    details: Isolamento rigoroso de contexto (Preload Bridge), credenciais protegidas via safeStorage (Keychain/DPAPI) e sandbox para execução de ferramentas.
  - icon: ⚡
    title: Frontend Moderno em React 19
    details: Renderização de alta performance com suporte a KaTeX (matemática), realce de sintaxe, Canvas com Monaco Editor, TTS e chat branching.
  - icon: ⏱️
    title: Automações, Workflows & Scheduler
    details: Orquestrador de tarefas em segundo plano com agendamento estilo cron, pipelines encadeados de prompts e telemetria de consumo de tokens.
---

<div class="tip custom-block" style="margin-top: 2rem;">
  <p class="custom-block-title">💡 Sobre esta Documentação</p>
  <p>
    Esta documentação foi projetada para engenheiros de software, arquitetos e contribuidores que desejam entender os detalhes internos de implementação, padrões de comunicação IPC, segurança e fluxo de dados do <b>NeoChat Desktop</b>.
  </p>
</div>
