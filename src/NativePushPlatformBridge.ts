/**
 * Native bridge type definitions for React Native
 * This file provides TypeScript types for the native module interface
 */

export interface NativePushPlatformBridge {
  /**
   * Initialize the PushPlatform SDK
   * @param config Application id, and optional server address, environment, and debug flag
   * @returns Promise that resolves when initialization completes
   */
  initialize(config: {
    applicationId: string;
    url?: string;
    apiBaseURL?: string;
    apiKey?: string;
    environment?: string;
    debugMode?: boolean;
  }): Promise<void>;

  /**
   * Login user to the PushPlatform
   * @param userId User identifier
   * @param userData Optional user metadata
   * @returns Promise that resolves when login completes
   */
  login(userId: string, userData?: Record<string, any> | null): Promise<void>;

  /**
   * Logout current user
   * @returns Promise that resolves when logout completes
   */
  logout(): Promise<void>;

  /**
   * Get installation ID
   * @returns Promise that resolves with the installation UUID string
   */
  getInstallationId(): Promise<string>;
}
