// Real-time Progress Tracking and Logging Service for Flash-Audit
import { ApiService } from './apiService';

export interface ProgressUpdate {
  id: string;
  operationType: 'scan' | 'deploy' | 'debug' | 'compile' | 'verify';
  step: number;
  totalSteps: number;
  message: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata?: any;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  message: string;
  source: string;
  operationId?: string;
  metadata?: any;
}

export interface OperationProgress {
  operationId: string;
  operationType: 'scan' | 'deploy' | 'debug' | 'compile' | 'verify';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  totalSteps: number;
  startTime: string;
  endTime?: string;
  logs: LogEntry[];
  result?: any;
  error?: string;
}

export class ProgressTrackingService {
  private static instance: ProgressTrackingService;
  private apiService: ApiService;
  private operations: Map<string, OperationProgress> = new Map();
  private progressCallbacks: Map<string, (progress: ProgressUpdate) => void> = new Map();
  private logCallbacks: Set<(log: LogEntry) => void> = new Set();

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  static getInstance(): ProgressTrackingService {
    if (!this.instance) {
      this.instance = new ProgressTrackingService();
    }
    return this.instance;
  }

  // Start tracking a new operation
  startOperation(
    operationType: OperationProgress['operationType'],
    totalSteps: number = 100,
    metadata?: any
  ): string {
    const operationId = `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: OperationProgress = {
      operationId,
      operationType,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing...',
      totalSteps,
      startTime: new Date().toISOString(),
      logs: []
    };

    this.operations.set(operationId, operation);
    
    // Log operation start
    this.addLog(operationId, 'info', `Started ${operationType} operation`, 'progress-tracker', metadata);
    
    return operationId;
  }

  // Update operation progress
  updateProgress(
    operationId: string,
    step: number,
    message: string,
    status: ProgressUpdate['status'] = 'in_progress',
    metadata?: any
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.warn(`Operation ${operationId} not found`);
      return;
    }

    operation.progress = Math.min(step, operation.totalSteps);
    operation.currentStep = message;
    operation.status = status;

    const progressUpdate: ProgressUpdate = {
      id: `progress_${Date.now()}`,
      operationType: operation.operationType,
      step,
      totalSteps: operation.totalSteps,
      message,
      timestamp: new Date().toISOString(),
      status,
      metadata
    };

    // Notify progress callbacks
    const callback = this.progressCallbacks.get(operationId);
    if (callback) {
      callback(progressUpdate);
    }

    // Log progress update
    this.addLog(operationId, 'info', `[${step}/${operation.totalSteps}] ${message}`, 'progress-tracker');

    // Update operation in storage
    this.operations.set(operationId, operation);
  }

  // Complete an operation
  completeOperation(operationId: string, result?: any, error?: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      console.warn(`Operation ${operationId} not found`);
      return;
    }

    operation.status = error ? 'failed' : 'completed';
    operation.progress = operation.totalSteps;
    operation.endTime = new Date().toISOString();
    operation.result = result;
    operation.error = error;

    const finalMessage = error 
      ? `Operation failed: ${error}`
      : `Operation completed successfully`;

    this.updateProgress(operationId, operation.totalSteps, finalMessage, operation.status);

    // Log completion
    this.addLog(
      operationId, 
      error ? 'error' : 'success', 
      finalMessage, 
      'progress-tracker',
      { result, error }
    );

    // Persist to database
    this.persistOperation(operation);
  }

  // Add a log entry
  addLog(
    operationId: string,
    level: LogEntry['level'],
    message: string,
    source: string,
    metadata?: any
  ): void {
    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      operationId,
      metadata
    };

    // Add to operation logs
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.logs.push(logEntry);
      this.operations.set(operationId, operation);
    }

    // Notify log callbacks
    this.logCallbacks.forEach(callback => callback(logEntry));

    // Console logging for development
    const consoleMethod = level === 'error' ? 'error' : 
                         level === 'warning' ? 'warn' : 
                         level === 'success' ? 'log' : 'log';
    console[consoleMethod](`[${source}] ${message}`, metadata || '');
  }

  // Subscribe to progress updates for a specific operation
  onProgress(operationId: string, callback: (progress: ProgressUpdate) => void): void {
    this.progressCallbacks.set(operationId, callback);
  }

  // Subscribe to all log entries
  onLog(callback: (log: LogEntry) => void): void {
    this.logCallbacks.add(callback);
  }

  // Unsubscribe from progress updates
  offProgress(operationId: string): void {
    this.progressCallbacks.delete(operationId);
  }

  // Unsubscribe from log entries
  offLog(callback: (log: LogEntry) => void): void {
    this.logCallbacks.delete(callback);
  }

  // Get operation status
  getOperation(operationId: string): OperationProgress | undefined {
    return this.operations.get(operationId);
  }

  // Get all operations
  getAllOperations(): OperationProgress[] {
    return Array.from(this.operations.values());
  }

  // Get operations by type
  getOperationsByType(operationType: OperationProgress['operationType']): OperationProgress[] {
    return Array.from(this.operations.values()).filter(op => op.operationType === operationType);
  }

  // Clear completed operations
  clearCompletedOperations(): void {
    for (const [id, operation] of this.operations.entries()) {
      if (operation.status === 'completed' || operation.status === 'failed') {
        this.operations.delete(id);
        this.progressCallbacks.delete(id);
      }
    }
  }

  // Persist operation to database
  private async persistOperation(operation: OperationProgress): Promise<void> {
    try {
      await this.apiService.post('/logs/operation', {
        operationId: operation.operationId,
        operationType: operation.operationType,
        status: operation.status,
        progress: operation.progress,
        startTime: operation.startTime,
        endTime: operation.endTime,
        logs: operation.logs,
        result: operation.result,
        error: operation.error
      });
    } catch (error) {
      console.error('Failed to persist operation:', error);
    }
  }

  // Get operation statistics
  getStatistics(): {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    byType: { [key: string]: number };
  } {
    const operations = Array.from(this.operations.values());
    const stats = {
      total: operations.length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      inProgress: operations.filter(op => op.status === 'in_progress').length,
      byType: {} as { [key: string]: number }
    };

    // Count by type
    operations.forEach(op => {
      stats.byType[op.operationType] = (stats.byType[op.operationType] || 0) + 1;
    });

    return stats;
  }

  // Export logs for debugging
  exportLogs(operationId?: string): string {
    const operations = operationId 
      ? [this.operations.get(operationId)].filter(Boolean)
      : Array.from(this.operations.values());

    const exportData = {
      timestamp: new Date().toISOString(),
      operations: operations.map(op => ({
        ...op,
        logs: op?.logs || []
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }
}
