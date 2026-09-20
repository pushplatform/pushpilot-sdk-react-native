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

  // Validate apiKey
  if (!config.apiKey) {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'apiKey is required');
  }
  if (typeof config.apiKey !== 'string') {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'apiKey must be a string');
  }
  if (config.apiKey.trim() === '') {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'apiKey cannot be empty');
  }

  // Validate apiBaseURL
  if (!config.apiBaseURL) {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'apiBaseURL is required');
  }
  validateURL(config.apiBaseURL);

  // Validate HTTPS in production
  const environment = config.environment || 'production';
  if (environment === 'production' && !config.apiBaseURL.startsWith('https://')) {
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

  // Basic URL validation without full URL API
  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(trimmedUrl)) {
    throw new SDKError(ErrorCode.INVALID_CONFIG, 'must be a valid HTTP or HTTPS URL');
  }

  // Check for valid hostname
  try {
    const parsedURL = new URL(trimmedUrl);
    // Only allow HTTP and HTTPS
    if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
      throw new SDKError(
        ErrorCode.INVALID_CONFIG,
        'URL must use HTTP or HTTPS protocol'
      );
    }
  } catch (error) {
    // If URL API fails, fall back to regex validation
    if (!/^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/.test(trimmedUrl)) {
      throw new SDKError(ErrorCode.INVALID_CONFIG, 'must be a valid URL');
    }
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

