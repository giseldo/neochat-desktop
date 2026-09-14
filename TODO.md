# 📋 NeoChat Desktop — Matriz de Funcionalidades & TODO / Roadmap

> **Versão Atual**: `0.0.4`  
> **Última Atualização**: 13 de Setembro de 2026  
> **Status Geral**: Estável em Produção / Desenvolvimento Ativo  
> **Arquitetura**: Electron + React 19 + Node.js (CommonJS no backend / ESM no frontend)

---

## 🧭 Legenda de Status

- [x] **Concluído**: Funcionalidade totalmente implementada, integrada à interface e com testes de validação.
- [/] **Parcialmente Implementado / Em Refinamento**: Funcionalidade funcional, mas com melhorias em andamento ou dependente de configurações adicionais.
- [ ] **Pendente / Backlog Planejado**: Funcionalidade mapeada no roadmap, planejada para próximas versões.

---

## 1. 🤖 Modelos de IA, Provedores & Roteamento Universal

- [x] **Suporte Universal a Provedores Remotos**:
  - [x] Groq (LPU ultra-rápido: Llama 3.3, Qwen 2.5, DeepSeek R1 Distill)
  - [x] OpenAI (GPT-4o, GPT-4o-mini, o1, o3-mini, GPT-4.5)
  - [x] Anthropic / Claude (Claude 3.7 Sonnet com raciocínio híbrido e Claude 3.5 Sonnet)
  - [x] Google Gemini (Gemini 2.5 Pro/Flash, Gemini 2.0 Flash via OpenAI-compatible endpoint)
  - [x] DeepSeek (DeepSeek-V3 e DeepSeek-R1 oficial)
  - [x] Perplexity AI (Sonar, Sonar Pro, Sonar Reasoning com busca em tempo real)
  - [x] OpenRouter (Roteamento para centenas de modelos com chave única)
  - [x] Together AI (Llama, Qwen, DeepSeek, Flux)
  - [x] SambaNova Cloud (DeepSeek R1 671B Full Precision, Llama 3.3 70B)
  - [x] DeepInfra (Infraestrutura de inferência econômica)
  - [x] Cohere (Command R+, Command R e modelos de RAG)
- [x] **Modelos Locais com Zero Custo e 100% Privacidade**:
  - [x] Ollama (detecção automática em `http://localhost:11434/v1`)
  - [x] LM Studio (detecção automática em `http://localhost:1234/v1`)
  - [x] vLLM / LocalAI / Endpoints personalizados compatíveis com OpenAI API
  - [x] Detecção de status de serviços de IA locais com um clique nas configurações
- [x] **Fallback Inteligente de Provedores (Failover)**:
  - [x] Failover automático e sequencial configurável quando a API principal apresentar indisponibilidade, erro 5xx ou limite de taxa (rate-limit / 429)
  - [x] Mapeamento de modelos equivalentes entre provedores durante o fallback
- [x] **Configuração Fina de Parâmetros de Inferência**:
  - [x] Ajuste de Temperatura (`temperature`)
  - [x] Top-P Sampling (`top_p`)
  - [x] Nível de Esforço de Raciocínio (`reasoning_effort`: low, medium, high)
  - [x] Poda Automática de Contexto (`autoPrune`) para prevenir estouro de janela
  - [x] Prompt de Sistema Global customizável por usuário

---

## 2. ⚡ Neo Agent Runtime & Autonomia de Código

- [x] **Loop do Agente Autônomo (`electron/agent/`)**:
  - [x] Máquina de estados finita formal (`agentLoop.js`)
  - [x] Typed Event Bus com streaming de eventos de pensamento, ação e observação (`eventBus.js`)
  - [x] Suporte a múltiplos harnesses de execução (Harness Nativo Neo Agent e Pi Agent Core `@earendil-works/pi-agent-core`)
  - [x] Roteador dinâmico de modelos para o agente (`modelRouter.js`)
