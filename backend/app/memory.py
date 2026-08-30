"""
AgentOS Memory Vault — Firestore-backed 3-tier persistent memory.

Collections:
  - procedural_sops: Standard Operating Procedures learned from HITL interactions.
  - task_history: Episodic history of all task executions.
"""

from __future__ import annotations

import datetime
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class MemoryVault:
    """Firestore-backed memory vault for AgentOS.

    Manages two Firestore collections:
      • procedural_sops — Stores learned SOPs keyed by task_type.
      • task_history    — Stores episodic records of every task execution.
    """

    SOP_COLLECTION = "procedural_sops"
    HISTORY_COLLECTION = "task_history"

    def __init__(self, project: Optional[str] = None) -> None:
        """Initialize the Firestore client.

        Args:
            project: GCP project ID. If None, uses ADC / env default.
        """
        self._project = project
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self._in_memory_sops: dict[str, dict[str, Any]] = {
            "email_drafting": {
                "task_type": "email_drafting",
                "title": "Professional & Personal Email Drafting",
                "category": "work",
                "rules": [
                    "Tailor tone to recipient (executive for workplace, friendly for personal).",
                    "Include a clear subject line and concise executive summary.",
                    "Use structured bullet points for key details and next steps."
                ],
                "created_at": now,
                "updated_at": now,
            },
            "travel_itinerary_planning": {
                "task_type": "travel_itinerary_planning",
                "title": "Comprehensive Travel & Trip Itinerary",
                "category": "personal",
                "rules": [
                    "Organize schedule day-by-day with Morning, Afternoon, and Evening blocks.",
                    "Highlight local culinary recommendations and transit tips.",
                    "Include essential packing notes and reservation advice."
                ],
                "created_at": now,
                "updated_at": now,
            },
            "meal_nutrition_planning": {
                "task_type": "meal_nutrition_planning",
                "title": "Personal Nutrition & Meal Prep Planner",
                "category": "personal",
                "rules": [
                    "Outline daily meals (Breakfast, Lunch, Dinner, Snacks) with macro balance.",
                    "Include a consolidated grocery shopping checklist organized by aisle.",
                    "Provide time-saving batch cooking preparation tips."
                ],
                "created_at": now,
                "updated_at": now,
            },
            "project_roadmap_planning": {
                "task_type": "project_roadmap_planning",
                "title": "Strategic Project Roadmap & Execution",
                "category": "work",
                "rules": [
                    "Define key phases, milestone deliverables, and timeline estimates.",
                    "Identify cross-functional dependencies and potential risk mitigations.",
                    "Formulate quantifiable success metrics and OKRs."
                ],
                "created_at": now,
                "updated_at": now,
            }
        }
        self._in_memory_history: dict[str, dict[str, Any]] = {}
        self._use_in_memory = False

        try:
            from google.cloud import firestore
            self._db = firestore.Client(project=project)
            logger.info("MemoryVault initialized with Firestore (project=%s)", project or "default")
        except Exception as e:
            logger.warning("Firestore unavailable (%s). Falling back to in-memory vault.", e)
            self._db = None
            self._use_in_memory = True

    # ─── Procedural SOP Methods ──────────────────────────────────────────

    def get_sop(self, task_type: str) -> Optional[dict[str, Any]]:
        """Retrieve a single SOP by task_type.

        Args:
            task_type: The normalised task category key (e.g. "email_drafting").

        Returns:
            The SOP document as a dict, or None if not found.
        """
        if self._use_in_memory:
            return self._in_memory_sops.get(task_type)

        try:
            doc_ref = self._db.collection(self.SOP_COLLECTION).document(task_type)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["task_type"] = doc.id
                logger.info("SOP found for task_type=%s", task_type)
                return data
            logger.info("No SOP found for task_type=%s", task_type)
            return None
        except Exception as e:
            logger.error("Error retrieving SOP from Firestore: %s. Using in-memory store.", e)
            return self._in_memory_sops.get(task_type)

    def save_sop(
        self,
        task_type: str,
        title: str,
        rules: list[str],
    ) -> None:
        """Write or overwrite an SOP in Firestore.

        Args:
            task_type: The normalised task category key.
            title: Human-readable title for the SOP.
            rules: Ordered list of procedural rules/steps.
        """
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        sop_data = {
            "task_type": task_type,
            "title": title,
            "rules": rules,
            "created_at": now,
            "updated_at": now,
        }
        self._in_memory_sops[task_type] = sop_data

        if not self._use_in_memory and self._db:
            try:
                doc_ref = self._db.collection(self.SOP_COLLECTION).document(task_type)
                doc_ref.set(
                    {
                        "title": title,
                        "rules": rules,
                        "created_at": now,
                        "updated_at": now,
                    }
                )
                logger.info("SOP saved to Firestore: task_type=%s", task_type)
            except Exception as e:
                logger.error("Failed to write SOP to Firestore: %s", e)

    def list_all_sops(self) -> list[dict[str, Any]]:
        """Return every SOP in the procedural_sops collection.

        Returns:
            A list of SOP dicts, each including 'task_type' from the doc ID.
        """
        if self._use_in_memory or not self._db:
            return list(self._in_memory_sops.values())

        try:
            sops: list[dict[str, Any]] = []
            for doc in self._db.collection(self.SOP_COLLECTION).stream():
                data = doc.to_dict()
                data["task_type"] = doc.id
                sops.append(data)
            logger.info("Listed %d SOPs from Firestore", len(sops))
            return sops
        except Exception as e:
            logger.error("Error listing SOPs from Firestore: %s. Returning in-memory.", e)
            return list(self._in_memory_sops.values())

    def delete_sop(self, task_type: str) -> bool:
        """Delete an SOP by task_type.

        Args:
            task_type: The normalised task category key.

        Returns:
            True if the document existed and was deleted, False otherwise.
        """
        existed_in_mem = self._in_memory_sops.pop(task_type, None) is not None

        if self._use_in_memory or not self._db:
            return existed_in_mem

        try:
            doc_ref = self._db.collection(self.SOP_COLLECTION).document(task_type)
            doc = doc_ref.get()
            if doc.exists:
                doc_ref.delete()
                logger.info("SOP deleted from Firestore: task_type=%s", task_type)
                return True
            return existed_in_mem
        except Exception as e:
            logger.error("Error deleting SOP from Firestore: %s", e)
            return existed_in_mem

    # ─── Episodic Task History ───────────────────────────────────────────

    def record_task_history(
        self,
        task_id: str,
        status: str,
        result: str,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Record a task execution event in episodic history.

        Args:
            task_id: Unique identifier for the task.
            status: Final status (e.g. "COMPLETED", "FAILED").
            result: Human-readable result summary.
            details: Optional extra metadata.
        """
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        entry = {
            "status": status,
            "result": result,
            "details": details or {},
            "timestamp": now,
        }
        self._in_memory_history[task_id] = entry

        if not self._use_in_memory and self._db:
            try:
                doc_ref = self._db.collection(self.HISTORY_COLLECTION).document(task_id)
                doc_ref.set(entry)
                logger.info("Task history recorded in Firestore: task_id=%s", task_id)
            except Exception as e:
                logger.error("Failed to record history to Firestore: %s", e)
