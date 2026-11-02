import { deliverWillDisplay } from '../EventEmitter';
import type { NotificationWillDisplayEvent, PushNotification } from '../types';

const notification: PushNotification = { id: 'n1', title: 'Hello', data: {} };

describe('notification will display', () => {
  test('shows the system banner when nobody is subscribed', () => {
    expect(deliverWillDisplay([], notification)).toBe(false);
  });

  test('hides the banner when preventDefault runs before the handler returns', () => {
    const listener = (event: NotificationWillDisplayEvent) => {
      event.preventDefault();
    };
    expect(deliverWillDisplay([listener], notification)).toBe(true);
  });

  test('ignores preventDefault after the handler returns', () => {
    let captured: NotificationWillDisplayEvent | undefined;
    const prevented = deliverWillDisplay([(event) => {
      captured = event;
    }], notification);
    captured?.preventDefault();
    expect(prevented).toBe(false);
  });
});
