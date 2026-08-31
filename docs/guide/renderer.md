# Frontend & Interface do Usuário (React 19)

O processo de renderização do NeoChat Desktop foi projetado para oferecer uma experiência de usuário rica, fluida e com resposta instantânea, aproveitando as inovações de concorrência do **React 19** e o design responsivo do **Tailwind CSS**.

---

## 🧱 Arquitetura de Componentes

A interface é modular e organizada hierarquicamente:

```
src/renderer/
├── main.jsx                       # Ponto de montagem React DOM (React 19 createRoot)
├── App.jsx                        # Roteador de Modos, Gerenciamento de Estado Central
├── components/
│   ├── Agent/
│   │   ├── TrajectoryView.jsx     # Painel principal de execução autônoma do agente
│   │   ├── TrajectoryTimeline.jsx # Linha do tempo visual de passos e raciocínio
│   │   ├── TrajectoryLedger.jsx   # Histórico de auditoria, diffs e chamadas
│   │   └── ToolApprovalModal.jsx  # Modal interativo de permissão e consentimento
│   ├── Chat/
│   │   ├── MessageList.jsx        # Feed de mensagens com scroll virtualizado
│   │   ├── Message.jsx            # Balão de mensagem com renderização de Markdown e Math
│   │   ├── ChatInput.jsx          # Input com atalhos (/slash), upload e seletor de modelos
│   │   ├── ToolCall.jsx           # Card interativo de execução de ferramentas
│   │   └── SlashCommandsPopover.jsx# Menu dinâmico de slash commands (/canvas, /agent, etc.)
│   ├── Canvas/
│   │   ├── CanvasPanel.jsx        # Painel expansível do Monaco Editor com syntax highlighting
│   │   ├── CanvasCard.jsx         # Card retrátil com live preview (HTML/SVG/Markdown)
│   │   └── ArtifactsPanel.jsx     # Gestão e alternância de múltiplos artefatos
│   ├── Projects & Knowledge/
│   │   ├── ProjectModal.jsx       # Criação e configuração de workspaces
│   │   ├── MoveToProjectModal.jsx # Atribuição de conversas a projetos
│   │   ├── KnowledgeBaseModal.jsx # Gerenciamento de fontes RAG do projeto
│   │   └── KnowledgeSourcesList.jsx# Lista de arquivos indexados e status
│   ├── Modals & Tools/
│   │   ├── ToolsPanel.jsx         # Catálogo de ferramentas ativas e toggles
│   │   ├── McpCatalogModal.jsx    # Descoberta e instalação de servidores MCP
│   │   ├── CompareChatView.jsx    # Visualização e comparação lado a lado de modelos
│   │   ├── ConversationStats.jsx  # Métricas de tokens, latência e custos
│   │   ├── PromptTemplatesModal.jsx# Biblioteca de prompts reutilizáveis
│   │   └── SnipModal.jsx          # Captura e recorte de tela para modelos de visão
│   └── Sidebar/
│       ├── ChatHistorySidebar.jsx # Histórico de conversas com busca, tags e projetos
│       └── PersonaSelector.jsx    # Seletor dinâmico de personas e modos de IA
└── context/
    ├── ChatContext.jsx            # Estado das mensagens, streaming e branching
    ├── ProjectContext.jsx         # Workspace ativo, regras e fontes de RAG
    ├── CanvasContext.jsx          # Documentos e seleção do Monaco Editor
    ├── ThemeContext.jsx           # Alternância Dark/Light e persistência
    └── LanguageContext.jsx        # Internacionalização (i18n) pt-BR / en-US
```

---

## 📐 Pipeline de Renderização de Markdown & Fórmulas

O NeoChat possui um pipeline completo de transformação de texto em elementos visuais ricos:

```
[Texto Cru do LLM]
        │
        ▼
<ReactMarkdown>
  ├── remarkPlugins: [remarkGfm, remarkMath]
  └── rehypePlugins: [rehypeKatex]
        │
        ├── 🔹 Tabelas e Checklists (GitHub Flavored Markdown)
        ├── 🔹 Fórmulas Matemáticas em KaTeX ($E = mc^2$)
        ├── 🔹 Blocos de Código com ReactSyntaxHighlighter (Temas VS Code Dark/Light)
        └── 🔹 Ações Rápidas: Botão de Cópia, Download de Trecho e Envio para o Canvas
```

---

## 💡 Extração & Renderização de Raciocínio (`<think>`)

Modelos como **DeepSeek R1**, **QwQ** e variantes de raciocínio emitem tags especiais de reflexão interna. O NeoChat trata esses dados de forma elegante:

1. O `chatHandler.js` identifica o fluxo de pensamento em tempo real.
2. Emite eventos dedicados `chat-think-chunk`.
3. O componente `ReasoningBlock.jsx` renderiza um bloco retrátil com animação de pulso e cronômetro de tempo de pensamento:

```jsx
// Renderização do Bloco de Raciocínio
<div className="border-l-2 border-indigo-500/50 bg-indigo-50/5 dark:bg-indigo-950/20 p-3 rounded-r-lg mb-3">
  <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
    <BrainIcon className="w-3.5 h-3.5 animate-pulse" />
    <span>Processo de Raciocínio ({thinkingDuration}s)</span>
    <ChevronDownIcon className={clsx("w-3 h-3 transition-transform", expanded && "rotate-180")} />
  </button>
  {expanded && (
    <div className="mt-2 text-xs text-zinc-400 font-mono whitespace-pre-wrap">
      {thoughtContent}
    </div>
  )}
</div>
```

---

## 🌿 Chat Branching (Árvore de Conversas)

Diferente de chats lineares convencionais, o NeoChat suporta **bifurcação de diálogos**:
- O usuário pode editar qualquer mensagem anterior no histórico.
- O sistema cria um novo nó filho na árvore de conversa sem sobrescrever a ramificação original.
- Navegadores de versão `< 1 / 3 >` permitem alternar entre diferentes linhas temporais da mesma conversa.
