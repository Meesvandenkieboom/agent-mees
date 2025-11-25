/**
 * Timeout Wrapper Utility
 * Wraps async operations with timeout and warning notifications
 */

export interface TimeoutOptions {
  /** Total timeout in milliseconds (default: 120000ms / 2 minutes) */
  timeoutMs?: number;
  /** Warning time in milliseconds (default: 60000ms / 1 minute) */
  warningMs?: number;
  /** Callback when warning threshold is reached */
  onWarning?: () => void;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrap an async generator with timeout and warning notifications
 * This is specifically designed for the Claude SDK's query() which returns AsyncGenerator
 */
export async function* withTimeoutGenerator<T>(
  generator: AsyncGenerator<T>,
  options: TimeoutOptions = {}
): AsyncGenerator<T> {
  const {
    timeoutMs = 120000,  // 2 minutes default
    warningMs = 60000,   // 1 minute default
    onWarning,
    onTimeout,
  } = options;

  let warningFired = false;
  let timeoutFired = false;

  // Set up warning timer
  const warningTimer = setTimeout(() => {
    if (!warningFired) {
      warningFired = true;
      onWarning?.();
    }
  }, warningMs);

  // Set up timeout timer
  const timeoutTimer = setTimeout(() => {
    if (!timeoutFired) {
      timeoutFired = true;
      onTimeout?.();
      // We can't easily abort an AsyncGenerator, so we rely on the consumer
      // to handle the timeout notification and stop consuming
    }
  }, timeoutMs);

  try {
    // Track last activity time
    let _lastActivityTime = Date.now();

    for await (const value of generator) {
      // Update last activity on each yield
      _lastActivityTime = Date.now();

      // Check if timeout has fired
      if (timeoutFired) {
        throw new TimeoutError(`Operation timed out after ${timeoutMs}ms`);
      }

      yield value;
    }
  } finally {
    // Clean up timers
    clearTimeout(warningTimer);
    clearTimeout(timeoutTimer);
  }
}

/**
 * Wrap a Promise with timeout (for non-generator async operations)
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    timeoutMs = 120000,  // 2 minutes default
    warningMs = 60000,   // 1 minute default
    onWarning,
    onTimeout,
  } = options;

  let warningFired = false;

  // Set up warning timer
  const warningTimer = setTimeout(() => {
    if (!warningFired) {
      warningFired = true;
      onWarning?.();
    }
  }, warningMs);

  // Set up timeout timer
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      onTimeout?.();
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(warningTimer);
  }
}

/**
 * Create a timeout controller that can be used to track elapsed time
 * and send periodic updates
 */
export class TimeoutController {
  private startTime: number;
  private warningMs: number;
  private timeoutMs: number;
  private warningFired = false;
  private timeoutFired = false;
  private warningTimer?: NodeJS.Timeout;
  private timeoutTimer?: NodeJS.Timeout;
  private onWarning?: () => void;
  private onTimeout?: () => void;

  constructor(options: TimeoutOptions = {}) {
    this.startTime = Date.now();
    this.warningMs = options.warningMs || 60000;
    this.timeoutMs = options.timeoutMs || 120000;
    this.onWarning = options.onWarning;
    this.onTimeout = options.onTimeout;

    // Start timers
    this.warningTimer = setTimeout(() => {
      if (!this.warningFired) {
        this.warningFired = true;
        this.onWarning?.();
      }
    }, this.warningMs);

    this.timeoutTimer = setTimeout(() => {
      if (!this.timeoutFired) {
        this.timeoutFired = true;
        this.onTimeout?.();
      }
    }, this.timeoutMs);
  }

  /** Get elapsed time in milliseconds */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  /** Get elapsed time in seconds */
  getElapsedSeconds(): number {
    return Math.floor(this.getElapsed() / 1000);
  }

  /** Check if warning threshold was reached */
  hasWarning(): boolean {
    return this.warningFired;
  }

  /** Check if timeout threshold was reached */
  hasTimeout(): boolean {
    return this.timeoutFired;
  }

  /** Cancel timers and clean up */
  cancel(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
  }

  /** Reset the timeout timer (used for inactivity timeout) */
  reset(): void {
    this.startTime = Date.now();
    this.warningFired = false;
    this.timeoutFired = false;

    // Clear existing timers
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }

    // Restart timers
    this.warningTimer = setTimeout(() => {
      if (!this.warningFired) {
        this.warningFired = true;
        this.onWarning?.();
      }
    }, this.warningMs);

    this.timeoutTimer = setTimeout(() => {
      if (!this.timeoutFired) {
        this.timeoutFired = true;
        this.onTimeout?.();
      }
    }, this.timeoutMs);
  }

  /** Throw error if timeout was reached */
  checkTimeout(): void {
    if (this.timeoutFired) {
      throw new TimeoutError(`Operation timed out after ${this.timeoutMs}ms`);
    }
  }
}
