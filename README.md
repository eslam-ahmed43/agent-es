# AgentOS — CI/CD for AI Agents

> Test, evaluate, and improve your AI Agent before it fails in production.

**Live Demo:** https://agent-es-nu.vercel.app

---

## What is AgentOS?

AgentOS is the CI/CD equivalent for AI Agents and LLMs. Just like GitHub Actions tests your code before deployment, AgentOS tests your AI Agent before it goes live.

---

## The Problem

AI Agents fail in production in unpredictable ways:
- They hallucinate facts
- They're vulnerable to jailbreaks and prompt injection
- They forget context in long conversations
- They call the wrong tools
- A prompt change breaks everything silently

---

## The Solution

AgentOS provides automated end-to-end testing for AI Agents:

```
Add Agent → Run Benchmarks → Get Reliability Score → Auto Improve → Ship with confidence
```

---

## Key Features

### 🧪 Benchmark Testing
- 4 production-grade benchmarks (Customer Support, Coding, Safety, RAG)
- AI + Human + Adversarial scenario generation
- Persona, Edge Case, Attack, Long Conversation scenarios

### ⚖️ Judge Engine
- LLM-as-a-Judge evaluation pattern
- Scores: Safety, Relevance, Consistency, Helpfulness
- Full explainability with strengths, weaknesses, and suggestions

### 🚀 Auto Improve
- Analyzes agent weaknesses automatically
- Rewrites system prompts using AI
- Verifies improvement before applying
- Typical improvement: +5–10%

### 🧠 Memory Evaluation
- 6 memory test types:
  - Name Recall
  - Order Retention
  - Preference Memory
  - Multi-fact Recall
  - Context Shift
  - Needle in Haystack

### 🔧 Tool Calling Evaluation
- Tests if agent selects correct tools
- Verifies parameter accuracy
- Detects infinite loop patterns

### 📊 Reliability Score
- Composite score across all evaluation dimensions
- Tracks improvement over time
- Version history and comparison

### 🔄 Regression Suite
- Catch regressions before deployment
- Fast 5-scenario check per benchmark
- Stoppable mid-run

---

## Real Benchmark Results

| Model | Provider | Score |
|-------|----------|-------|
| Llama 4 Scout | Groq | 95.5% |
| Gemini 2.5 Flash | Google | 87.4% |

*Customer Support Benchmark — tested by AgentOS*

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| AI Providers | Groq, Gemini, NVIDIA NIM, OpenRouter |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Supported Agent Types

- ✅ Prompt Only (any LLM via system prompt)
- ✅ REST API Endpoint
- ✅ OpenAI Compatible API
- ✅ MCP Server (Model Context Protocol)

---

## Quick Start

1. Go to https://agent-es-nu.vercel.app
2. Create an account
3. Add your AI Agent (paste your API endpoint + key)
4. Run a Benchmark
5. Get your Reliability Score and improve

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Next.js App   │────▶│  Express Backend  │────▶│  Supabase   │
│   (Vercel)      │     │  (Railway)        │     │  PostgreSQL │
└─────────────────┘     └──────────────────┘     └─────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                  Groq       Gemini      NVIDIA
               (Execution)  (Judge)   (Generation)
```

---

## AI Routing Strategy

| Purpose | Primary | Fallback |
|---------|---------|---------|
| Execution | Groq (fast) | Gemini → OpenRouter |
| Judge | Gemini (accurate) | Groq → OpenRouter |
| Generation | Gemini | NVIDIA → Groq |

---

## Built By

**Eslam Ahmed** — AI Engineering Student, Cairo University  
Solo full-stack development across ML, Backend, and Frontend

---

*AgentOS — Making AI Agents production-ready*
