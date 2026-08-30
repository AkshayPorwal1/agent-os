import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskResponse } from '../../models/agent.model';

@Component({
  selector: 'app-task-activity',
  standalone: true,
  imports: [CommonModule],
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
        <h2>Activity &amp; Completed Deliverables</h2>
        <span class="task-count" *ngIf="tasks.length">{{ tasks.length }}</span>
      </div>

      <div class="empty-state" *ngIf="tasks.length === 0">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
               stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </div>
        <p class="empty-text">No tasks executed yet. Choose a prompt above or type your own task!</p>
      </div>

      <div class="task-list">
        <div
          class="task-card"
          *ngFor="let task of tasks; trackBy: trackByTaskId"
          [class.completed]="task.status === 'COMPLETED'"
          [class.in-progress]="task.status !== 'COMPLETED'"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">{{ task.status === 'COMPLETED' ? 'Completed' : 'Working...' }}</span>
              <span class="domain-tag" [class.personal]="isPersonalTask(task.description)">
                {{ isPersonalTask(task.description) ? '🏠 Personal' : '💼 Work' }}
              </span>
            </div>
            <button
              class="copy-btn"
              *ngIf="task.result"
              (click)="copyResult(task.result, $event)"
              title="Copy Output"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Copy Output</span>
            </button>
          </div>

          <!-- Prompt Question / Description -->
          <h3 class="task-prompt">{{ task.description }}</h3>

          <!-- Result Viewer -->
          <div class="result-box" *ngIf="task.result">
            <pre class="result-text">{{ task.result }}</pre>
          </div>

          <!-- Processing State -->
          <div class="working-box" *ngIf="task.status !== 'COMPLETED' && !task.result">
            <span class="pulse-spinner"></span>
            <span>AgentOS is executing and organizing your output...</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .task-activity {
      background: rgba(22, 20, 36, 0.85);
      border: 1px solid rgba(139, 92, 246, 0.15);
      border-radius: 16px;
      padding: 24px 28px;
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
      background: rgba(139, 92, 246, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a78bfa;
    }

    h2 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .task-count {
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: auto;
    }

    .empty-state {
      text-align: center;
      padding: 36px 20px;
      color: #64748b;
    }

    .empty-icon {
      margin-bottom: 12px;
      opacity: 0.4;
    }

    .empty-text {
      font-size: 0.9rem;
      margin: 0;
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .task-card {
      background: rgba(15, 13, 25, 0.9);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
    }

    .task-card.completed {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }

    .task-card.in-progress .status-dot {
      background: #f59e0b;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
    }

    .status-text {
      font-size: 0.8rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .domain-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
      padding: 1px 7px;
      border-radius: 6px;
    }

    .domain-tag.personal {
      color: #34d399;
      background: rgba(52, 211, 153, 0.1);
      border-color: rgba(52, 211, 153, 0.2);
    }

    .copy-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 0.78rem;
      padding: 4px 10px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .copy-btn:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.4);
      color: #ffffff;
    }

    .task-prompt {
      font-size: 1rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 0 0 14px 0;
      line-height: 1.4;
    }

    .result-box {
      background: rgba(10, 8, 18, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
    }

    .result-text {
      font-family: inherit;
      font-size: 0.92rem;
      line-height: 1.65;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
    }

    .working-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 0.88rem;
    }

    .pulse-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(139, 92, 246, 0.3);
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class TaskActivityComponent {
  @Input() tasks: TaskResponse[] = [];

  trackByTaskId(index: number, task: TaskResponse): string {
    return task.task_id;
  }

  isPersonalTask(desc: string): boolean {
    const text = (desc || '').toLowerCase();
    return text.includes('trip') || text.includes('travel') || text.includes('meal') ||
           text.includes('food') || text.includes('diet') || text.includes('workout') ||
           text.includes('gym') || text.includes('fitness') || text.includes('budget') ||
           text.includes('vacation') || text.includes('personal') || text.includes('habit');
  }

  copyResult(text: string, event: Event): void {
    const btn = event.currentTarget as HTMLElement;
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>Copied!</span>';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 1800);
    });
  }
}
