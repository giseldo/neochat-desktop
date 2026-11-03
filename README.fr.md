# NeoChat Desktop

[English](README.md) · [Português](README.pt-BR.md)

Un espace de travail IA pour Windows, macOS et Linux. Utilisez des fournisseurs cloud ou des modèles locaux, travaillez avec des fichiers et des outils, et organisez vos conversations au même endroit.

## Fonctionnalités

- **Modèles :** Groq, OpenAI, Anthropic, DeepSeek et d’autres fournisseurs ; Ollama, LM Studio et points d’accès compatibles OpenAI ; basculement entre fournisseurs.
- **Agents et outils :** Neo Agent avec approbation des outils, points de restauration et annulation des modifications de fichiers ; équipes d’agents ; serveurs MCP locaux et distants.
- **Connaissances :** indexation et recherche dans les documents locaux, graphe de connaissances, mémoire persistante, projets et branches de conversation.
- **Espace de travail :** canevas avec export Word/PDF, terminal, explorateur de fichiers, navigateur, tâches en arrière-plan et intégration Git.
- **Multimodal :** ajout et génération d’images, captures d’écran, transcription vocale et synthèse vocale.
- **Automatisation et intégrations :** workflows, exécutions planifiées et connecteurs Google Workspace.
- **Autres fonctions :** comparaison de modèles, bac à sable, Podcast Studio, suivi de l’utilisation et des coûts, et modes Utilisateur et Utilisateur avancé. Ouvrez la fenêtre globale avec `Ctrl+G` / `Cmd+G`.

## Prise en main

Prérequis : Node.js 22 ou version ultérieure et [pnpm](https://pnpm.io/) 10.9.0.

```sh
pnpm install
pnpm dev
```

Dans les paramètres, ajoutez une clé API ou configurez un serveur local en cours d’exécution, comme Ollama ou LM Studio. Si l’installation d’Electron échoue, lancez `pnpm approve-builds` et approuvez les scripts nécessaires.

```sh
pnpm test    # Tests principaux
pnpm build   # Compilation de l’interface
pnpm dist    # Paquet pour la plateforme actuelle dans release/
```

## Crédits et licence

NeoChat Desktop est basé sur [groq-desktop-beta](https://github.com/groq/groq-desktop-beta) de Groq, Inc. Consultez [LICENSE](LICENSE) pour la licence MIT.
