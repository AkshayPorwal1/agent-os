# Building AgentOS: A Self-Teaching AI Agent on Google Cloud

*How we built an autonomous agent that learns from humans, validates with Gemma, and remembers forever with Firestore.*

---

Teaching an AI agent to follow instructions is easy. Teaching it to **learn new instructions from humans, validate them for safety, and remember them forever**? That's the challenge we tackled at the All Things Agentic Hackathon.

## The Problem

Most AI agents are brittle. They either follow hard-coded rules or hallucinate responses when faced with unfamiliar tasks. There's rarely a middle ground — an agent that can say "I don't know how to do this yet, but I can learn."

## Enter AgentOS

AgentOS is a generalist autonomous agent with a **3-tier memory vault**:

1. **Semantic Memory** — Understanding what a task *is* (powered by Gemini 3.6 Flash classification)
2. **Procedural Memory** — Knowing *how* to do it (Standard Operating Procedures stored in Firestore)
3. **Episodic Memory** — Remembering *what happened* (execution history for audit and learning)

When you submit a task like "Write a professional email," AgentOS checks its procedural memory. If it finds an SOP, it executes autonomously. If not, it enters a **Human-In-The-Loop (HITL) clarification dialogue** — asking you how you'd like this type of task handled, with smart suggestion chips.

## The Multi-Model Safety Net

Here's what makes it different: before any learned SOP is persisted to Firestore, it passes through a **Gemma 4 guardrail validator**. This lightweight MoE model (4B active parameters) checks every rule for:

- Prompt injection attempts
- Sensitive data leakage instructions
- Unsafe or harmful procedures
- Policy violations

Only validated SOPs make it into the memory vault. This means the agent can't be taught to do harmful things, even by a well-intentioned but careless operator.

## The Stack

We built this entirely on Google Cloud:

- **Gemini 3.6 Flash** via the `google-genai` Interactions API handles task classification, HITL generation, SOP creation, and autonomous execution
- **Gemma 4 (26B-a4b-it)** provides the safety guardrail layer
- **Cloud Firestore** stores the procedural SOPs and episodic task history
- **Cloud Run** hosts the FastAPI backend
- **Angular 18** powers the dark-themed command center frontend

## The "Aha" Moment

The magic happens when you submit the same type of task twice. The first time, AgentOS pauses and asks for guidance. The second time? It recognizes the task type, retrieves the SOP from Firestore, and executes immediately — no human needed. **The agent got smarter.**

And because every SOP is visible in the Memory Vault dashboard, humans maintain full oversight. You can see what the agent has learned, review the rules, and delete any SOP you disagree with. The agent adapts.

## What's Next

We're excited about extending AgentOS with semantic search over SOPs (so similar-but-not-identical task types can match), multi-step SOP chaining, and collaborative SOP editing where multiple humans can refine procedures together.

Building in public means building for the community. AgentOS isn't just an agent — it's a framework for **collaborative human-AI evolution**.

---

*Built at the All Things Agentic Hackathon on Google Cloud. #allthingsagentichackathon #GoogleCloud*
