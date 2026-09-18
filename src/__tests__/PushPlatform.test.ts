/**
 * PushPlatform Core API Tests
 * Tests initialization, login, logout, permissions, lifecycle
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NativeModules } from 'react-native';
import { PushPlatform } from '../PushPlatform';
import type { PushPlatformConfig } from '../types';

// Mock NativeModules
const mockNativeModule = NativeModules.PushPlatformBridge;

describe('PushPlatform Core API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state
    (PushPlatform as any).initialized = false;
    (PushPlatform as any)._instance = null;
  });

  describe('Initialization', () => {
    test('should initialize with valid configuration', async () => {
      mockNativeModule.initialize.mockResolvedValue(undefined);

      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
        debugMode: true,
      };

      await PushPlatform.initialize(config);

      expect(mockNativeModule.initialize).toHaveBeenCalledWith(config);
      expect(mockNativeModule.initialize).toHaveBeenCalledTimes(1);
    });

    test('should reject initialization with missing apiKey', async () => {
      const config = {
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      } as PushPlatformConfig;

      await expect(PushPlatform.initialize(config)).rejects.toThrow(
        'apiKey is required'
      );

      expect(mockNativeModule.initialize).not.toHaveBeenCalled();
    });

    test('should reject initialization with empty apiKey', async () => {
      const config: PushPlatformConfig = {
        apiKey: '',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      };

      await expect(PushPlatform.initialize(config)).rejects.toThrow(
        'apiKey is required'
      );

      expect(mockNativeModule.initialize).not.toHaveBeenCalled();
    });

    test('should reject initialization with missing apiBaseURL', async () => {
      const config = {
        apiKey: 'test-api-key',
        environment: 'development',
      } as PushPlatformConfig;

      await expect(PushPlatform.initialize(config)).rejects.toThrow(
        'apiBaseURL is required'
      );

      expect(mockNativeModule.initialize).not.toHaveBeenCalled();
    });

    test('should reject initialization with invalid apiBaseURL', async () => {
      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'not-a-url',
        environment: 'development',
      };

      await expect(PushPlatform.initialize(config)).rejects.toThrow(
        'must be a valid URL'
      );

      expect(mockNativeModule.initialize).not.toHaveBeenCalled();
    });

    test('should default to production environment if not specified', async () => {
      mockNativeModule.initialize.mockResolvedValue(undefined);

      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.pushplatform.example',
      };

      await PushPlatform.initialize(config);

      expect(mockNativeModule.initialize).toHaveBeenCalledWith({
        ...config,
        environment: 'production',
        debugMode: false,
      });
    });

    test('should handle native module initialization error', async () => {
      mockNativeModule.initialize.mockRejectedValue(
        new Error('Native initialization failed')
      );

      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      };

      await expect(PushPlatform.initialize(config)).rejects.toThrow(
        'Native initialization failed'
      );
    });

    test('should prevent double initialization', async () => {
      mockNativeModule.initialize.mockResolvedValue(undefined);

      const config: PushPlatformConfig = {
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      };

      await PushPlatform.initialize(config);
      await expect(PushPlatform.initialize(config)).rejects.toThrow(
        'PushPlatform already initialized'
      );

      expect(mockNativeModule.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Login', () => {
    beforeEach(async () => {
      mockNativeModule.initialize.mockResolvedValue(undefined);
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });
    });

    test('should login with valid userId', async () => {
      mockNativeModule.login.mockResolvedValue(undefined);

      await PushPlatform.login('user-123');

      expect(mockNativeModule.login).toHaveBeenCalledWith('user-123', undefined);
      expect(mockNativeModule.login).toHaveBeenCalledTimes(1);
    });

    test('should reject login with empty userId', async () => {
      await expect(PushPlatform.login('')).rejects.toThrow(
        'userId cannot be empty'
      );

      expect(mockNativeModule.login).not.toHaveBeenCalled();
    });

    test('should reject login with non-string userId', async () => {
      await expect(PushPlatform.login(123 as any)).rejects.toThrow(
        'userId must be a string'
      );

      expect(mockNativeModule.login).not.toHaveBeenCalled();
    });

    test('should handle native module login error', async () => {
      mockNativeModule.login.mockRejectedValue(
        new Error('Login failed')
      );

      await expect(PushPlatform.login('user-123')).rejects.toThrow(
        'Login failed'
      );
    });

    test('should reject login before initialization', async () => {
      (PushPlatform as any).initialized = false;
      (PushPlatform as any)._instance = null;

      await expect(PushPlatform.login('user-123')).rejects.toThrow(
        'SDK not initialized'
      );

      expect(mockNativeModule.login).not.toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      mockNativeModule.initialize.mockResolvedValue(undefined);
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });
    });

    test('should logout successfully', async () => {
      mockNativeModule.logout.mockResolvedValue(undefined);

      await PushPlatform.logout();

      expect(mockNativeModule.logout).toHaveBeenCalledWith();
      expect(mockNativeModule.logout).toHaveBeenCalledTimes(1);
    });

    test('should handle native module logout error', async () => {
      mockNativeModule.logout.mockRejectedValue(
        new Error('Logout failed')
      );

      await expect(PushPlatform.logout()).rejects.toThrow('Logout failed');
    });

    test('should reject logout before initialization', async () => {
      (PushPlatform as any).initialized = false;
      (PushPlatform as any)._instance = null;

      await expect(PushPlatform.logout()).rejects.toThrow(
        'SDK not initialized'
      );

      expect(mockNativeModule.logout).not.toHaveBeenCalled();
    });
  });

  describe('Get Installation ID', () => {
    beforeEach(async () => {
      mockNativeModule.initialize.mockResolvedValue(undefined);
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });
    });

    test('should get installation ID', async () => {
      const mockInstallationId = 'installation-uuid-123';
      mockNativeModule.getInstallationId.mockResolvedValue(mockInstallationId);

      const installationId = await PushPlatform.getInstallationId();

      expect(installationId).toBe(mockInstallationId);
      expect(mockNativeModule.getInstallationId).toHaveBeenCalledTimes(1);
    });

    test('should handle native module error', async () => {
      mockNativeModule.getInstallationId.mockRejectedValue(
        new Error('Installation ID not available')
      );

      await expect(PushPlatform.getInstallationId()).rejects.toThrow(
        'Installation ID not available'
      );
    });

    test('should reject before initialization', async () => {
      (PushPlatform as any).initialized = false;
      (PushPlatform as any)._instance = null;

      await expect(PushPlatform.getInstallationId()).rejects.toThrow(
        'SDK not initialized'
      );

      expect(mockNativeModule.getInstallationId).not.toHaveBeenCalled();
    });
  });

  describe('Request Permissions', () => {
    beforeEach(async () => {
      mockNativeModule.initialize.mockResolvedValue(undefined);
      await PushPlatform.initialize({
        apiKey: 'test-api-key',
        apiBaseURL: 'https://api.test.pushplatform.example',
        environment: 'development',
      });
    });

    test('should request permissions and return granted', async () => {
      mockNativeModule.requestPermissions.mockResolvedValue(true);

      const granted = await PushPlatform.requestPermissions();

      expect(granted).toBe(true);
      expect(mockNativeModule.requestPermissions).toHaveBeenCalledTimes(1);
    });

    test('should request permissions and return denied', async () => {
      mockNativeModule.requestPermissions.mockResolvedValue(false);

      const granted = await PushPlatform.requestPermissions();

      expect(granted).toBe(false);
      expect(mockNativeModule.requestPermissions).toHaveBeenCalledTimes(1);
    });

    test('should handle native module error', async () => {
      mockNativeModule.requestPermissions.mockRejectedValue(
        new Error('Permission request failed')
      );

      await expect(PushPlatform.requestPermissions()).rejects.toThrow(
        'Permission request failed'
      );
    });

    test('should reject before initialization', async () => {
      (PushPlatform as any).initialized = false;
      (PushPlatform as any)._instance = null;

      await expect(PushPlatform.requestPermissions()).rejects.toThrow(
        'SDK not initialized'
      );

      expect(mockNativeModule.requestPermissions).not.toHaveBeenCalled();
    });
  });
});
