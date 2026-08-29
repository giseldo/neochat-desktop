# Observabilidade & Métricas

O NeoChat Desktop inclui um subsistema completo de observabilidade local (`electron/observabilityManager.js`) para dar ao usuário transparência total sobre consumo de recursos, custos e latência de inferência.

---

## 📊 Métricas Rastreadas em Tempo Real

Para cada sessão e provedor de IA utilizado, são registradas as seguintes métricas:

```
┌───────────────────────────┬────────────────────────────────────────────────────────┐
│ Métrica                   │ Descrição                                              │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ **Prompt Tokens**         │ Total de tokens consumidos no envio de contexto        │
│ **Completion Tokens**     │ Total de tokens gerados na resposta do modelo          │
│ **Time-to-First-Token**   │ Tempo em milissegundos até a chegada do primeiro chunk │
│ **Throughput (Tokens/s)** │ Velocidade efetiva de geração de texto da API          │
│ **Custo Estimado ($)**    │ Cálculo baseado na tabela pública de preços por modelo │
│ **Taxa de Erro / Retries**│ Quantidade de timeouts, rate-limits ou fallbacks       │
└───────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 📈 Tabela de Precificação & Cálculo Local

O `observabilityManager` calcula o custo em repouso sem depender de APIs de faturamento externas:

$$\text{Custo Total} = \left(\frac{\text{Prompt Tokens}}{10^6} \times \text{Preço Input}\right) + \left(\frac{\text{Completion Tokens}}{10^6} \times \text{Preço Output}\right)$$

Modelos locais (como Ollama e LM Studio) são automaticamente contabilizados com custo **$0.00**.

---

## 📑 Logs Estruturados & Diagnóstico

Todos os eventos operacionais são salvos em formato legível em `app.getPath('logs')/main.log`, facilitando auditorias e diagnóstico de suporte.