- [x] **Políticas de Segurança e Isolamento**:
  - [x] Política de caminhos e proteção de arquivos confidenciais (`pathPolicy.js`)
  - [x] Política de processos e execução de comandos seguros (`processPolicy.js`)
  - [x] Mecanismo de aprovação granular de chamadas de ferramentas (`permissionEngine.js` e `ToolApprovalModal.jsx`)
- [x] **Recuperação, Memória & Checkpoints**:
  - [x] Sistema de checkpoints de arquivos com funcionalidade de rollback/undo (`checkpoints.js`)
  - [x] Gerenciador de compactação de contexto por linha d'água (`compactionManager.js`)
  - [x] Ledger de auditoria e linha do tempo de trajetórias de raciocínio (`TrajectoryLedger.jsx`, `TrajectoryTimeline.jsx`, `TrajectoryView.jsx`)

---

## 3. 🛠️ Catálogo de Ferramentas Nativas & Ecossistema MCP

- [x] **Ferramentas Nativas Embutidas**:
  - [x] Leitura, escrita, edição e diff de arquivos no workspace
  - [x] Execução de comandos no shell do sistema com streaming de saída
  - [x] Inspeção e listagem de diretórios
  - [x] Gerenciador de tarefas em background (lançar, inspecionar logs, interromper tarefas)
  - [x] Navegação web e extração de conteúdo
  - [x] Code Runner / Interpretador de código sandboxed (JavaScript / Python)
- [x] **Suporte ao Model Context Protocol (MCP)**:
  - [x] Executores locais Stdio multiplataforma:
    - [x] Node.js (`run-node.cmd`, `run-node.ps1`, `run-node.sh`, `run-node-linux.sh`)
    - [x] NPX (`run-npx.cmd`, `run-npx.ps1`, `run-npx.sh`, `run-npx-linux.sh`)
    - [x] Python / UVX (`run-uvx.cmd`, `run-uvx.ps1`, `run-uvx.sh`, `run-uvx-linux.sh`)
    - [x] Deno (`run-deno.cmd`, `run-deno.ps1`, `run-deno.sh`, `run-deno-linux.sh`)
    - [x] Docker (`run-docker.cmd`, `run-docker.ps1`, `run-docker.sh`, `run-docker-linux.sh`)
  - [x] Servidores MCP Remotos (SSE e Streamable HTTP com headers customizados)
  - [x] Catálogo e Hub Comunitário de servidores MCP (`McpCatalogModal.jsx`, `McpHubModal.jsx`)
  - [x] Controle de permissões por ferramenta MCP (Permitir sempre, Confirmar cada vez, Bloquear)

---

## 4. 🖥️ Workspace, Painéis Companheiros & Produtividade

- [x] **Canvas / Espaço de Documentos**:
  - [x] Editor em tempo real de documentos e artefatos de código
  - [x] Cálculo de estatísticas (caracteres, palavras, linhas, tempo de leitura)
  - [x] Edição cirúrgica de trechos de texto com diff de linhas
  - [x] Leitura de trechos do Canvas via Text-to-Speech (TTS)
  - [x] Exportação de documentos para PDF formatado
  - [x] Exportação e geração nativa para arquivos Word (.DOCX)
- [x] **Terminal Embutido Interativo (`TerminalPanel.jsx`)**:
  - [x] Sessões interativas com abas (PowerShell, Bash, CMD)
  - [x] Streaming de entrada/saída em tempo real com renderização ANSI para HTML
  - [x] Limpeza e gerenciamento de processos filhos
- [x] **Navegador Embutido (`BrowserPanel.jsx`)**:
  - [x] Painel de navegação web integrado sem sair do aplicativo
  - [x] Normalização de URLs, barra de pesquisa rápida e controle de histórico
- [x] **Tarefas em Segundo Plano (`BackgroundTasksPanel.jsx`)**:
  - [x] Monitoramento de comandos demorados em background
  - [x] Visualização de logs parciais, código de saída e duração
