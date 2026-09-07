# NeoChat Research — primeira etapa

Edição single user no mesmo repositório, com entrada Electron própria e componentes React de pesquisa. Não exige conta ou servidor. O Desktop mantém sua inicialização atual.

## Executar

- Desktop: `pnpm dev` (Vite na porta 5173).
- Research: `pnpm dev:research` (Vite na porta 5174, aguardado antes de abrir o Electron).
- Validar: `pnpm test:research` e `pnpm build`.

É possível executar as duas edições simultaneamente. O Research usa exclusivamente a ponte `window.research`, não inicializa provedores de chat e não registra atalhos globais, protocolo groq ou atualizador do Desktop.

## Dados

Projetos em `app.getPath('appData')/neochat-research/reviews`, um JSON por revisão. No Windows, normalmente `%APPDATA%/neochat-research/reviews`. A edição não herda o caminho personalizado nem as configurações do Desktop. Os arquivos incluem versão do esquema, revisão, datas e protocolo. A gravação usa arquivo temporário e renomeação; conflitos de revisão são recusados.

## Entregue

Criar, listar, buscar, abrir e editar projetos; título obrigatório; objetivos; perguntas; critérios de inclusão/exclusão e PICOC opcional. Salvamento explícito, indicação de alterações pendentes e confirmação antes de descartá-las.

## Próximas etapas

Biblioteca e importação de referências, triagem, avaliação de qualidade, extração com evidências e exportação. Não há geração por IA nesta etapa. Instaladores e canal de atualização Research ainda não estão configurados; os comandos de distribuição existentes continuam gerando o Desktop.

O Parsifal é referência funcional de planejamento de revisões. Nenhum código do Parsifal foi incorporado nesta etapa.
