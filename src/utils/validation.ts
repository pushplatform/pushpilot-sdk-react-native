/**
 * @pushplatform/react-native
 *
 * Input validation utilities
 */

import type { PushPlatformConfig, JSONObject } from '../types';
import { ErrorCode, SDKError } from '../types';

/**
 * Validation utility
 */
export class Validator {
  /**
   * Validate configuration object
   */
  static validateConfig(config: PushPlatformConfig): void {
    if (!config) {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'Configuration is required'
      );
    }

    if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'API key is required and must be a non-empty string'
      );
    }

    if (!config.environment || !['development', 'production'].includes(config.environment)) {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'Environment must be "development" or "production"'
      );
    }

    if (config.debug !== undefined && typeof config.debug !== 'boolean') {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'Debug flag must be a boolean'
      );
    }

    if (config.baseURL !== undefined && (typeof config.baseURL !== 'string' || config.baseURL.trim() === '')) {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'Base URL must be a non-empty string if provided'
      );
    }
  }

  /**
   * Validate user ID
   */
  static validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'User ID must be a non-empty string'
      );
    }

    if (userId.length > 255) {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'User ID must not exceed 255 characters'
      );
    }
  }

  /**
   * Validate user data object
   */
  static validateUserData(userData: JSONObject | undefined): void {
    if (userData === undefined) {
      return;
    }

    if (typeof userData !== 'object' || userData === null || Array.isArray(userData)) {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'User data must be a valid JSON object'
      );
    }

    // Validate it's serializable JSON
    try {
      JSON.stringify(userData);
    } catch (error) {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'User data must be JSON-serializable',
        { originalError: String(error) }
      );
    }
  }
}
