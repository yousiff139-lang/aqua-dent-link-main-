/**
 * Background Job Queue Module
 * Provides asynchronous job processing for document generation
 * Prevents blocking the main request thread and improves response times
 */

interface Job {
  id: string;
  type: 'pdf' | 'excel' | 'both';
  appointmentId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: {
    pdfUrl?: string;
    excelUrl?: string;
  };
  error?: string;
  retries: number;
  maxRetries: number;
}

interface JobQueueOptions {
  maxConcurrent?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class JobQueue {
  private queue: Map<string, Job>;
  private processing: Set<string>;
  private maxConcurrent: number;
  private maxRetries: number;
  private retryDelay: number;
  private workers: Set<Promise<void>>;

  constructor(options: JobQueueOptions = {}) {
    this.queue = new Map();
    this.processing = new Set();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.maxRetries = options.maxRetries || 2;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
    this.workers = new Set();
  }

  /**
   * Add a job to the queue
   */
  addJob(
    appointmentId: string,
    userId: string,
    type: 'pdf' | 'excel' | 'both' = 'pdf'
  ): string {
    const jobId = crypto.randomUUID();
    
    const job: Job = {
      id: jobId,
      type,
      appointmentId,
      userId,
      status: 'pending',
      createdAt: Date.now(),
      retries: 0,
      maxRetries: this.maxRetries
    };

    this.queue.set(jobId, job);
    console.log(`Job added to queue: ${jobId} (type: ${type}, appointment: ${appointmentId})`);

    // Start processing if we have capacity
    this.processNext();

    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): Job | null {
    return this.queue.get(jobId) || null;
  }

  /**
   * Get all jobs for an appointment
   */
  getJobsByAppointment(appointmentId: string): Job[] {
    return Array.from(this.queue.values()).filter(
      job => job.appointmentId === appointmentId
    );
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    // Check if we have capacity
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Find next pending job
    const nextJob = Array.from(this.queue.values()).find(
      job => job.status === 'pending'
    );

    if (!nextJob) {
      return;
    }

    // Mark as processing
    nextJob.status = 'processing';
    nextJob.startedAt = Date.now();
    this.processing.add(nextJob.id);

    console.log(
      `Processing job: ${nextJob.id} (queue: ${this.queue.size}, ` +
      `processing: ${this.processing.size})`
    );

    // Create worker promise
    const worker = this.processJob(nextJob)
      .then(() => {
        this.processing.delete(nextJob.id);
        // Process next job
        this.processNext();
      })
      .catch(error => {
        console.error(`Worker error for job ${nextJob.id}:`, error);
        this.processing.delete(nextJob.id);
        // Process next job even on error
        this.processNext();
      });

    this.workers.add(worker);
    worker.finally(() => this.workers.delete(worker));
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    try {
      console.log(`Starting job processing: ${job.id}`);

      // Simulate document generation (in real implementation, call actual generation functions)
      // This would be replaced with actual calls to generatePDF/generateExcel
      await this.simulateDocumentGeneration(job);

      // Mark as completed
      job.status = 'completed';
      job.completedAt = Date.now();

      const duration = job.completedAt - (job.startedAt || job.createdAt);
      console.log(`Job completed: ${job.id} (duration: ${duration}ms)`);

      // Clean up old completed jobs after 5 minutes
      setTimeout(() => {
        this.queue.delete(job.id);
        console.log(`Cleaned up completed job: ${job.id}`);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error(`Job failed: ${job.id}`, error);

      // Check if we should retry
      if (job.retries < job.maxRetries) {
        job.retries++;
        job.status = 'pending';
        job.error = error instanceof Error ? error.message : String(error);

        console.log(
          `Retrying job: ${job.id} (attempt ${job.retries}/${job.maxRetries})`
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Re-queue the job
        this.processNext();
      } else {
        // Max retries reached
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = error instanceof Error ? error.message : String(error);

        console.error(
          `Job failed permanently: ${job.id} after ${job.retries} retries`
        );

        // Clean up failed jobs after 10 minutes
        setTimeout(() => {
          this.queue.delete(job.id);
          console.log(`Cleaned up failed job: ${job.id}`);
        }, 10 * 60 * 1000);
      }
    }
  }

  /**
   * Simulate document generation (placeholder for actual implementation)
   * In production, this would call the actual PDF/Excel generation functions
   */
  private async simulateDocumentGeneration(job: Job): Promise<void> {
    // Simulate processing time
    const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Simulate success/failure (95% success rate)
    if (Math.random() < 0.05) {
      throw new Error('Simulated generation failure');
    }

    // Set mock results
    job.result = {
      pdfUrl: job.type === 'pdf' || job.type === 'both' 
        ? `https://example.com/pdf/${job.appointmentId}.pdf` 
        : undefined,
      excelUrl: job.type === 'excel' || job.type === 'both'
        ? `https://example.com/excel/${job.appointmentId}.xlsx`
        : undefined
    };
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const jobs = Array.from(this.queue.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      maxConcurrent: this.maxConcurrent,
      currentConcurrent: this.processing.size
    };
  }

  /**
   * Wait for all jobs to complete (useful for testing)
   */
  async waitForAll(): Promise<void> {
    while (this.processing.size > 0 || this.workers.size > 0) {
      await Promise.all(Array.from(this.workers));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Clear all jobs
   */
  clear(): void {
    this.queue.clear();
    this.processing.clear();
    console.log('Job queue cleared');
  }
}

// Export singleton instance
export const jobQueue = new JobQueue({
  maxConcurrent: 3,
  maxRetries: 2,
  retryDelay: 5000
});

/**
 * Helper function to queue document generation
 */
export function queueDocumentGeneration(
  appointmentId: string,
  userId: string,
  type: 'pdf' | 'excel' | 'both' = 'pdf'
): string {
  return jobQueue.addJob(appointmentId, userId, type);
}

/**
 * Helper function to check job status
 */
export function getJobStatus(jobId: string): Job | null {
  return jobQueue.getJob(jobId);
}
