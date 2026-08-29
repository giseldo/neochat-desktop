# RAG Local & Base de Conhecimento

O motor de **Retrieval-Augmented Generation (RAG)** do NeoChat Desktop permite que os modelos consultem documentos e bases de código privadas com **privacidade total e sem necessidade de envio a servidores de terceiros**.

---

## 📑 Ingestão Multiformato com `officeparser`

O serviço `electron/ragService.js` processa uma ampla variedade de formatos de arquivo locais:

- **Documentos de Texto:** `.txt`, `.md`, `.json`, `.yaml`, `.csv`, `.xml`
- **Documentos Office:** `.docx` (Word), `.xlsx` (Excel), `.pptx` (PowerPoint)
- **Documentos PDF:** `.pdf` com extração estruturada de páginas e texto
- **Arquivos de Código:** `.js`, `.ts`, `.jsx`, `.py`, `.rs`, `.go`, `.cpp`, `.html`, `.css`

---

## ⚙️ Pipeline de Processamento Semântico

```
+-----------------------+
|  Arquivo Selecionado  |
+-----------------------+
           │
           ▼
+-----------------------+
|  Extração de Texto    |  (officeparser / leitor binário)
+-----------------------+
           │
           ▼
+-----------------------+
|  Chunking Semântico   |  (Segmentação em blocos de 800 caracteres com overlap de 150)
+-----------------------+
           │
           ▼
+-----------------------+
|  Geração de Vetores   |  (Embeddings de dimensão fixa)
+-----------------------+
           │
           ▼
+-----------------------+
|  Índice Vetorial      |  (Armazenado localmente em userData/rag_index/)
+-----------------------+
```

---

## 🎯 Busca Semântica por Similaridade de Cossenos

Quando o usuário faz uma pergunta com RAG ativado, o `ragService` calcula a proximidade angular entre o vetor da pergunta e todos os chunks da base de conhecimento:

$$\text{Similaridade}(u, v) = \frac{u \cdot v}{\|u\| \|v\|} = \frac{\sum_{i=1}^{n} u_i v_i}{\sqrt{\sum_{i=1}^{n} u_i^2} \sqrt{\sum_{i=1}^{n} v_i^2}}$$

Os $k$ fragmentos com maior pontuação de similaridade acima do limiar configurado (`relevanceThreshold >= 0.72`) são formatados e injetados diretamente na mensagem de sistema:

```markdown
[CONTEXTO DA BASE DE CONHECIMENTO LOCAL]
Documento: relatorio_financeiro.docx (Página 3)
Trecho: O faturamento consolidado do terceiro trimestre registrou alta de 14.2%...

Utilize os fatos acima para responder à pergunta do usuário com precisão.
```

---

## ⚡ Indexação Incremental Inteligente

Para evitar reindexação custosa de diretórios grandes, o `ragService` mantém uma tabela de hashes de arquivo (`SHA-256`). Apenas arquivos adicionados ou modificados desde a última execução são reprocessados.