- [x] **Explorador de Workspace (`WorkspaceExplorerPanel.jsx`, `WorkspaceFileTree.jsx`)**:
  - [x] Navegação visual pela árvore de arquivos do projeto ativo

---

## 5. 📚 Base de Conhecimento Local (RAG) & Grafo Semântico

- [x] **Indexação Multiformato Local**:
  - [x] Extração de texto de PDFs
  - [x] Extração de documentos Word (`.docx`)
  - [x] Extração de planilhas Excel (`.xlsx`)
  - [x] Extração de arquivos Markdown (`.md`) e código-fonte
- [x] **Mecanismo RAG Incremental**:
  - [x] Monitoramento de alterações em tempo real via watcher de sistema de arquivos
  - [x] Chunking inteligente com sobreposição de sentenças
  - [x] Busca semântica local com pontuação de relevância e injeção contextual no prompt
- [x] **Visualização de Grafo de Conhecimento (`KnowledgeGraphModal.jsx`)**:
  - [x] Grafo interativo 2D/3D dos arquivos, entidades e relacionamentos indexados

---

## 6. 🐝 Swarm Multi-Agent & Colaboração em Equipe

- [x] **Mecanismo Swarm (`electron/agent/swarmManager.js`)**:
  - [x] Modo **Paralelo**: Execução concorrente com múltiplos agentes e síntese final
  - [x] Modo **Pipeline**: Execução sequencial encadeada onde a saída de um agente alimenta o próximo
  - [x] Modo **Debate**: Discussão dialética entre agentes com papéis opostos e mediação
- [x] **Papéis Especializados**:
  - [x] Arquiteto de Software
  - [x] Revisor de Código
  - [x] Engenheiro de Segurança & Compliance
  - [x] Especialista em Documentação
  - [x] Jurídico / Especialista Legal
  - [x] Marketing & Estratégia de Conteúdo
  - [x] Criação de papéis dinâmicos e customizados pelo usuário
- [x] **Interface do Swarm Team (`SwarmTeamModal.jsx`)**:
  - [x] Configuração visual de equipes, seleção de modos, parâmetros e acompanhamento de execução

---

## 7. 🧩 Sistema de Plugins & Skills

- [x] **Micro-Kernel de Plugins (`electron/pluginManager.js`)**:
  - [x] Ativação e desativação granular de módulos para economizar RAM e CPU em repouso
  - [x] Plugins oficiais integrados:
    - [x] RAG (Base de Conhecimento)
    - [x] Canvas (Workspace de Documentos)
    - [x] Terminal & Background Tasks
    - [x] Navegador Web Integrado
    - [x] MCP (Model Context Protocol)
    - [x] Workflows & Automação
    - [x] Scheduler (Agendamentos e Cron)
    - [x] Swarm (Equipes Multi-Agente)
    - [x] Code Runner (Sandbox de Código)
    - [x] Git Version Control
    - [x] Backup & Restore
    - [x] Observability (Prompt Caching & Métricas)
    - [x] AI Arena (Debates e Comparações)
    - [x] Computer Vision (Assistente de Tela)
    - [x] Daily Briefing (Resumo Diário)
    - [x] Knowledge Graph (Grafo de Dados)
    - [x] Live Preview (Web Sandbox em tempo real)
    - [x] MCP Hub (Comunidade)
    - [x] Podcast & Audio Studio
- [x] **Gerenciador de Skills (`electron/skillManager.js` & `SkillsModal.jsx`)**:
  - [x] Detecção e leitura de pastas de skills com especificação `SKILL.md`
  - [x] Habilitação e desabilitação de skills sob demanda

---

## 8. 🎨 Imagens, Multimodalidade & Mídia

- [x] **Análise e Visão Computacional**:
  - [x] Upload de imagens (PNG, JPG, WEBP) no chat com visualização imediata
  - [x] Suporte nativo a modelos de visão (GPT-4o, Claude 3.5/3.7, Gemini 2.0/2.5 Flash, Llama 3.2 Vision)
