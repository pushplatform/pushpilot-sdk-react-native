/* eslint-disable @typescript-eslint/no-explicit-any */

import { NativeModules } from 'react-native';
import * as packageExports from '../index';
import { PushPlatform } from '../PushPlatform';
import { NativeEvents } from '../NativeModule';
import { deliverWillDisplay } from '../EventEmitter';
import type { NotificationWillDisplayEvent, PushNotification } from '../types';

const mockNativeModule = NativeModules.PushPlatformBridge;

describe('package exports', () => {
  test('stay PushPlatform only', () => {
    expect(Object.keys(packageExports).sort()).toEqual(['ErrorCode', 'PushPlatform', 'SDKError', 'default']);
    expect(packageExports.default).toBe(PushPlatform);
    expect(Object.keys(packageExports).some((name) => /OneSignal|LogLevel/.test(name))).toBe(false);
  });
});

describe('notificationId', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (PushPlatform as any).initialized = false;
    mockNativeModule.initialize.mockResolvedValue(undefined);
    await PushPlatform.initialize('11111111-1111-1111-1111-111111111111');
  });

  test('reaches onNotificationOpened', () => {
    const callback = jest.fn();
    PushPlatform.onNotificationOpened(callback);
    const listener = (NativeEvents.addListener as jest.Mock).mock.calls
      .find(([name]) => name === 'onNotificationOpened')[1];
    listener({
      notification: { id: 'event-1', notificationId: 'notification-1', data: { chat: '1' } },
      foreground: false,
      userInteraction: true,
    });
    expect(callback.mock.calls[0][0].notification).toEqual({
      id: 'event-1',
      notificationId: 'notification-1',
      data: { chat: '1' },
    });
  });

  test('reaches onNotificationWillDisplay', () => {
    const notification: PushNotification = { id: 'n1', notificationId: 'notification-2', data: {} };
    let seen: NotificationWillDisplayEvent | undefined;
    deliverWillDisplay([(event) => { seen = event; }], notification);
    expect(seen?.notification.notificationId).toBe('notification-2');
  });
});
