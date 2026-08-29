# Workflows, Canvas & Scheduler

Além do chat conversacional, o NeoChat Desktop conta com módulos avançados de produtividade para geração de artefatos, fluxos de trabalho automatizados em lote e agendamento de tarefas.

---

## 🎨 Canvas de Artefatos & Monaco Editor

O **Canvas** é uma área de trabalho lateral inspirada no conceito de artefatos de IA:

- **Monaco Editor Integrado:** Permite ao usuário inspecionar, editar e refatorar códigos gerados pela IA com intellisense, realce de sintaxe e autocompletar.
- **Visualizador Live:** Renderiza previews em tempo real para componentes HTML/Tailwind, documentos Markdown e diagramas.
- **Síntese de Voz (TTS):** Através de `shared/ttsUtils.js` e Web Speech API / modelos de áudio, o usuário pode ouvir a leitura em voz alta do conteúdo gerado no Canvas.

```
+------------------------------+------------------------------------+
|         CHAT STREAM          |          CANVAS WORKSPACE          |
|                              |                                    |
| [Usuário]: Crie uma função   | +--------------------------------+ |
| de ordenação em TypeScript   | | Monaco Editor (TypeScript)     | |
|                              | | export function quickSort(arr) | |
| [IA]: Código gerado! Veja no | |   if (arr.length <= 1) return; | |
| Canvas ao lado.              | +--------------------------------+ |
|                              | [▶ Preview] [🔊 Ler TTS] [📋 Copiar]|
+------------------------------+------------------------------------+
```

---

## 🔄 Motor de Workflows (`workflowManager.js`)

Os **Workflows** permitem criar cadeias de execução automatizadas onde a saída de uma etapa alimenta a entrada da próxima:

```json
{
  "name": "Resumo Diário de Código",
  "steps": [
    {
      "id": "step-1",
      "action": "mcp:git:get_diff",
      "description": "Obtém as alterações do repositório local"
    },
    {
      "id": "step-2",
      "action": "llm:prompt",
      "template": "Resuma as seguintes alterações técnicas para o changelog: {{step-1.output}}"
    },
    {
      "id": "step-3",
      "action": "canvas:create_artifact",
      "title": "Changelog Diário"
    }
  ]
}
```

---

## ⏰ Agendador em Segundo Plano (`schedulerManager.js`)

O **Scheduler** opera como um cron nativo de desktop:
- Executa verificações periódicas mesmo com a janela principal minimizada na bandeja do sistema (System Tray).
- Dispara notificações nativas do sistema operacional (`new Notification({ title, body })`) quando uma automação conclui.
