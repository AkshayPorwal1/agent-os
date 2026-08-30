import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SopItem } from '../../models/agent.model';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-memory-vault',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="memory-vault">
      <div class="section-header">
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div>
          <h2>Memory Vault</h2>
          <p class="subtitle">Learned Standard Operating Procedures</p>
        </div>
        <button class="refresh-btn" (click)="loadSops()" [disabled]="isLoading">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round" [class.spinning]="isLoading">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      <div class="empty-state" *ngIf="!isLoading && sops.length === 0">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"
               stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>
        <p class="empty-title">No SOPs learned yet</p>
        <p class="empty-desc">Submit a task and teach AgentOS how to handle it. The learned procedure will appear here.</p>
      </div>

      <div class="sop-grid" *ngIf="sops.length > 0">
        <div class="sop-card" *ngFor="let sop of sops; trackBy: trackBySopType">
          <div class="sop-card-header">
            <div class="sop-title-area">
              <h3>{{ sop.title }}</h3>
              <span class="sop-type">{{ sop.task_type }}</span>
            </div>
            <button
              class="delete-btn"
              (click)="confirmDelete(sop)"
              [disabled]="sop === deletingSop"
              title="Delete SOP"
            >
              <svg *ngIf="sop !== deletingSop" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span *ngIf="sop === deletingSop" class="spinner"></span>
            </button>
          </div>

          <div class="rules-list">
            <div class="rule" *ngFor="let rule of sop.rules; let i = index">
              <span class="rule-number">{{ i + 1 }}</span>
              <span class="rule-text">{{ rule }}</span>
            </div>
          </div>

          <div class="sop-meta">
            <span class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ formatDate(sop.created_at) }}
            </span>
            <span class="meta-item">{{ sop.rules.length }} rules</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .memory-vault {
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
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(34, 197, 94, 0.2));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #34d399;
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #f1f0f5;
    }

    .subtitle {
      margin: 1px 0 0;
      font-size: 0.75rem;
      color: rgba(161, 161, 170, 0.7);
    }

    .refresh-btn {
      margin-left: auto;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      color: #34d399;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .refresh-btn:hover:not(:disabled) {
      background: rgba(34, 197, 94, 0.2);
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ─── Empty State ─── */

    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }

    .empty-icon {
      color: rgba(161, 161, 170, 0.25);
      margin-bottom: 14px;
    }

    .empty-title {
      color: rgba(161, 161, 170, 0.7);
      font-size: 0.95rem;
      font-weight: 500;
      margin: 0 0 6px;
    }

    .empty-desc {
      color: rgba(161, 161, 170, 0.5);
      font-size: 0.82rem;
      margin: 0;
      max-width: 360px;
      margin: 0 auto;
      line-height: 1.5;
    }

    /* ─── SOP Grid ─── */

    .sop-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 14px;
    }

    .sop-card {
      background: rgba(15, 13, 28, 0.6);
      border: 1px solid rgba(34, 197, 94, 0.15);
      border-radius: 12px;
      padding: 18px;
      transition: all 0.3s ease;
    }

    .sop-card:hover {
      border-color: rgba(34, 197, 94, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(34, 197, 94, 0.08);
    }

    .sop-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .sop-title-area h3 {
      margin: 0 0 4px;
      font-size: 0.92rem;
      font-weight: 600;
      color: #f1f0f5;
    }

    .sop-type {
      font-size: 0.7rem;
      color: #a78bfa;
      font-family: 'JetBrains Mono', monospace;
      background: rgba(139, 92, 246, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .delete-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.15);
      color: #ef4444;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .delete-btn:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.3);
    }

    /* ─── Rules ─── */

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .rule {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .rule-number {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(34, 197, 94, 0.15);
      color: #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
      margin-top: 1px;
    }

    .rule-text {
      color: #d4d4d8;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    /* ─── Meta ─── */

    .sop-meta {
      display: flex;
      gap: 14px;
      border-top: 1px solid rgba(63, 63, 70, 0.2);
      padding-top: 10px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      color: rgba(161, 161, 170, 0.5);
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(239, 68, 68, 0.3);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `],
})
export class MemoryVaultComponent implements OnInit, OnDestroy {
  sops: SopItem[] = [];
  isLoading = false;
  deletingSop: SopItem | null = null;

  private destroy$ = new Subject<void>();

  constructor(private agentService: AgentService) {}

  ngOnInit(): void {
    this.loadSops();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackBySopType(index: number, sop: SopItem): string {
    return sop.task_type;
  }

  loadSops(): void {
    this.isLoading = true;
    this.agentService
      .listSops()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sops) => {
          this.sops = sops;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load SOPs:', err);
          this.isLoading = false;
        },
      });
  }

  confirmDelete(sop: SopItem): void {
    this.deletingSop = sop;
    this.agentService
      .deleteSop(sop.task_type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sops = this.sops.filter((s) => s.task_type !== sop.task_type);
          this.deletingSop = null;
        },
        error: (err) => {
          console.error('Failed to delete SOP:', err);
          this.deletingSop = null;
        },
      });
  }

  formatDate(iso: string): string {
    if (!iso) return 'Unknown';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }
}
