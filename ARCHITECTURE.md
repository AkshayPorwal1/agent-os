# AgentOS Architecture

> **Track 2 — The Collaborative Partner** | All Things Agentic Hackathon (Google Cloud)

## Overview

AgentOS is a self-documenting, generalist autonomous agent with a **3-tier memory vault** that learns and evolves from human interaction. When given an unfamiliar task, it doesn't fail — it **pauses, asks for guidance, learns the procedure, validates it for safety, and remembers it forever**.

## System Architecture

```mermaid
graph TB
    subgraph Frontend["Angular 18 Frontend"]
        CC["Command Center<br/>Task Submission"]
        TA["Task Activity<br/>HITL Panel"]
        MV["Memory Vault<br/>SOP Dashboard"]
    end

    subgraph CloudRun["Google Cloud Run"]
        API["FastAPI REST API<br/>CORS · Task Router"]
        AB["Agent Brain<br/>Cognitive Loop"]
        GR["Guardrail Validator"]
    end

    subgraph GeminiAPI["Google AI Studio"]
        GEMINI["Gemini 3.6 Flash<br/>Primary Reasoning"]
        GEMMA["Gemma 4 26B<br/>Safety Guardrails"]
    end

    subgraph Firestore["Google Cloud Firestore"]
        SOPS["procedural_sops<br/>Learned SOPs"]
        HIST["task_history<br/>Episodic Memory"]
    end

    CC -->|"POST /api/tasks/submit"| API
    TA -->|"POST /api/tasks/resume"| API
    TA -->|"GET /api/tasks/status/:id"| API
    MV -->|"GET /api/sops"| API
    MV -->|"DELETE /api/sops/:type"| API

    API --> AB
    AB -->|"Classify & Reason"| GEMINI
    AB -->|"Check SOPs"| SOPS
    AB -->|"Record History"| HIST
    AB -->|"Validate SOPs"| GR
    GR -->|"Safety Check"| GEMMA

    AB -->|"HITL Payload"| TA
    AB -->|"Execution Result"| TA
```

## Core Flow: The Learning Loop

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Angular Frontend
    participant API as FastAPI Backend
    participant Brain as Agent Brain
    participant Gemini as Gemini 3.6 Flash
    participant Vault as Firestore Vault
    participant Gemma as Gemma 4 Guardrails

    U->>FE: Submit task
    FE->>API: POST /api/tasks/submit
    API->>Brain: process_task()

    Brain->>Gemini: Classify task type
    Gemini-->>Brain: task_type + confidence

    Brain->>Vault: get_sop(task_type)

    alt SOP Exists
        Vault-->>Brain: SOP document
        Brain->>Gemini: Execute with SOP rules
        Gemini-->>Brain: Result
        Brain->>Vault: record_task_history()
        Brain-->>API: COMPLETED + result
        API-->>FE: Task result
        FE-->>U: Display result
    else No SOP Found
        Vault-->>Brain: null
        Brain->>Gemini: Generate HITL payload
        Gemini-->>Brain: question + options
        Brain-->>API: NEEDS_CLARIFICATION
        API-->>FE: HITL prompt
        FE-->>U: Show question + chips

        U->>FE: Select option / type response
        FE->>API: POST /api/tasks/resume
        API->>Brain: resume_with_clarification()

        Brain->>Gemini: Generate SOP from response
        Gemini-->>Brain: SOP draft (title + rules)

        Brain->>Gemma: Validate SOP safety
        Gemma-->>Brain: is_safe + reason

        alt SOP is Safe
            Brain->>Vault: save_sop()
            Brain->>Gemini: Execute with new SOP
            Gemini-->>Brain: Result
            Brain->>Vault: record_task_history()
            Brain-->>API: COMPLETED + sop_written=true
            API-->>FE: Task result + SOP created
            FE-->>U: Display result + update vault
        else SOP Rejected
            Brain-->>API: FAILED + guardrail reason
            API-->>FE: Safety rejection
            FE-->>U: Show rejection reason
        end
    end
```

## 3-Tier Memory Vault

| Tier | Type | Storage | Purpose |
|------|------|---------|---------|
| **Tier 1** | Semantic | Gemini Context | Task classification and understanding |
| **Tier 2** | Procedural | Firestore `procedural_sops` | Learned SOPs — the agent's "playbook" |
| **Tier 3** | Episodic | Firestore `task_history` | Historical record of every execution |

## Multi-Model Architecture

| Model | Role | Why |
|-------|------|-----|
| **Gemini 3.6 Flash** | Primary Brain | 1M token context, fast reasoning, task classification, SOP generation, and task execution |
| **Gemma 4 (26B-a4b-it)** | Guardrail Validator | Lightweight MoE model (4B active params) for safety checking — inspects SOPs for prompt injection, unsafe instructions, and PII leakage before persistence |

## Technology Stack

- **Frontend:** Angular 18 (Standalone components, TypeScript, SCSS)
- **Backend:** Python + FastAPI + Uvicorn
- **AI Models:** Gemini 3.6 Flash + Gemma 4 via `google-genai` Interactions API
- **Database:** Google Cloud Firestore (Native mode)
- **Deployment:** Google Cloud Run + Artifact Registry
- **SDK:** `google-genai` v2.3.0+

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/tasks/submit` | Submit a new task |
| `POST` | `/api/tasks/resume` | Submit HITL clarification |
| `GET` | `/api/tasks/status/{id}` | Poll task status |
| `GET` | `/api/sops` | List all learned SOPs |
| `DELETE` | `/api/sops/{type}` | Delete an SOP |

## Track 2 Alignment: The Collaborative Partner

AgentOS embodies Track 2 by:
1. **Collaborative Learning:** The agent actively learns from human guidance through structured HITL dialogues.
2. **Trust Through Transparency:** Every SOP is visible, editable, and deletable in the Memory Vault dashboard.
3. **Safety-First:** Gemma 4 guardrails validate every learned procedure before it's stored.
4. **Growing Autonomy:** Each HITL interaction makes the agent more capable — it never asks the same question twice.
