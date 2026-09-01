---
layout: home

hero:
  name: "NeoChat"
  text: "Ecossistema Universal de IA & Agentes Autônomos"
  tagline: "Documentação técnica completa: Neo Agent Runtime com harnesses Neo Native e Pi, segurança compartilhada e checkpoints de rollback; NeoChat Desktop local-first (Electron 39, MCP e RAG offline); e NeoChat Web (Next.js 15, Vercel e Neon DB)."
  actions:
    - theme: brand
      text: 🤖 Neo Agent Runtime
      link: /guide/agent-runtime
    - theme: alt
      text: 💻 Arquitetura Desktop & Sistema
      link: /guide/overview
    - theme: alt
      text: 🌐 Arquitetura Web & Cloud
      link: /guide/web-architecture

features:
  - icon: 🤖
    title: Neo Agent Runtime
    details: Runtime autônomo multi-turnos com seleção entre Neo Native e Pi, barramento tipado de eventos, motor de permissões compartilhado e rollback transacional via checkpoints.
  - icon: 📊
    title: Trajectory Ledger & Auditoria
    details: Visualização em tempo real de cada passo de raciocínio, chamadas de ferramentas nativas e MCP, inspeção de diffs de código e timeline gráfica interativa.
  - icon: 🔌
    title: MCP Unificado & Ferramentas Nativas
    details: Catálogo integrado com execução segura no filesystem, Git local, terminal persistente, busca web em tempo real (Bing/Tavily/Brave) e servidores MCP via stdio, SSE e OAuth 2.0.
  - icon: 💻
    title: NeoChat Desktop (Local-First)
    details: Execução 100% offline com Ollama e LM Studio, RAG local sem envio de arquivos para a nuvem, chaves protegidas no SafeStorage (DPAPI/Keychain) e atalho global de captura.
  - icon: 🎨
    title: Canvas & Monaco Editor
    details: Espaço de trabalho lateral integrado com o editor de código do VS Code, syntax highlighting multi-linguagem, renderização ao vivo (HTML/SVG/Markdown) e síntese de voz (TTS).
  - icon: 🌐
    title: NeoChat Web (Cloud & BYOK)
    details: Acesso instantâneo via navegador sem instalação, modelo BYOK com envio seguro de credenciais, streaming via Vercel Edge e persistência no Neon PostgreSQL com Drizzle ORM.
---

<div class="tip custom-block" style="margin-top: 2rem;">
  <p class="custom-block-title">💡 Sobre o Ecossistema NeoChat</p>
  <p>
    Esta documentação foi projetada para engenheiros de software, arquitetos e contribuidores que desejam entender a arquitetura dual: <b>Neo Agent Runtime & Desktop</b> (aplicativo Electron para desenvolvedores, agentes autônomos e pesquisadores) e <b>NeoChat Web</b> (hospedado na Vercel com Neon DB).
  </p>
</div>
