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
          <h2>Learned Skills &amp; Memory</h2>
          <p class="subtitle">Skills and formatting preferences automatically remembered by AgentOS</p>
        </div>
        <button class="refresh-btn" (click)="loadSops()" [disabled]="isLoading" title="Refresh Skills">
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
        <p class="empty-desc">No skills saved yet. As you run tasks, AgentOS learns and saves them here.</p>
      </div>

      <div class="sop-grid" *ngIf="sops.length > 0">
        <div class="sop-card" *ngFor="let sop of sops; trackBy: trackBySopType">
          <div class="sop-card-header">
            <h3>{{ sop.title }}</h3>
            <button
              class="delete-btn"
              (click)="confirmDelete(sop)"
              [disabled]="sop === deletingSop"
              title="Remove Skill"
            >
              <svg *ngIf="sop !== deletingSop" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span *ngIf="sop === deletingSop" class="spinner"></span>
            </button>
          </div>

          <ul class="rules-list">
            <li class="rule" *ngFor="let rule of sop.rules">
              {{ rule }}
            </li>
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .memory-vault {
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
      flex-shrink: 0;
    }

    h2 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 2px 0;
    }

    .subtitle {
      font-size: 0.83rem;
      color: #94a3b8;
      margin: 0;
    }

    .refresh-btn {
      margin-left: auto;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.4);
      color: #f1f5f9;
    }

    .spinning {
      animation: spin 0.8s linear infinite;
    }

    .empty-state {
      text-align: center;
      padding: 30px 20px;
      color: #64748b;
    }

    .empty-desc {
      font-size: 0.88rem;
      margin: 0;
    }

    .sop-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }

    .sop-card {
      background: rgba(15, 13, 25, 0.8);
      border: 1px solid rgba(139, 92, 246, 0.18);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
    }

    .sop-card:hover {
      border-color: rgba(139, 92, 246, 0.4);
      transform: translateY(-1px);
    }

    .sop-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    h3 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 0;
      line-height: 1.3;
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    .delete-btn:hover:not(:disabled) {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .rules-list {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .rule {
      font-size: 0.83rem;
      color: #cbd5e1;
      line-height: 1.4;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(239, 68, 68, 0.3);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
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

  loadSops(): void {
    this.isLoading = true;
    this.agentService.listSops().subscribe({
      next: (sops: SopItem[]) => {
        this.sops = sops;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  confirmDelete(sop: SopItem): void {
    this.deletingSop = sop;
    this.agentService.deleteSop(sop.task_type).subscribe({
      next: () => {
        this.sops = this.sops.filter(s => s.task_type !== sop.task_type);
        this.deletingSop = null;
      },
      error: () => {
        this.deletingSop = null;
      }
    });
  }

  trackBySopType(index: number, sop: SopItem): string {
    return sop.task_type;
  }
}
