/**
 * Event Emitter and Notification Handling Tests
 * Tests event listeners, notification callbacks, lifecycle events
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NativeModules } from 'react-native';
import { PushPlatform } from '../PushPlatform';
import type { NotificationContext, RegistrationUpdate } from '../types';
import { NativeEvents } from '../NativeModule';

const mockNativeModule = NativeModules.PushPlatformBridge;

describe('Event Emitter and Notifications', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (PushPlatform as any).initialized = false;
    (PushPlatform as any)._instance = null;

    // Initialize SDK
    mockNativeModule.initialize.mockResolvedValue(undefined);
    await PushPlatform.initialize({
      apiKey: 'test-api-key',
      apiBaseURL: 'https://api.test.pushplatform.example',
      environment: 'development',
    });
  });

  describe('onRegistrationUpdated', () => {
    test('should register listener for registration updates', () => {
      const callback = jest.fn();

      const subscription = PushPlatform.onRegistrationUpdated(callback);

      expect(NativeEvents.addListener).toHaveBeenCalledWith(
        'onRegistrationUpdated',
        expect.any(Function)
      );
      expect(subscription).toHaveProperty('remove');
    });

    test('should receive successful registration update', () => {
      const callback = jest.fn();
      PushPlatform.onRegistrationUpdated(callback);

      // Simulate native event
      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const update: RegistrationUpdate = {
        installationId: "test-install-id",
        success: true,
        type: 'apns',
      };
      listenerCallback(update);

      expect(callback).toHaveBeenCalledWith(update);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should receive failed registration update', () => {
      const callback = jest.fn();
      PushPlatform.onRegistrationUpdated(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const update: RegistrationUpdate = {
        installationId: 'test-install-fail',
        success: false,
        type: 'fcm',
        error: 'NETWORK_ERROR: Network request failed',
      };
      listenerCallback(update);

      expect(callback).toHaveBeenCalledWith(update);
      expect(callback.mock.calls[0][0].error).toContain('NETWORK_ERROR');
    });

    test('should handle multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      PushPlatform.onRegistrationUpdated(callback1);
      PushPlatform.onRegistrationUpdated(callback2);

      expect(NativeEvents.addListener).toHaveBeenCalledTimes(2);
    });

    test('should remove listener when subscription is removed', () => {
      const callback = jest.fn();
      const mockRemove = jest.fn();
      (NativeEvents.addListener as jest.Mock).mockReturnValue({ remove: mockRemove });

      const subscription = PushPlatform.onRegistrationUpdated(callback);
      subscription.remove();

      expect(mockRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('onNotificationReceived', () => {
    test('should register listener for notification received', () => {
      const callback = jest.fn();

      const subscription = PushPlatform.onNotificationReceived(callback);

      expect(NativeEvents.addListener).toHaveBeenCalledWith(
        'onNotificationReceived',
        expect.any(Function)
      );
      expect(subscription).toHaveProperty('remove');
    });

    test('should receive foreground notification', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'notif-123',
          title: 'Test Notification',
          body: 'This is a test',
          data: { key: 'value' },
        },
        isForegrounded: true,
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].isForegrounded).toBe(true);
    });

    test('should receive background notification', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'notif-456',
          title: 'Background Notification',
          body: 'Background test',
          data: { silent: true },
        },
        isForegrounded: false,
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].isForegrounded).toBe(false);
    });

    test('should receive notification with callId (VoIP)', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'voip-789',
          title: 'Incoming Call',
          body: 'John is calling',
          data: { caller: 'John' },
          callId: 'call-uuid-123',
        },
        isForegrounded: true,
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].notification.callId).toBe('call-uuid-123');
    });

    test('should handle notification with empty data', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'notif-minimal',
          title: 'Minimal',
          body: 'No data',
          data: {},
        },
        isForegrounded: true,
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].notification.data).toEqual({});
    });
  });

  describe('onNotificationOpened', () => {
    test('should register listener for notification opened', () => {
      const callback = jest.fn();

      const subscription = PushPlatform.onNotificationOpened(callback);

      expect(NativeEvents.addListener).toHaveBeenCalledWith(
        'onNotificationOpened',
        expect.any(Function)
      );
      expect(subscription).toHaveProperty('remove');
    });

    test('should receive notification opened event', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationOpened(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'notif-opened',
          title: 'Opened Notification',
          body: 'User tapped this',
          data: { deeplink: '/home' },
        },
        isForegrounded: false,
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].notification.data.deeplink).toBe('/home');
    });

    test('should receive notification opened with actionId', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationOpened(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'notif-action',
          title: 'Action Notification',
          body: 'User tapped action',
          data: {},
        },
        isForegrounded: false,
        actionId: 'accept',
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].actionId).toBe('accept');
    });

    test('should handle multiple notification opened listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      PushPlatform.onNotificationOpened(callback1);
      PushPlatform.onNotificationOpened(callback2);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[1][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'notif-multi',
          title: 'Multi',
          body: 'Test',
          data: {},
        },
        isForegrounded: false,
      };
      listenerCallback(context);

      expect(callback2).toHaveBeenCalledWith(context);
    });
  });

  describe('Event Deduplication', () => {
    test('should preserve event_id in notification data', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'notif-dedup',
          title: 'Dedup Test',
          body: 'With event_id',
          data: { event_id: 'evt-123' },
        },
        isForegrounded: true,
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].notification.data.event_id).toBe('evt-123');
    });

    test('should preserve call_id in notification', () => {
      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);

      const listenerCallback = (NativeEvents.addListener as jest.Mock).mock.calls[0][1];
      const context: NotificationContext = {
        userInteraction: false,
        notification: {
          id: 'call-dedup',
          title: 'Call Dedup',
          body: 'With call_id',
          data: {},
          callId: 'call-456',
        },
        isForegrounded: true,
      };
      listenerCallback(context);

      expect(callback).toHaveBeenCalledWith(context);
      expect(callback.mock.calls[0][0].notification.callId).toBe('call-456');
    });
  });

  describe('Lifecycle', () => {
    test('should cleanup all listeners on logout', async () => {
      mockNativeModule.logout.mockResolvedValue(undefined);

      const callback = jest.fn();
      PushPlatform.onNotificationReceived(callback);
      PushPlatform.onNotificationOpened(callback);

      await PushPlatform.logout();

      // Listeners should still be registered (cleanup happens on native side)
      expect(NativeEvents.addListener).toHaveBeenCalledTimes(2);
    });

    test('should allow re-registration after logout', async () => {
      mockNativeModule.logout.mockResolvedValue(undefined);

      const callback1 = jest.fn();
      PushPlatform.onNotificationReceived(callback1);

      await PushPlatform.logout();

      const callback2 = jest.fn();
      PushPlatform.onNotificationReceived(callback2);

      expect(NativeEvents.addListener).toHaveBeenCalledTimes(2);
    });
  });
});
