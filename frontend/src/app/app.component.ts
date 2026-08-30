import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandCenterComponent } from './components/command-center/command-center.component';
import { TaskActivityComponent } from './components/task-activity/task-activity.component';
import { MemoryVaultComponent } from './components/memory-vault/memory-vault.component';
import { AgentService } from './services/agent.service';
import { TaskResponse } from './models/agent.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    CommandCenterComponent,
    TaskActivityComponent,
    MemoryVaultComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild(CommandCenterComponent) commandCenter!: CommandCenterComponent;
  @ViewChild(MemoryVaultComponent) memoryVault!: MemoryVaultComponent;

  tasks: (TaskResponse & { _customResponse?: string; _submitting?: boolean })[] = [];

  constructor(private agentService: AgentService) {}

  onTaskSubmitted(description: string): void {
    this.agentService.submitTask(description).subscribe({
      next: (response) => {
        this.tasks = [response, ...this.tasks];
        this.commandCenter.resetState();
      },
      error: (err) => {
        console.error('Task submission failed:', err);
        this.commandCenter.resetState();
      },
    });
  }

  onClarificationSubmitted(event: { taskId: string; response: string }): void {
    this.agentService
      .resumeTask(event.taskId, event.response)
      .subscribe({
        next: (response) => {
          // Update the task in-place
          const idx = this.tasks.findIndex((t) => t.task_id === event.taskId);
          if (idx !== -1) {
            this.tasks[idx] = {
              ...response,
              _customResponse: undefined,
              _submitting: false,
            };
            // Trigger change detection
            this.tasks = [...this.tasks];
          }
          // Refresh Memory Vault if a new SOP was written
          if (response.sop_written) {
            this.memoryVault.loadSops();
          }
        },
        error: (err) => {
          console.error('Clarification submission failed:', err);
          const idx = this.tasks.findIndex((t) => t.task_id === event.taskId);
          if (idx !== -1) {
            this.tasks[idx]._submitting = false;
            this.tasks = [...this.tasks];
          }
        },
      });
  }
}
