import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, takeWhile, map, shareReplay } from 'rxjs';
import {
  TaskRequest,
  TaskResponse,
  ResumeRequest,
  SopItem,
  MessageResponse,
} from '../models/agent.model';

/**
 * AgentOS Angular Service
 *
 * Provides full REST integration with the FastAPI backend,
 * including RxJS polling helpers for task status tracking.
 */
@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly apiBase = '/api';

  constructor(private http: HttpClient) {}

  /**
   * Submit a new task to AgentOS.
   */
  submitTask(description: string): Observable<TaskResponse> {
    const body: TaskRequest = { description };
    return this.http.post<TaskResponse>(`${this.apiBase}/tasks/submit`, body);
  }

  /**
   * Resume a paused task with HITL clarification.
   */
  resumeTask(taskId: string, userResponse: string): Observable<TaskResponse> {
    const body: ResumeRequest = {
      task_id: taskId,
      user_response: userResponse,
    };
    return this.http.post<TaskResponse>(`${this.apiBase}/tasks/resume`, body);
  }

  /**
   * Get the current status of a task.
   */
  getTaskStatus(taskId: string): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(
      `${this.apiBase}/tasks/status/${taskId}`
    );
  }

  /**
   * Poll task status at a fixed interval until it reaches a terminal state.
   * Emits each intermediate status update.
   *
   * @param taskId - The task to poll
   * @param intervalMs - Polling interval in milliseconds (default 2000)
   */
  pollTaskStatus(
    taskId: string,
    intervalMs = 2000
  ): Observable<TaskResponse> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getTaskStatus(taskId)),
      takeWhile(
        (response) =>
          response.status !== 'COMPLETED' && response.status !== 'FAILED',
        true // include the terminal emission
      ),
      shareReplay(1)
    );
  }

  /**
   * List all stored SOPs from the Memory Vault.
   */
  listSops(): Observable<SopItem[]> {
    return this.http.get<SopItem[]>(`${this.apiBase}/sops`);
  }

  /**
   * Delete an SOP from the Memory Vault.
   */
  deleteSop(taskType: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(
      `${this.apiBase}/sops/${encodeURIComponent(taskType)}`
    );
  }
}
