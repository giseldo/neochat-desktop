import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'pt-BR',
  title: 'NeoChat Desktop',
  description: 'Documentação Arquitetural e de Engenharia do NeoChat Desktop',
  cleanUrls: true,
  themeConfig: {
    siteTitle: 'NeoChat Architecture',
    nav: [
      { text: 'Visão Geral', link: '/guide/overview' },
      { text: 'Arquitetura', link: '/guide/main-process' },
      { text: 'Multi-Provider', link: '/guide/llm-engine' },
      { text: 'MCP & Tools', link: '/guide/mcp' },
      { text: 'RAG Local', link: '/guide/rag' },
      {
        text: 'v1.3.0',
        items: [
          { text: 'Releases & Downloads', link: 'https://github.com/giseldo/neochat-releases' },
          { text: 'Repositório GitHub', link: 'https://github.com/giseldo/neochat-desktop' }
        ]
      }
    ],
    sidebar: [
      {
        text: '🚀 Introdução',
        items: [
          { text: 'Visão Geral e Filosofia', link: '/guide/overview' },
          { text: 'Stack Tecnológica', link: '/guide/tech-stack' }
        ]
      },
      {
        text: '⚙️ Arquitetura do Sistema',
        items: [
          { text: 'Processo Principal (Electron Main)', link: '/guide/main-process' },
          { text: 'Ponte IPC & Modelo de Segurança', link: '/guide/ipc-security' },
          { text: 'Frontend & UI (React 19)', link: '/guide/renderer' }
        ]
      },
      {
        text: '🧠 IA & Processamento',
        items: [
          { text: 'Motor Multi-Provider & Streaming', link: '/guide/llm-engine' },
          { text: 'Model Context Protocol (MCP)', link: '/guide/mcp' },
          { text: 'RAG Local & Base Vetorial', link: '/guide/rag' }
        ]
      },
      {
        text: '🛠️ Recursos Avançados',
        items: [
          { text: 'Workflows, Canvas & Scheduler', link: '/guide/workflows-canvas' },
          { text: 'Observabilidade & Métricas', link: '/guide/observability' }
        ]
      },
      {
        text: '📦 Engenharia & Deploy',
        items: [
          { text: 'Build, Empacotamento & CI/CD', link: '/guide/build-dist' },
          { text: 'Guia de Contribuição', link: '/guide/contributing' }
        ]
      }
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Buscar na documentação...',
                buttonAriaLabel: 'Buscar na documentação'
              },
              modal: {
                noResultsText: 'Nenhum resultado encontrado para',
                resetButtonTitle: 'Limpar busca',
                footer: {
                  selectText: 'para selecionar',
                  navigateText: 'para navegar',
                  closeText: 'para fechar'
                }
              }
            }
          }
        }
      }
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/giseldo/neochat-desktop' }
    ],
    footer: {
      message: 'NeoChat Desktop — Documentação Arquitetural e de Engenharia',
      copyright: 'Copyright © 2026 NeoChat Desktop Team'
    }
  }
});
