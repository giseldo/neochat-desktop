# NeoChat Research — primeira etapa

Edição single user no mesmo repositório, com entrada Electron própria e componentes React de pesquisa. Não exige conta ou servidor. O Desktop mantém sua inicialização atual.

## Executar

- Desktop: `pnpm dev` (Vite na porta 5173).
- Research: `pnpm dev:research` (Vite na porta 5174, aguardado antes de abrir o Electron).
- Pacote local Research: `pnpm pack:research`.
- Instalador e portátil Windows Research: `pnpm dist:research` (saída em `release/research`).
- Validar: `pnpm test:research`, `pnpm build` e `pnpm test:research:ui` (Electron com dados temporários).
- Validar o pacote Windows após `pnpm pack:research`: `pnpm test:research:package` (abre o executável gerado e usa dados temporários).

É possível executar as duas edições simultaneamente. O Research usa exclusivamente a ponte `window.research`, não inicializa provedores de chat e não registra atalhos globais, protocolo groq ou atualizador do Desktop.

## Dados

Projetos em `app.getPath('appData')/neochat-research/reviews`, um JSON por revisão. No Windows, normalmente `%APPDATA%/neochat-research/reviews`. A edição não herda o caminho personalizado nem as configurações do Desktop. `NEOCHAT_RESEARCH_USER_DATA_PATH` permite definir um diretório exclusivo, inclusive para testes. Os arquivos incluem versão do esquema, revisão, datas e protocolo. A gravação usa arquivo temporário e renomeação; conflitos de revisão são recusados.

## Entregue

Criar, listar, buscar, abrir e editar projetos; título obrigatório; objetivos; perguntas; critérios de inclusão/exclusão e PICOC opcional. Salvamento explícito, indicação de alterações pendentes e confirmação antes de descartá-las.

- Buscas: base, string, data, quantidade de resultados e observações.
- Biblioteca: cadastro e edição manual, importação RIS e BibTeX (até 20 MB), marcação de possíveis duplicatas por DOI ou título/ano. Nenhum registro é removido automaticamente. O leitor BibTeX aceita valores entre chaves/aspas, macros `@string` e concatenação; mantém comandos LaTeX como texto e não resolve herança `crossref`. Entradas inválidas interrompem a importação sem inserir resultados parciais.
- PDFs: cópia local de anexos de até 50 MB por estudo e abertura no leitor do sistema.
- Seleção: título/resumo e texto completo. Exclusões exigem motivo; mudanças de decisão são registradas com data e autoria humana. Reverter a inclusão inicial devolve a avaliação do texto completo para pendente.
- Qualidade: checklist configurável, respostas sim/parcial/não/não se aplica, evidência e página.
- Extração: campos configuráveis com resposta, evidência e página, aplicados aos estudos incluídos no texto completo.
- Resultados: matriz CSV com referências, decisões e respostas; relatório Markdown com protocolo, buscas e evidências. Campos CSV potencialmente interpretados como fórmulas são neutralizados.
- Backup: JSON com protocolo, biblioteca, buscas, formulários, respostas, histórico e PDFs (limite de 150 MB de PDFs). Restaurar cria uma cópia com novo ID, preservando a revisão original no computador.

Importar RIS, anexar PDF e exportar salvam primeiro as alterações do projeto. Não feche o aplicativo enquanto uma operação estiver em andamento.

## Próximas etapas

Assistência por IA com verificação de evidências, leitura integrada de PDFs e síntese escrita. A versão atual é um fluxo manual de organização de revisões; não há busca automática em bases, extração automática de PDFs, pontuação automática de qualidade ou alegação de conformidade metodológica. O empacotamento Research herda a configuração principal e define identidade, executável, atalho, entrada e saída próprios. Não publica releases nem utiliza o canal de atualização Desktop. Os comandos de distribuição existentes continuam gerando o Desktop.

O Parsifal é referência funcional de planejamento de revisões. Nenhum código do Parsifal foi incorporado nesta etapa.