- [x] **Ferramenta de Recorte de Tela (Snip Tool)**:
  - [x] Captura de telas ou janelas ativas (`screenCaptureService.js` e `SnipModal.jsx`)
  - [x] Inserção imediata da captura recortada no campo de chat
- [x] **Geração de Imagens com IA**:
  - [x] xAI Grok Imagine (`grok-imagine-image`)
  - [x] OpenAI DALL-E 3 (`dall-e-3`)
  - [x] Controle de proporções (1:1, 16:9, 9:16, 4:3, 3:2)
  - [x] Card interativo no chat com progresso de geração, visualização em tela cheia, download e cópia
  - [x] Painel de teste rápido de geração nas configurações

---

## 9. 🎙️ Voz, Áudio & Acessibilidade

- [x] **Entrada e Transcrição por Voz (STT)**:
  - [x] Groq Whisper API de altíssima velocidade
  - [x] Atalho global Push-to-Talk (`Ctrl+Alt` mantido pressionado para falar, soltar para transcrever)
  - [x] Tratamento de erros de microfone e chave de API dedicada
- [x] **Leitura em Voz Alta (TTS)**:
  - [x] Síntese de fala via Web Speech API nativa
  - [x] Seleção de vozes do sistema operacional
  - [x] Ajuste fino de taxa de velocidade (`rate`) e tonalidade (`pitch`)
  - [x] Leitura automática de respostas configurável
  - [x] Botões individuais de reprodução, pausa e cancelamento por mensagem e no Canvas

---

## 10. 💬 Interface, Conversação & UX

- [x] **Dois Modos de Interface**:
  - [x] **Modo Usuário**: Interface limpa, minimalista e focada em chat diário
  - [x] **Modo Power User**: Controles técnicos avançados de temperatura, fallbacks, MCP, trajetórias, observabilidade e Git
- [x] **Diretório de Bots & Personas**:
  - [x] Seletor de bots e personas (Hermes, Grok, Assistente Geral, Auditor de Código, etc.)
  - [x] Threads dedicadas contínuas por bot com histórico persistente próprio
  - [x] Customização de avatares, instruções e descrições de personas
- [x] **Experiência de Conversação**:
  - [x] Streaming suave de respostas com throttler anti-travamento
  - [x] Bloco retrátil de raciocínio (*Thinking / Reasoning*) para modelos como DeepSeek R1, Qwen 2.5 e Claude 3.7
  - [x] Renderização de Markdown completo com realce de sintaxe em dezenas de linguagens
  - [x] Suporte a equações matemáticas LaTeX / KaTeX (inline e display)
  - [x] Indicador de consumo de contexto da janela do modelo em tempo real
  - [x] Histórico de chats com ramificação (*branching*), busca por texto, renomeação e exclusão
  - [x] Organização de chats por Projetos com contexto e instruções compartilhadas
  - [x] Biblioteca de modelos de prompt e comandos slash (`/`)
  - [x] Controle de alinhamento de texto das respostas (à esquerda ou justificado)
  - [x] Janela flutuante rápida (Popup Global) acessível via `Ctrl+G` / `Cmd+G` ou protocolo `groq://`
  - [x] Modal de atalhos de teclado completo com busca e gravação de hotkeys

---

## 11. 🧠 Memória Persistente do Usuário (Long-Term Memory)

- [x] **Serviço de Memória (`electron/memoryService.js` e `UserMemoryModal.jsx`)**:
  - [x] Extração e aprendizado automático de preferências, fatos e regras a partir das conversas
  - [x] Filtragem categórica de memórias (preferências, fatos de código, regras gerais, perfil)
  - [x] Busca textual precisa com normalização diacrítica
  - [x] Adição manual, edição, ativação/desativação e exclusão de memórias
  - [x] Injeção inteligente no contexto das mensagens sem poluir o histórico visível

---

## 12. 🔬 Labs & Módulos Criativos

- [x] **AI Arena & Debate entre Modelos (`ArenaModal.jsx`, `CompareChatView.jsx`)**:
  - [x] Comparação lado a lado de dois ou mais modelos respondendo ao mesmo prompt
  - [x] Modo de debate estruturado entre modelos avaliando os argumentos do oponente
