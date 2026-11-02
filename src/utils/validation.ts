/**
 * @pushplatform/react-native
 *
 * Input validation utilities
 */

import type { PushPlatformConfig, JSONObject } from '../types';
import { ErrorCode, SDKError } from '../types';

/**
 * Validate configuration object
 */
export function validateConfig(config: PushPlatformConfig): void {
  if (!config) {
    throw new SDKError(
      ErrorCode.INVALID_CONFIG,
      'Configuration is required'
    );
  }

  if (!config.applicationId || typeof config.applicationId !== 'string') {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'applicationId is required');
  }

  const baseURL = config.url || config.apiBaseURL;
  if (baseURL) validateURL(baseURL);

  const environment = config.environment || (baseURL ? 'development' : 'production');
  const localDebug = !!baseURL && config.debugMode === true && ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(new URL(baseURL).hostname);
  if (environment === 'production' && baseURL && !baseURL.startsWith('https://') && !localDebug) {
    throw new SDKError(
      ErrorCode.INVALID_CONFIG,
      'apiBaseURL must use HTTPS in production'
    );
  }

  // Validate environment
  const validEnvironments = ['development', 'staging', 'production'];
  if (config.environment && !validEnvironments.includes(config.environment)) {
    throw new SDKError(
      ErrorCode.INVALID_CONFIG,
      `Invalid environment. Must be one of: ${validEnvironments.join(', ')}`
    );
  }

  // Validate debugMode
  if (config.debugMode !== undefined && typeof config.debugMode !== 'boolean') {
    throw new SDKError(
      ErrorCode.INVALID_CONFIG,
      'debugMode must be a boolean'
    );
  }
}

/**
 * Validate user ID
 */
export function validateUserId(userId: unknown): void {
  if (typeof userId !== 'string') {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'userId must be a string');
  }

  if (userId.trim() === '') {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'userId cannot be empty');
  }

  if (userId.length > 255) {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'userId too long (max 255 characters)');
  }

  // Check for invalid characters (control chars, SQL injection patterns)
  const invalidChars = /[\x00-\x1F\x7F;'"\\]/;
  if (invalidChars.test(userId)) {
    throw new SDKError(
      ErrorCode.INVALID_CONFIG,
      'userId contains invalid characters'
    );
  }
}

/**
 * Validate URL
 */
export function validateURL(url: unknown): void {
  if (typeof url !== 'string') {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'URL must be a string');
  }

  if (url.trim() === '') {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'URL cannot be empty');
  }

  const trimmedUrl = url.trim();

  try {
    const parsedURL = new URL(trimmedUrl);
    if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') throw new SDKError(ErrorCode.INVALID_CONFIG, 'URL must use HTTP or HTTPS protocol');
    if (!parsedURL.hostname) throw new Error('missing host');
  } catch (error) {
    if (error instanceof SDKError) throw error;
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'must be a valid URL');
  }
}

/**
 * Validate user data object
 */
export function validateUserData(userData: JSONObject | undefined): void {
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

/**
 * Legacy Validator class for backward compatibility
 */
export class Validator {
  static validateConfig = validateConfig;
  static validateUserId = validateUserId;
  static validateUserData = validateUserData;
}
