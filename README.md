# Fallow

A personal desktop app for dormant ideas. Fallow gives your unfinished thoughts a place to live, grow, and find each other — powered by Hermes Agent running Kimi K2.

---

## What Fallow Does

Most ideas don't die. They stall. Fallow is built around that premise.

You plant a **Seed** — an idea, a concept, something you want to explore but can't right now. You describe what's blocking you. Fallow remembers it, searches for relevant material, and finds connections to your other seeds autonomously. When circumstances change, you add a **Condition** and Fallow resurfaces the seeds that are now unblocked.

### Vocabulary

| Term | What it means |
|------|---------------|
| **Seed** | An individual idea stored in Fallow |
| **Branch** | Agent-found articles, links, or media relevant to a seed |
| **Root** | A thematic or methodological connection between two seeds, identified by Fallow |
| **Condition** | A change in circumstance — a new tool, resource, or situation — that may unblock dormant seeds |
| **Garden** | The main view where all your seeds live |

---

## Prerequisites

- **[Node.js](https://nodejs.org/)** (v20 or later)
- npm (comes with Node.js)
- **WSL2** (Windows) or a Unix-based terminal (Mac/Linux)
- *(Optional, for AI features)* **[Hermes Agent](https://github.com/nousresearch/hermes-agent)** installed and available in your PATH
- *(Optional, for AI features)* An **[OpenRouter](https://openrouter.ai/)** API key with access to `moonshotai/kimi-k2.6`

Fallow runs without Hermes — you can plant seeds, add conditions, and manage your garden manually. Hermes enables the autonomous features: Branch search, Root identification, and Condition scanning.

---

## Install

```bash
git clone https://github.com/yourusername/fallow.git
cd fallow
npm install
```

---

## Run

```bash
npm run electron:dev
```

---

## AI Setup

1. Install **[Hermes Agent](https://github.com/nousresearch/hermes-agent)**
2. Add your OpenRouter API key to `~/.hermes/.env`:

```
OPENROUTER_API_KEY=sk-or-...
```

3. Set the model in `~/.hermes/config.yaml`:

```yaml
model:
  default: moonshotai/kimi-k2.6
  provider: openrouter
```

---

## Discord Integration *(Coming Soon)*

Fallow will support Discord as a way to operate the app and plant seeds without opening it directly. Stay tuned.

---

## Your Data

Seeds, conditions, branches, and roots are stored locally in your Electron app data folder and never leave your machine unless you interact with the Hermes Agent directly. A fresh install starts with an empty garden.

---

## License

MIT
