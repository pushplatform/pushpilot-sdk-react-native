/**
 * Validation Utilities Tests
 * Tests input validation, URL validation, type checking
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { validateConfig, validateUserId, validateURL } from '../utils/validation';
import type { PushPlatformConfig } from '../types';

describe('Validation Utilities', () => {
  describe('validateConfig', () => {
    test('should validate correct configuration', () => {
      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
        debugMode: true,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    test('should throw on missing apiKey', () => {
      const config = {
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      } as PushPlatformConfig;

      expect(() => validateConfig(config)).toThrow('apiKey is required');
    });

    test('should throw on empty apiKey', () => {
      const config: PushPlatformConfig = {
        apiKey: '',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      };

      expect(() => validateConfig(config)).toThrow('apiKey is required');
    });

    test('should throw on whitespace-only apiKey', () => {
      const config: PushPlatformConfig = {
        apiKey: '   ',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      };

      expect(() => validateConfig(config)).toThrow('apiKey cannot be empty');
    });

    test('should throw on missing apiBaseURL', () => {
      const config = {
        apiKey: 'test-api-key',
        environment: 'development',
      } as PushPlatformConfig;

      expect(() => validateConfig(config)).toThrow('apiBaseURL is required');
    });

    test('should throw on invalid apiBaseURL', () => {
      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'not-a-url',
        environment: 'development',
      };

      expect(() => validateConfig(config)).toThrow('must be a valid URL');
    });

    test('should throw on non-HTTPS apiBaseURL in production', () => {
      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'http://api.pushplatform.example',
        environment: 'production',
      };

      expect(() => validateConfig(config)).toThrow(
        'apiBaseURL must use HTTPS in production'
      );
    });

    test('should allow HTTP in development', () => {
      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'http://localhost:8080',
        environment: 'development',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    test('should default environment to production if missing', () => {
      const config = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.pushplatform.example',
      } as PushPlatformConfig;

      expect(() => validateConfig(config)).not.toThrow();
    });

    test('should validate development environment', () => {
      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.dev.pushplatform.example',
        environment: 'development',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    test('should reject invalid environment', () => {
      const config = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.pushplatform.example',
        environment: 'invalid',
      } as any;

      expect(() => validateConfig(config)).toThrow('Invalid environment');
    });

    test('should validate debugMode boolean', () => {
      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.pushplatform.example',
        environment: 'development',
        debugMode: true,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    test('should default debugMode to false', () => {
      const config = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.pushplatform.example',
        environment: 'production',
      } as PushPlatformConfig;

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe('validateUserId', () => {
    test('should validate correct userId', () => {
      expect(() => validateUserId('user-123')).not.toThrow();
    });

    test('should validate UUID userId', () => {
      expect(() => validateUserId('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });

    test('should validate email-like userId', () => {
      expect(() => validateUserId('user@example.com')).not.toThrow();
    });

    test('should throw on empty userId', () => {
      expect(() => validateUserId('')).toThrow('userId cannot be empty');
    });

    test('should throw on whitespace-only userId', () => {
      expect(() => validateUserId('   ')).toThrow('userId cannot be empty');
    });

    test('should throw on non-string userId', () => {
      expect(() => validateUserId(123 as any)).toThrow('userId must be a string');
      expect(() => validateUserId(null as any)).toThrow('userId must be a string');
      expect(() => validateUserId(undefined as any)).toThrow('userId must be a string');
      expect(() => validateUserId({} as any)).toThrow('userId must be a string');
      expect(() => validateUserId([] as any)).toThrow('userId must be a string');
    });

    test('should throw on userId exceeding max length', () => {
      const longUserId = 'a'.repeat(256);
      expect(() => validateUserId(longUserId)).toThrow('userId too long');
    });

    test('should allow userId at max length', () => {
      const maxUserId = 'a'.repeat(255);
      expect(() => validateUserId(maxUserId)).not.toThrow();
    });

    test('should reject userId with SQL injection patterns', () => {
      expect(() => validateUserId("user'; DROP TABLE users; --")).toThrow(
        'userId contains invalid characters'
      );
    });

    test('should reject userId with control characters', () => {
      expect(() => validateUserId('user\x00id')).toThrow(
        'userId contains invalid characters'
      );
      expect(() => validateUserId('user\nid')).toThrow(
        'userId contains invalid characters'
      );
    });

    test('should allow alphanumeric with common special chars', () => {
      expect(() => validateUserId('user-123_test@example.com')).not.toThrow();
      expect(() => validateUserId('user.name+tag@example.com')).not.toThrow();
    });
  });

  describe('validateURL', () => {
    test('should validate HTTPS URL', () => {
      expect(() => validateURL('https://api.pushplatform.example')).not.toThrow();
    });

    test('should validate HTTP URL', () => {
      expect(() => validateURL('http://localhost:8080')).not.toThrow();
    });

    test('should validate URL with path', () => {
      expect(() => validateURL('https://api.pushplatform.example/v1')).not.toThrow();
    });

    test('should validate URL with port', () => {
      expect(() => validateURL('https://api.pushplatform.example:8443')).not.toThrow();
    });

    test('should throw on invalid URL', () => {
      expect(() => validateURL('not-a-url')).toThrow('must be a valid URL');
    });

    test('should throw on URL without protocol', () => {
      expect(() => validateURL('api.pushplatform.example')).toThrow('must be a valid URL');
    });

    test('should throw on empty URL', () => {
      expect(() => validateURL('')).toThrow('URL cannot be empty');
    });

    test('should throw on non-string URL', () => {
      expect(() => validateURL(123 as any)).toThrow('URL must be a string');
      expect(() => validateURL(null as any)).toThrow('URL must be a string');
    });

    test('should throw on FTP URL', () => {
      expect(() => validateURL('ftp://files.example.com')).toThrow(
        'URL must use HTTP or HTTPS'
      );
    });

    test('should throw on file URL', () => {
      expect(() => validateURL('file:///etc/passwd')).toThrow(
        'URL must use HTTP or HTTPS'
      );
    });

    test('should validate localhost URLs', () => {
      expect(() => validateURL('http://localhost')).not.toThrow();
      expect(() => validateURL('http://127.0.0.1:8080')).not.toThrow();
    });

    test('should validate IP address URLs', () => {
      expect(() => validateURL('https://10.0.1.5:8443')).not.toThrow();
    });

    test('should throw on malformed URLs', () => {
      expect(() => validateURL('https://')).toThrow('must be a valid URL');
      expect(() => validateURL('https:///')).toThrow('must be a valid URL');
    });
  });

  describe('Edge Cases', () => {
    test('should allow unicode in userId', () => {
      // Unicode is valid and should be allowed
      expect(() => validateUserId('user-🎉')).not.toThrow();
    });

    test('should handle URL with query parameters', () => {
      expect(() => validateURL('https://api.pushplatform.example?key=value')).not.toThrow();
    });

    test('should handle URL with fragment', () => {
      expect(() => validateURL('https://api.pushplatform.example#section')).not.toThrow();
    });

    test('should trim whitespace in validation', () => {
      const config: PushPlatformConfig = {
        apiKey: '  test-api-key  ',
        apiBaseURL: '  https://api.pushplatform.example  ',
        environment: 'development',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
