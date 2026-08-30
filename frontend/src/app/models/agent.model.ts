/**
 * AgentOS TypeScript Models
 *
 * Shared interfaces for the Angular frontend matching the FastAPI backend schemas.
 */

/** Request body for submitting a new task. */
export interface TaskRequest {
  description: string;
}

/** Request body for resuming a paused task with HITL clarification. */
export interface ResumeRequest {
  task_id: string;
  user_response: string;
}

/** Response from task submission, resume, and status polling. */
export interface TaskResponse {
  task_id: string;
  status: TaskStatusType;
  task_type: string;
  result: string | null;
  question: string | null;
  suggested_options: string[] | null;
  sop_written: boolean;
  guardrail_result: GuardrailResult | null;
  description: string;
}

/** A stored Standard Operating Procedure. */
export interface SopItem {
  task_type: string;
  title: string;
  rules: string[];
  created_at: string;
  updated_at: string;
}

/** Result from the Gemma guardrail validator. */
export interface GuardrailResult {
  is_safe: boolean;
  reason: string;
  flagged_rules: number[];
}

/** Simple message response. */
export interface MessageResponse {
  message: string;
}

/** Task status type union. */
export type TaskStatusType =
  | 'EXECUTING'
  | 'NEEDS_CLARIFICATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING';