- [x] **Live Sandbox (`LiveSandboxModal.jsx`, `livePreviewPlugin.js`)**:
  - [x] Pré-visualização instantânea de componentes React (com Babel standalone) e HTML/Tailwind CSS
  - [x] Captura de logs de console do iframe isolado
- [x] **Podcast Studio (`PodcastStudioModal.jsx`)**:
  - [x] Geração de roteiros de podcast para dois apresentadores a partir de tópicos ou artigos
- [x] **Daily Briefing (`DailyBriefingModal.jsx`)**:
  - [x] Resumo proativo matinal com agenda, prioridades de código e notícias sintetizadas
- [x] **Computer Vision Assistant (`ComputerVisionModal.jsx`)**:
  - [x] Assistente de tela com OCR e inspeção visual de interfaces

---

## 13. 🛡️ Segurança, Dados, Git & Integrações

- [x] **Cofre de Segredos Nativo do Sistema Operacional (`secretStore.js`)**:
  - [x] Criptografia de chaves de API e tokens sensíveis usando Electron `safeStorage` (DPAPI no Windows, Keychain no macOS, Secret Service no Linux)
- [x] **Diretório de Configuração Personalizável (`configDirManager.js`)**:
  - [x] Alteração do local de armazenamento de dados e chats (ex: unidade D:\ ou pasta em nuvem)
  - [x] Migração automática de dados entre diretórios com verificação de integridade
- [x] **Backup & Restauração (`backupManager.js`)**:
  - [x] Exportação de histórico de chats, projetos, preferências e memórias em formato JSON protegido
  - [x] Importação com mesclagem ou substituição sem expor credenciais em texto claro
- [x] **Integração Protegida com Git (`gitManager.js`)**:
  - [x] Inspeção de status do repositório, branches e diffs modificados
  - [x] Criação de commits e push com confirmação visual
- [x] **Conectores do Google Workspace (`googleOAuthManager.js`)**:
  - [x] Autenticação OAuth nativa para Gmail, Google Calendar e Google Drive
  - [x] Aprovação humana obrigatória (*human-in-the-loop*) antes de disparar emails ou editar eventos
- [x] **Observabilidade e Gestão de Custos (`observabilityManager.js`)**:
  - [x] Contabilização de tokens de entrada e saída por provedor e por modelo
  - [x] Estimativa de custos financeiros com limite de orçamento mensal
  - [x] Exportação de relatórios de métricas em JSON e CSV
- [x] **Atualizações Automáticas (`updateManager.js`)**:
  - [x] Verificação no startup via `electron-updater` com canais `stable` e `beta`

---

## 14. 📦 Build, Empacotamento & Distribuição

- [x] Scripts de build para Windows (`pnpm dist:win` com instalador NSIS e executável portátil)
- [x] Scripts de build para macOS (`pnpm dist:mac` com pacotes DMG e ZIP)
- [x] Scripts de build para Linux (`pnpm dist:linux` com pacotes AppImage e deb)
- [x] Fluxo de lançamento automatizado (`pnpm release:create` e `pnpm release:publish`)
- [x] Suporte à instalação não-oficial via Homebrew Tap para macOS
- [x] Publicação de artefatos no repositório `giseldo/neochat-releases`

---

# 🚀 O Que Falta — Backlog & Roadmap Futuro

Abaixo estão listadas as funcionalidades pendentes, melhorias arquiteturais e recursos planejados para as próximas versões do NeoChat Desktop, organizados por prioridade e maturidade.

---

### 🔴 Alta Prioridade (Próxima Release / v0.0.5)

- [ ] **Mecanismo de Embeddings 100% Local e Offline**:
  - [ ] Integrar biblioteca local de embeddings neurais (ex: `@xenova/transformers` ou ONNX Runtime Web com modelo `all-MiniLM-L6-v2` / `bge-small-en-v1.5`)
  - [ ] Eliminar dependência de APIs remotas para o RAG, permitindo busca vetorial 100% offline e privada
