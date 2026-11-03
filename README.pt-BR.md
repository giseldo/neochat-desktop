# NeoChat Desktop

[English](README.md) · [Français](README.fr.md)

Um espaço de trabalho de IA para Windows, macOS e Linux. Use provedores na nuvem ou modelos locais, trabalhe com arquivos e ferramentas e organize suas conversas em um só lugar.

## Funcionalidades

- **Modelos:** Groq, OpenAI, Anthropic, DeepSeek e outros provedores; Ollama, LM Studio e endpoints compatíveis com OpenAI; fallback entre provedores.
- **Agentes e ferramentas:** Neo Agent com aprovação de ferramentas, checkpoints e reversão de arquivos; equipes de agentes; servidores MCP locais e remotos.
- **Conhecimento:** indexação e busca em documentos locais, grafo de conhecimento, memória persistente, projetos e ramificação de conversas.
- **Workspace:** canvas com exportação para Word/PDF, terminal, explorador de arquivos, navegador, tarefas em segundo plano e integração com Git.
- **Multimodal:** entrada e geração de imagens, capturas de tela, transcrição de voz e leitura em voz alta.
- **Automação e integrações:** workflows, execuções agendadas e conectores do Google Workspace.
- **Mais recursos:** comparação de modelos, sandbox, Podcast Studio, acompanhamento de uso e custos e modos Usuário e Usuário avançado. Abra o popup global com `Ctrl+G` / `Cmd+G`.

## Como começar

Requisitos: Node.js 22 ou superior e [pnpm](https://pnpm.io/) 10.9.0.

```sh
pnpm install
pnpm dev
```

Em Configurações, adicione uma chave de API ou configure um servidor local em execução, como Ollama ou LM Studio. Se a instalação do Electron falhar, execute `pnpm approve-builds` e aprove os scripts necessários.

```sh
pnpm test    # Testes principais
pnpm build   # Build do renderer
pnpm dist    # Pacote para a plataforma atual em release/
```

## Créditos e licença

O NeoChat Desktop é baseado no [groq-desktop-beta](https://github.com/groq/groq-desktop-beta) da Groq, Inc. Consulte [LICENSE](LICENSE) para a licença MIT.
