/**
 * @pushplatform/react-native
 *
 * Utility functions for logging and validation
 */

/**
 * Logger utility (controlled by debug mode)
 */
export class Logger {
  private static debugEnabled = false;

  /**
   * Enable debug logging
   */
  static enable(): void {
    Logger.debugEnabled = true;
  }

  /**
   * Disable debug logging
   */
  static disable(): void {
    Logger.debugEnabled = false;
  }

  /**
   * Log debug message
   */
  static debug(message: string, ...args: unknown[]): void {
    if (Logger.debugEnabled) {
      console.log(`[PushPlatform] ${message}`, ...args);
    }
  }

  /**
   * Log info message
   */
  static info(message: string, ...args: unknown[]): void {
    if (Logger.debugEnabled) {
      console.info(`[PushPlatform] ${message}`, ...args);
    }
  }

  /**
   * Log warning message (always shown)
   */
  static warn(message: string, ...args: unknown[]): void {
    console.warn(`[PushPlatform] ${message}`, ...args);
  }

  /**
   * Log error message (always shown)
   */
  static error(message: string, ...args: unknown[]): void {
    console.error(`[PushPlatform] ${message}`, ...args);
  }
}