- [ ] **Suporte a Transcrição de Voz (STT) 100% Offline**:
  - [ ] Opção de alternar entre a API remota do Groq Whisper e um engine Whisper local em C++ / WebGPU (`whisper.node` ou `sherpa-onnx`)
  - [ ] Download automático ou sob demanda dos pesos dos modelos `whisper-tiny` ou `whisper-base`
- [ ] **Síntese de Voz (TTS) Neural Local de Alta Qualidade**:
  - [ ] Suporte a modelos neurais locais compactos (ex: Piper TTS ou Kokoro TTS) para fala com entonação humana sem depender exclusivamente das vozes sintetizadas padrão do SO
- [ ] **Framework Formal de Testes Automatizados**:
  - [ ] Migrar a suíte de scripts de teste ad-hoc (`test-*.js`) para um runner moderno e integrado como **Vitest**
  - [ ] Adicionar testes de integração de componentes React com React Testing Library / Happy-DOM
  - [ ] Adicionar testes ponta a ponta (E2E) com Playwright para Electron

---

### 🟡 Média Prioridade (Versões v0.0.6 a v0.1.0)

- [ ] **Navegação Web Autônoma e Deep Search**:
  - [ ] Agente de busca recursiva capaz de abrir múltiplas páginas de resultados, extrair o texto limpo, filtrar anúncios e resumir referências cruzadas
  - [ ] Gerador automático de citações e notas de rodapé acadêmicas clicáveis
- [ ] **Interface com Divisão de Tela (Split-Screen / Multi-Tab Chat)**:
  - [ ] Permitir abrir duas conversas simultâneas lado a lado (ex: comparar um chat de código com um de arquitetura)
  - [ ] Abas de conversa na barra superior (estilo navegador) para alternância rápida entre múltiplos tópicos
- [ ] **Modo de Voz Bidirecional Contínuo (Full-Duplex Voice Mode)**:
  - [ ] Conversação por voz em tempo real sem precisar soltar botões (detecção de término de fala VAD - Voice Activity Detection)
  - [ ] Interrupção de fala da IA por voz (*barge-in*)
- [ ] **Marketplace Remoto de Plugins e Skills**:
  - [ ] Repositório central de extensões aprovadas pela comunidade
  - [ ] Instalação e atualização de plugins e servidores MCP com um clique diretamente pela UI
- [ ] **Suporte a Múltiplos Espaços de Trabalho (Multi-Root Workspaces)**:
  - [ ] Capacidade do Neo Agent monitorar e operar em múltiplas pastas ou repositórios simultaneamente
  - [ ] Suporte a submódulos Git

---

### 🟢 Longo Prazo & Excelência de Engenharia

- [ ] **Tipagem Estática e Refatoração Gradual para TypeScript**:
  - [ ] Introduzir checagem com `tsc` e tipagem completa para os contratos de IPC, estruturas do agente e propriedades do Reducer de mensagens
- [ ] **Certificação e Assinatura Digital de Binários**:
  - [ ] Assinatura de código para Windows (Certificado EV / Microsoft SmartScreen) para evitar alertas de segurança no instalador
  - [ ] Notarização automatizada no ecossistema Apple macOS via Apple Developer ID
  - [ ] Empacotamento Flatpak verificado no Flathub para distribuição Linux
- [ ] **Sincronização em Nuvem Criptografada Ponta-a-Ponta (E2EE)**:
  - [ ] Sincronização opcional de histórico e memórias entre múltiplos dispositivos (Desktop ↔ Web ↔ Mobile) usando chave mestra privada
- [ ] **Otimização de Desempenho para Sessões Longas de Agente**:
  - [ ] Virtualização avançada de mensagens na lista (`MessageList.jsx`) para conversas com mais de 10.000 mensagens
  - [ ] Perfilamento contínuo de retenção de memória e alocação de buffers no processo Electron Main
