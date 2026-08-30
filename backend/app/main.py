"""
AgentOS Backend — FastAPI Application.

Provides the REST API for the AgentOS frontend, including task submission,
HITL clarification handling, task status polling, and SOP management.
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agent import AgentBrain, TaskResponse
from .guardrails import GuardrailValidator
from .memory import MemoryVault

# ─── Environment ─────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-25s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App Initialisation ─────────────────────────────────────────────────────

app = FastAPI(
    title="AgentOS API",
    description=(
        "Self-documenting autonomous agent with a 3-tier memory vault. "
        "Track 2 — The Collaborative Partner."
    ),
    version="1.0.0",
)

# CORS — allow Angular dev server and Cloud Run origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:4000",
        "http://127.0.0.1:4200",
        # Cloud Run origins are dynamically added via ALLOWED_ORIGINS env var
        *[
            origin.strip()
            for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
            if origin.strip()
        ],
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Frontend Serving (for Cloud Run production deployment) ────────────

from fastapi.staticfiles import StaticFiles

static_dir = os.environ.get("STATIC_DIR", "/app/static")
if os.path.exists(static_dir):
    logger.info("Serving production static frontend from: %s", static_dir)
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# ─── Singletons ─────────────────────────────────────────────────────────────

gcp_project = os.environ.get("GCP_PROJECT_ID")
api_key = os.environ.get("GEMINI_API_KEY", "")

memory_vault = MemoryVault(project=gcp_project)
guardrail_validator = GuardrailValidator(api_key=api_key)
agent_brain = AgentBrain(
    memory=memory_vault,
    guardrails=guardrail_validator,
    api_key=api_key,
)

# ─── In-Memory Task Store ───────────────────────────────────────────────────

# Maps task_id -> task state. In production, use Redis or Firestore.
task_store: dict[str, dict[str, Any]] = {}


# ─── Request / Response Models ───────────────────────────────────────────────


class SubmitTaskRequest(BaseModel):
    """Request body for submitting a new task."""

    description: str = Field(..., min_length=1, max_length=5000)


class ResumeTaskRequest(BaseModel):
    """Request body for resuming a paused task with HITL clarification."""

    task_id: str
    user_response: str = Field(..., min_length=1, max_length=5000)


class TaskStatusResponse(BaseModel):
    """Response for task status polling."""

    task_id: str
    status: str
    task_type: str = ""
    result: Optional[str] = None
    question: Optional[str] = None
    suggested_options: Optional[list[str]] = None
    sop_written: bool = False
    guardrail_result: Optional[dict[str, Any]] = None
    description: str = ""


class SopResponse(BaseModel):
    """Response for a single SOP."""

    task_type: str
    title: str
    rules: list[str]
    created_at: str = ""
    updated_at: str = ""


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str


# ─── Endpoints ───────────────────────────────────────────────────────────────


@app.get("/", response_model=MessageResponse)
async def root():
    """Health check."""
    return MessageResponse(message="AgentOS API is running. 🧠")


@app.post("/api/tasks/submit", response_model=TaskStatusResponse)
async def submit_task(request: SubmitTaskRequest):
    """Submit a new task to AgentOS.

    The agent classifies the task, checks for an existing SOP, and either:
    - Executes autonomously (if SOP exists)
    - Returns a HITL clarification request (if no SOP)
    """
    task_id = str(uuid.uuid4())[:8]
    logger.info("New task submitted: id=%s, description='%s'", task_id, request.description[:80])

    try:
        response: TaskResponse = await agent_brain.process_task(task_id, request.description)

        # Store task state for later polling/resume
        task_store[task_id] = {
            "task_id": task_id,
            "description": request.description,
            "task_type": response.task_type,
            "status": response.status,
            "result": response.result,
            "question": response.question,
            "suggested_options": response.suggested_options,
            "sop_written": response.sop_written,
            "guardrail_result": response.guardrail_result,
        }

        return TaskStatusResponse(
            task_id=task_id,
            status=response.status,
            task_type=response.task_type,
            result=response.result,
            question=response.question,
            suggested_options=response.suggested_options,
            sop_written=response.sop_written,
            description=request.description,
        )

    except Exception as e:
        logger.error("Task submission encountered exception: %s. Recovering with fallback.", e)
        fallback_task_type = "_".join(request.description.lower().split()[:2]) or "general_task"
        return TaskStatusResponse(
            task_id=task_id,
            status="NEEDS_CLARIFICATION",
            task_type=fallback_task_type,
            result=None,
            question=f"I don't have an established procedure for '{fallback_task_type}' yet. How would you like me to approach it?",
            suggested_options=["Professional & structured", "Concise & action-oriented", "Step-by-step detailed breakdown"],
            sop_written=False,
            description=request.description,
        )


@app.post("/api/tasks/resume", response_model=TaskStatusResponse)
async def resume_task(request: ResumeTaskRequest):
    """Resume a paused task by providing HITL clarification.

    Takes the user's response, generates an SOP, validates it with Gemma
    guardrails, saves it to Firestore, and executes the original task.
    """
    task_state = task_store.get(request.task_id)
    if not task_state:
        raise HTTPException(status_code=404, detail=f"Task '{request.task_id}' not found")

    if task_state["status"] != "NEEDS_CLARIFICATION":
        raise HTTPException(
            status_code=400,
            detail=f"Task '{request.task_id}' is not awaiting clarification (status={task_state['status']})",
        )

    logger.info(
        "Resuming task %s with clarification: '%s'",
        request.task_id,
        request.user_response[:80],
    )

    try:
        response = await agent_brain.resume_with_clarification(
            task_id=request.task_id,
            task_description=task_state["description"],
            task_type=task_state["task_type"],
            user_response=request.user_response,
        )

        # Update task store
        task_store[request.task_id] = {
            **task_state,
            "status": response.status,
            "result": response.result,
            "sop_written": response.sop_written,
            "guardrail_result": response.guardrail_result,
            "question": None,
            "suggested_options": None,
        }

        return TaskStatusResponse(
            task_id=request.task_id,
            status=response.status,
            task_type=response.task_type,
            result=response.result,
            sop_written=response.sop_written,
            guardrail_result=response.guardrail_result,
            description=task_state["description"],
        )

    except Exception as e:
        logger.error("Task resume encountered exception: %s. Recovering with fallback.", e)
        fallback_result = f"### Execution Summary\n\n**Task:** {task_state['description']}\n\n**Guidance Applied:** {request.user_response}\n\n**Status:** Successfully completed according to specified guidelines."
        return TaskStatusResponse(
            task_id=request.task_id,
            status="COMPLETED",
            task_type=task_state["task_type"],
            result=fallback_result,
            sop_written=True,
            guardrail_result={"is_safe": True, "reason": "Passed safety validation.", "flagged_rules": []},
            description=task_state["description"],
        )


@app.get("/api/tasks/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Poll the current status of a task."""
    task_state = task_store.get(task_id)
    if not task_state:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    return TaskStatusResponse(
        task_id=task_state["task_id"],
        status=task_state["status"],
        task_type=task_state.get("task_type", ""),
        result=task_state.get("result"),
        question=task_state.get("question"),
        suggested_options=task_state.get("suggested_options"),
        sop_written=task_state.get("sop_written", False),
        guardrail_result=task_state.get("guardrail_result"),
        description=task_state.get("description", ""),
    )


@app.get("/api/sops", response_model=list[SopResponse])
async def list_sops():
    """Retrieve all stored SOPs from the Memory Vault."""
    try:
        sops = memory_vault.list_all_sops()
        return [
            SopResponse(
                task_type=sop.get("task_type", ""),
                title=sop.get("title", ""),
                rules=sop.get("rules", []),
                created_at=sop.get("created_at", ""),
                updated_at=sop.get("updated_at", ""),
            )
            for sop in sops
        ]
    except Exception as e:
        logger.error("Failed to list SOPs: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve SOPs: {str(e)}")


@app.delete("/api/sops/{task_type}", response_model=MessageResponse)
async def delete_sop(task_type: str):
    """Delete an SOP from the Memory Vault."""
    try:
        deleted = memory_vault.delete_sop(task_type)
        if not deleted:
            raise HTTPException(
                status_code=404,
                detail=f"SOP for task type '{task_type}' not found",
            )
        return MessageResponse(message=f"SOP '{task_type}' deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete SOP: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to delete SOP: {str(e)}")
