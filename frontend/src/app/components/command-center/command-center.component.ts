import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="command-center">
      <div class="command-header">
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div>
          <h2>What would you like to accomplish?</h2>
          <p class="subtitle">Ask a question, request a draft, analyze information, or give any task.</p>
        </div>
      </div>

      <form class="command-input-wrapper" (ngSubmit)="onSubmit()">
        <div class="input-container" [class.focused]="isFocused">
          <input
            type="text"
            class="command-input"
            [(ngModel)]="taskDescription"
            name="task"
            placeholder="Type your task here (e.g., Write a memo about quarterly milestones)..."
            (focus)="isFocused = true"
            (blur)="isFocused = false"
            [disabled]="isLoading"
            autocomplete="off"
          />
          <button
            type="submit"
            class="submit-btn"
            [disabled]="!taskDescription.trim() || isLoading"
          >
            <span *ngIf="!isLoading" class="btn-content">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Run Task
            </span>
            <span *ngIf="isLoading" class="btn-content">
              <span class="spinner"></span>
              Working...
            </span>
          </button>
        </div>
      </form>

      <!-- Quick Suggestion Prompts -->
      <div class="quick-prompts">
        <span class="quick-label">Try:</span>
        <button
          type="button"
          class="prompt-pill"
          *ngFor="let p of quickPrompts"
          (click)="setPrompt(p)"
          [disabled]="isLoading"
        >
          {{ p }}
        </button>
      </div>
    </section>
  `,
  styles: [`
    .command-center {
      background: linear-gradient(135deg, rgba(30, 27, 46, 0.95), rgba(20, 18, 35, 0.98));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 24px 28px;
      backdrop-filter: blur(20px);
      position: relative;
      overflow: hidden;
    }

    .command-center::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
    }

    .command-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }

    .header-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a78bfa;
      flex-shrink: 0;
    }

    h2 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 2px 0;
    }

    .subtitle {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0;
    }

    .command-input-wrapper {
      margin-bottom: 14px;
    }

    .input-container {
      display: flex;
      align-items: center;
      background: rgba(15, 13, 25, 0.9);
      border: 1.5px solid rgba(139, 92, 246, 0.25);
      border-radius: 12px;
      padding: 5px 6px 5px 18px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .input-container.focused {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2), 0 0 20px rgba(139, 92, 246, 0.15);
    }

    .command-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f8fafc;
      font-size: 0.95rem;
      font-family: inherit;
    }

    .command-input::placeholder {
      color: #64748b;
    }

    .command-input:disabled {
      opacity: 0.5;
    }

    .submit-btn {
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #9333ea, #7c3aed);
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
      transform: translateY(-1px);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-content {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .quick-prompts {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .quick-label {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 500;
    }

    .prompt-pill {
      background: rgba(139, 92, 246, 0.08);
      border: 1px solid rgba(139, 92, 246, 0.18);
      color: #cbd5e1;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .prompt-pill:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.4);
      color: #f1f5f9;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class CommandCenterComponent {
  @Output() taskSubmitted = new EventEmitter<string>();

  taskDescription = '';
  isFocused = false;
  isLoading = false;

  quickPrompts = [
    'Write a memo about quarterly sprint milestones',
    'Draft a friendly email announcing a new feature launch',
    'Summarize the top 3 best practices for cloud security',
    'Create an actionable 5-step checklist for team onboarding',
  ];

  onSubmit(): void {
    const trimmed = this.taskDescription.trim();
    if (!trimmed || this.isLoading) return;
    this.isLoading = true;
    this.taskSubmitted.emit(trimmed);
    this.taskDescription = '';
  }

  resetState(): void {
    this.isLoading = false;
  }

  setPrompt(p: string): void {
    this.taskDescription = p;
    this.onSubmit();
  }
}
