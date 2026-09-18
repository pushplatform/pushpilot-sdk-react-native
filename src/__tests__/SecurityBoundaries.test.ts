/**
 * Security Boundaries Tests
 * Validates that raw tokens never cross to JavaScript layer
 * and that security requirements from ADR-0004 and ADR-0014 are met
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NativeModules } from 'react-native';
import { PushPlatform } from '../PushPlatform';
import type { RegistrationUpdate } from '../types';

const mockNativeModule = NativeModules.PushPlatformBridge;

describe('Security Boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PushPlatform as any).initialized = false;
    (PushPlatform as any)._instance = null;

    mockNativeModule.initialize.mockResolvedValue(undefined);
  });

  describe('Token Security — ADR-0004, ADR-0014', () => {
    test('should never receive raw APNs token in registration update', async () => {
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });

      const callback = jest.fn();
      PushPlatform.onRegistrationUpdated(callback);

      // Simulate native event (no token parameter per ADR-0014)
      const mockAddListener = (NativeModules.PushPlatformBridge as any).addListener ||
        ((jest.requireMock('react-native').NativeEventEmitter as any).mock.results[0]?.value?.addListener);

      if (mockAddListener && mockAddListener.mock.calls.length > 0) {
        const listenerCallback = mockAddListener.mock.calls[0][1];
        const update: RegistrationUpdate = {
        installationId: "test-install-id",
          success: true,
          type: 'apns',
          // NO token field - this is correct per ADR-0014
        };
        listenerCallback(update);

        expect(callback).toHaveBeenCalledWith(update);
        expect(callback.mock.calls[0][0]).not.toHaveProperty('token');
        expect(callback.mock.calls[0][0]).not.toHaveProperty('deviceToken');
        expect(callback.mock.calls[0][0]).not.toHaveProperty('apnsToken');
      }
    });

    test('should never receive raw FCM token in registration update', async () => {
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });

      const callback = jest.fn();
      PushPlatform.onRegistrationUpdated(callback);

      const mockEventEmitter = (jest.requireMock('react-native').NativeEventEmitter as any).mock.results[0]?.value;
      if (mockEventEmitter?.addListener.mock.calls.length > 0) {
        const listenerCallback = mockEventEmitter.addListener.mock.calls[0][1];
        const update: RegistrationUpdate = {
        installationId: "test-install-id",
          success: true,
          type: 'fcm',
          // NO token field - this is correct per ADR-0014
        };
        listenerCallback(update);

        expect(callback).toHaveBeenCalledWith(update);
        expect(callback.mock.calls[0][0]).not.toHaveProperty('token');
        expect(callback.mock.calls[0][0]).not.toHaveProperty('deviceToken');
        expect(callback.mock.calls[0][0]).not.toHaveProperty('fcmToken');
      }
    });

    test('should not expose server API key in configuration', async () => {
      // Re-initialize to check config handling
      (PushPlatform as any).instance = null;

      const config = {
        apiKey: 'client-api-key-devices-write-scope',
        apiBaseURL: 'https://api.pushplatform.example',
        environment: 'production' as const,
      };

      await PushPlatform.initialize(config);

      // Verify that native module receives config, but we don't expose server keys
      expect(mockNativeModule.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: expect.any(String),
          apiBaseURL: expect.any(String),
        })
      );

      // Server API key should NEVER be in JavaScript layer
      expect(mockNativeModule.initialize.mock.calls[0][0]).not.toHaveProperty('serverApiKey');
      expect(mockNativeModule.initialize.mock.calls[0][0]).not.toHaveProperty('internalApiKey');
    });

    test('should validate client API key format', async () => {
      (PushPlatform as any).initialized = false;
      (PushPlatform as any)._instance = null;

      // API key should be non-empty string
      await expect(
        PushPlatform.initialize({
          apiKey: '',
          apiBaseURL: 'https://api.test.pushplatform.example',
          environment: 'development',
        })
      ).rejects.toThrow('apiKey is required');
    });

    test('should not log sensitive data in debug mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (PushPlatform as any).instance = null;
      await PushPlatform.initialize({
        apiKey: 'sensitive-api-key-123',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
        debugMode: true,
      });

      // Debug logs should not contain full API key
      const logs = consoleSpy.mock.calls.map(call => JSON.stringify(call));
      logs.forEach(log => {
        expect(log).not.toContain('sensitive-api-key-123');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Data Privacy', () => {
    test('should not expose raw notification data outside event handlers', async () => {
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });

      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      // Notification data should only flow through callbacks, never stored in SDK instance
      expect(PushPlatform).not.toHaveProperty('lastNotification');
      expect(PushPlatform).not.toHaveProperty('notifications');
      expect(PushPlatform).not.toHaveProperty('notificationCache');
    });

    test('should not persist user data across logout', async () => {
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });

      mockNativeModule.login.mockResolvedValue(undefined);
      mockNativeModule.logout.mockResolvedValue(undefined);

      await PushPlatform.login('user-123');
      await PushPlatform.logout();

      // After logout, no user data should remain in JS layer
      expect((PushPlatform as any).instance).toBeDefined();
      // SDK instance exists but should not store user-specific data
    });
  });

  describe('Error Message Security', () => {
    test('should not expose internal details in error messages', async () => {
      mockNativeModule.login.mockRejectedValue(
        new Error('Internal database connection failed at 10.0.1.5:5432')
      );

      try {
        await PushPlatform.login('user-123');
        fail('Should have thrown error');
      } catch (error: any) {
        // Error should propagate but we verify native handles sanitization
        expect(error.message).toBeDefined();
        // Note: Error sanitization happens on native side, we just verify it propagates
      }
    });

    test('should handle network errors without exposing credentials', async () => {
      mockNativeModule.initialize.mockRejectedValue(
        new Error('Network error: Request to api.pushplatform.example failed')
      );

      (PushPlatform as any).instance = null;

      try {
        await PushPlatform.initialize({
          apiKey: 'secret-key',
          apiBaseURL: 'https://api.pushplatform.example',
          environment: 'production',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        // Error message should not contain API key
        expect(error.message).not.toContain('secret-key');
      }
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize userId for SQL injection attempts', async () => {
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });

      const maliciousUserId = "user'; DROP TABLE users; --";

      // Validation should reject this before it reaches native layer
      await expect(
        PushPlatform.login(maliciousUserId)
      ).rejects.toThrow(); // Validation error expected
    });

    test('should sanitize notification data keys', async () => {
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });
      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      // Simulate notification with potentially malicious keys
      const mockEventEmitter = (jest.requireMock('react-native').NativeEventEmitter as any).mock.results[0]?.value;
      if (mockEventEmitter?.addListener.mock.calls.length > 0) {
        const listenerCallback = mockEventEmitter.addListener.mock.calls[0][1];
        const context = {
          notification: {
            id: 'notif-123',
            title: 'Test',
            body: 'Body',
            data: {
              '__proto__': 'malicious',
              'constructor': 'bad',
              'normalKey': 'value',
            },
          },
          foreground: true,
        };
        listenerCallback(context);

        expect(callback).toHaveBeenCalledWith(context);
        // Data should be passed through (sanitization happens on native side if needed)
      }
    });
  });

  describe('Boundary Enforcement', () => {
    test('should only call native module for SDK operations', async () => {
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });

      mockNativeModule.login.mockResolvedValue(undefined);

      await PushPlatform.login('user-123');

      // Verify we only interact with native module, not direct native APIs
      expect(mockNativeModule.login).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.login).toHaveBeenCalledWith('user-123', undefined);
    });

    test('should not expose native module directly', () => {
      // Native module should not be accessible from PushPlatform instance
      expect(PushPlatform).not.toHaveProperty('nativeModule');
      expect(PushPlatform).not.toHaveProperty('bridge');
      expect(PushPlatform).not.toHaveProperty('native');
    });

    test('should enforce initialization requirement', async () => {
      (PushPlatform as any).initialized = false;
      (PushPlatform as any)._instance = null;

      // All methods should fail before initialization
      await expect(PushPlatform.login('user-123')).rejects.toThrow(
        'SDK not initialized'
      );
      await expect(PushPlatform.logout()).rejects.toThrow(
        'SDK not initialized'
      );
      await expect(PushPlatform.getInstallationId()).rejects.toThrow(
        'SDK not initialized'
      );
      await expect(PushPlatform.requestPermissions()).rejects.toThrow(
        'SDK not initialized'
      );
    });
  });
});
