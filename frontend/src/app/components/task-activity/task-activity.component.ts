import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskResponse, TaskStatusType } from '../../models/agent.model';

@Component({
  selector: 'app-task-activity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="task-activity">
      <div class="section-header">
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <h2>Task Stream</h2>
        <span class="task-count" *ngIf="tasks.length">{{ tasks.length }}</span>
      </div>

      <div class="empty-state" *ngIf="tasks.length === 0">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
             stroke-linejoin="round" style="opacity: 0.3">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        <p>No tasks yet. Submit a task from the Command Center above.</p>
      </div>

      <div class="task-list">
        <div
          class="task-card"
          *ngFor="let task of tasks; trackBy: trackByTaskId"
          [class.needs-clarification]="task.status === 'NEEDS_CLARIFICATION'"
          [class.completed]="task.status === 'COMPLETED'"
          [class.failed]="task.status === 'FAILED'"
          [class.executing]="task.status === 'EXECUTING'"
        >
          <!-- Status Badge -->
          <div class="card-header">
            <span class="status-badge" [class]="task.status.toLowerCase()">
              <span class="status-dot"></span>
              {{ formatStatus(task.status) }}
            </span>
            <span class="task-id">{{ task.task_id }}</span>
          </div>

          <!-- Task Description -->
          <p class="task-desc">{{ task.description }}</p>

          <!-- Task Type -->
          <div class="task-type-badge" *ngIf="task.task_type">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            {{ task.task_type }}
          </div>

          <!-- HITL Panel -->
          <div class="hitl-panel" *ngIf="task.status === 'NEEDS_CLARIFICATION'">
            <div class="hitl-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Agent needs your guidance</span>
            </div>
            <p class="hitl-question">{{ task.question }}</p>

            <!-- Suggestion Chips -->
            <div class="chips" *ngIf="task.suggested_options?.length">
              <button
                class="chip"
                *ngFor="let option of task.suggested_options"
                (click)="selectChip(task, option)"
                [disabled]="!!task._submitting"
              >
                {{ option }}
              </button>
            </div>

            <!-- Custom Response Input -->
            <div class="custom-response">
              <input
                type="text"
                class="response-input"
                [(ngModel)]="task._customResponse"
                [attr.name]="'response-' + task.task_id"
                placeholder="Or type your own guidance..."
                [disabled]="!!task._submitting"
                (keyup.enter)="submitResponse(task)"
              />
              <button
                class="confirm-btn"
                (click)="submitResponse(task)"
                [disabled]="!task._customResponse?.trim() || !!task._submitting"
              >
                <span *ngIf="!task._submitting">Confirm</span>
                <span *ngIf="task._submitting" class="spinner"></span>
              </button>
            </div>
          </div>

          <!-- SOP Written Badge -->
          <div class="sop-badge" *ngIf="task.sop_written">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            New SOP created &amp; saved to Memory Vault
          </div>

          <!-- Result -->
          <div class="result" *ngIf="task.result && task.status !== 'NEEDS_CLARIFICATION'">
            <div class="result-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Result
            </div>
            <pre class="result-text">{{ task.result }}</pre>
          </div>

          <!-- Guardrail Rejection -->
          <div class="guardrail-rejection" *ngIf="task.status === 'FAILED' && task.guardrail_result && !task.guardrail_result.is_safe">
            <div class="rejection-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Guardrail Rejection
            </div>
            <p>{{ task.guardrail_result.reason }}</p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .task-activity {
      background: linear-gradient(135deg, rgba(30, 27, 46, 0.95), rgba(20, 18, 35, 0.98));
      border: 1px solid rgba(139, 92, 246, 0.15);
      border-radius: 16px;
      padding: 28px 32px;
      backdrop-filter: blur(20px);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .header-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #60a5fa;
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #f1f0f5;
    }

    .task-count {
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: rgba(161, 161, 170, 0.6);
      font-size: 0.88rem;
    }

    .empty-state p { margin-top: 12px; }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .task-card {
      background: rgba(15, 13, 28, 0.6);
      border: 1px solid rgba(63, 63, 70, 0.3);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .task-card.needs-clarification {
      border-color: rgba(251, 191, 36, 0.3);
      box-shadow: 0 0 20px rgba(251, 191, 36, 0.05);
    }

    .task-card.completed {
      border-color: rgba(34, 197, 94, 0.3);
    }

    .task-card.failed {
      border-color: rgba(239, 68, 68, 0.3);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .needs_clarification {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }
    .needs_clarification .status-dot {
      background: #fbbf24;
      animation: pulse 2s ease-in-out infinite;
    }

    .completed {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }
    .completed .status-dot { background: #22c55e; }

    .failed {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    .failed .status-dot { background: #ef4444; }

    .executing {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }
    .executing .status-dot {
      background: #3b82f6;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.5); }
    }

    .task-id {
      font-size: 0.72rem;
      color: rgba(161, 161, 170, 0.5);
      font-family: 'JetBrains Mono', monospace;
    }

    .task-desc {
      color: #d4d4d8;
      font-size: 0.9rem;
      margin: 0 0 10px;
      line-height: 1.5;
    }

    .task-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 6px;
      font-size: 0.72rem;
      color: #a78bfa;
      margin-bottom: 14px;
      font-family: 'JetBrains Mono', monospace;
    }

    /* ─── HITL Panel ─── */

    .hitl-panel {
      background: rgba(251, 191, 36, 0.05);
      border: 1px solid rgba(251, 191, 36, 0.15);
      border-radius: 10px;
      padding: 18px;
      margin-top: 6px;
    }

    .hitl-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fbbf24;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .hitl-question {
      color: #e4e4e7;
      font-size: 0.88rem;
      margin: 0 0 14px;
      line-height: 1.5;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .chip {
      padding: 7px 16px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.25);
      border-radius: 20px;
      color: #fcd34d;
      font-size: 0.8rem;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .chip:hover:not(:disabled) {
      background: rgba(251, 191, 36, 0.2);
      border-color: rgba(251, 191, 36, 0.4);
      transform: translateY(-1px);
    }

    .chip:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .custom-response {
      display: flex;
      gap: 8px;
    }

    .response-input {
      flex: 1;
      padding: 10px 14px;
      background: rgba(15, 13, 28, 0.7);
      border: 1px solid rgba(251, 191, 36, 0.15);
      border-radius: 8px;
      color: #e4e4e7;
      font-size: 0.85rem;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 0.2s;
    }

    .response-input:focus {
      border-color: rgba(251, 191, 36, 0.4);
    }

    .response-input::placeholder {
      color: rgba(161, 161, 170, 0.4);
    }

    .confirm-btn {
      padding: 10px 20px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #1a1a2e;
      border: none;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .confirm-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }

    .confirm-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ─── SOP Badge ─── */

    .sop-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 8px;
      font-size: 0.78rem;
      color: #22c55e;
      margin-top: 12px;
    }

    /* ─── Result ─── */

    .result {
      margin-top: 14px;
      background: rgba(34, 197, 94, 0.05);
      border: 1px solid rgba(34, 197, 94, 0.15);
      border-radius: 10px;
      padding: 14px 16px;
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #22c55e;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .result-text {
      color: #d4d4d8;
      font-size: 0.84rem;
      line-height: 1.6;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Inter', sans-serif;
      max-height: 300px;
      overflow-y: auto;
    }

    /* ─── Guardrail Rejection ─── */

    .guardrail-rejection {
      margin-top: 14px;
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      padding: 14px 16px;
    }

    .rejection-header {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #ef4444;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .guardrail-rejection p {
      color: #fca5a5;
      font-size: 0.84rem;
      margin: 0;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(26, 26, 46, 0.3);
      border-top-color: #1a1a2e;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class TaskActivityComponent {
  @Input() tasks: (TaskResponse & { _customResponse?: string; _submitting?: boolean })[] = [];
  @Output() clarificationSubmitted = new EventEmitter<{
    taskId: string;
    response: string;
  }>();

  trackByTaskId(index: number, task: TaskResponse): string {
    return task.task_id;
  }

  formatStatus(status: TaskStatusType | string): string {
    const map: Record<string, string> = {
      NEEDS_CLARIFICATION: 'Paused — Needs Guidance',
      EXECUTING: 'Executing',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
      PENDING: 'Pending',
    };
    return map[status] || status;
  }

  selectChip(task: TaskResponse & { _customResponse?: string }, option: string): void {
    task._customResponse = option;
    this.submitResponse(task);
  }

  submitResponse(task: TaskResponse & { _customResponse?: string; _submitting?: boolean }): void {
    const response = task._customResponse?.trim();
    if (!response) return;

    task._submitting = true;
    this.clarificationSubmitted.emit({
      taskId: task.task_id,
      response,
    });
  }
}
