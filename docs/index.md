---
layout: home

hero:
  name: "NeoChat"
  text: "Ecossistema Universal de IA (Desktop & Web)"
  tagline: "Documentação técnica da plataforma de IA universal, combinando o poder local do NeoChat Desktop (Electron 37, Ollama, MCP, RAG offline) e a ubiquidade do NeoChat Web (Next.js 15, Vercel, Neon DB, BYOK)."
  actions:
    - theme: brand
      text: 🚀 Explorar Arquitetura Web & Cloud
      link: /guide/web-architecture
    - theme: alt
      text: 💻 Arquitetura Desktop & MCP
      link: /guide/overview
    - theme: alt
      text: 🌐 Acessar NeoChat Web
      link: https://neochatweb.vercel.app

features:
  - icon: 🌐
    title: NeoChat Web (Cloud & BYOK)
    details: Acesso instantâneo via navegador sem instalação, modelo BYOK com envio seguro de credenciais, streaming via Vercel Edge e persistência no Neon PostgreSQL com Drizzle ORM.
  - icon: 💻
    title: NeoChat Desktop (Local-First)
    details: Execução 100% offline com Ollama e LM Studio, RAG local sem envio de arquivos para a nuvem, chaves seguras no SafeStorage do SO e atalhos globais de captura.
  - icon: 🔌
    title: Model Context Protocol (MCP)
    details: Integração nativa com a especificação aberta MCP da Anthropic, orquestrando servidores locais (stdio) e remotos (SSE) com scripts multiplataforma.
  - icon: 📚
    title: RAG Local & Busca Vetorial
    details: Base de conhecimento offline com parsing de PDF, DOCX, XLSX e Markdown, chunking semântico e busca por similaridade de cossenos.
  - icon: ⚡
    title: Frontend Moderno em React 19
    details: Renderização de alta performance com suporte a KaTeX (matemática), realce de sintaxe, Canvas com Monaco Editor, TTS e chat branching.
  - icon: 🛡️
    title: Segurança & Zero-Trust
    details: Isolamento de contexto no Electron, credenciais protegidas via safeStorage (Keychain/DPAPI) e isolamento BYOK seguro na Web.
---

<div class="tip custom-block" style="margin-top: 2rem;">
  <p class="custom-block-title">💡 Sobre o Ecossistema NeoChat</p>
  <p>
    Esta documentação foi projetada para engenheiros de software, arquitetos e contribuidores que desejam entender a arquitetura dual: <b>NeoChat Web</b> (hospedado na Vercel com Neon DB) e <b>NeoChat Desktop</b> (aplicativo Electron para desenvolvedores e pesquisadores).
  </p>
</div>
