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
          <h2>Command Center</h2>
          <p class="subtitle">Give AgentOS any task — it will learn how to handle it.</p>
        </div>
      </div>

      <form class="command-input-wrapper" (ngSubmit)="onSubmit()">
        <div class="input-container" [class.focused]="isFocused">
          <input
            type="text"
            class="command-input"
            [(ngModel)]="taskDescription"
            name="task"
            placeholder="e.g., Write a professional email to my team about Q3 results..."
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
              Execute
            </span>
            <span *ngIf="isLoading" class="btn-content">
              <span class="spinner"></span>
              Processing
            </span>
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .command-center {
      background: linear-gradient(135deg, rgba(30, 27, 46, 0.95), rgba(20, 18, 35, 0.98));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 28px 32px;
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
      margin-bottom: 20px;
    }

    .header-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a78bfa;
    }

    h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: #f1f0f5;
      letter-spacing: -0.01em;
    }

    .subtitle {
      margin: 2px 0 0;
      font-size: 0.82rem;
      color: rgba(161, 161, 170, 0.8);
    }

    .command-input-wrapper {
      display: flex;
    }

    .input-container {
      display: flex;
      width: 100%;
      background: rgba(15, 13, 28, 0.7);
      border: 1px solid rgba(139, 92, 246, 0.15);
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .input-container.focused {
      border-color: rgba(139, 92, 246, 0.5);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1), 0 0 20px rgba(139, 92, 246, 0.05);
    }

    .command-input {
      flex: 1;
      padding: 14px 18px;
      background: transparent;
      border: none;
      outline: none;
      color: #e4e4e7;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
    }

    .command-input::placeholder {
      color: rgba(161, 161, 170, 0.5);
    }

    .command-input:disabled {
      opacity: 0.5;
    }

    .submit-btn {
      padding: 10px 22px;
      margin: 6px;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }

    .submit-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class CommandCenterComponent {
  @Output() taskSubmitted = new EventEmitter<string>();

  taskDescription = '';
  isFocused = false;
  isLoading = false;

  onSubmit(): void {
    const desc = this.taskDescription.trim();
    if (!desc) return;

    this.isLoading = true;
    this.taskSubmitted.emit(desc);
  }

  /** Called by parent when task submission completes. */
  resetState(): void {
    this.taskDescription = '';
    this.isLoading = false;
  }
}
