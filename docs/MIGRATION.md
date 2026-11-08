# Migration to PushPilot React Native SDK 2.0.1

Follow [INSTALLATION.md](INSTALLATION.md) for platform setup and
[MIGRATION_2.md](MIGRATION_2.md) for native delivery and call ownership.

1. Configure the application's APNs/FCM credentials on the PushPilot server.
2. Install `@pushplatform/react-native`. Initialize with `applicationId`, call
   `login(externalUserId)` for the signed-in user and `logout()` on sign-out.
   Keep the permanent send key on the backend.
3. Register notification listeners once. Restore navigation and call state after
   cold launch using your application's authoritative state.
4. Forward platform callbacks when the host already owns APNs/PushKit/FCM handlers.
   Keep one native owner of PushKit and CallKit. PushPilot transports payloads and
   reports delivery; the host owns answering, declining, signalling and media.
5. Route a test cohort through PushPilot only after successful SDK registration
   and user association. Legacy provider IDs do not become PushPilot installations.
6. Select one provider per recipient/event. Dual SDK registration does not prevent
   the legacy SDK from displaying a duplicate independently. Rollback can restore
   previous backend routing while legacy registrations remain valid.
7. Validate foreground/background/terminated delivery, locked screens, opens, badge,
   calls, answer, decline, cancellation, expiry and two-way audio on physical devices.

```typescript
import PushPlatform from '@pushplatform/react-native';

await PushPlatform.initialize({
  applicationId: 'YOUR_APPLICATION_UUID',
  debugMode: false,
});
await PushPlatform.login('your-user-id');
await PushPlatform.requestPermissions();
```

Retain the custom payload fields used by the application. Select transport with
`notification_type`; a business field such as `data.type` does not select APNs VoIP.
Remove the legacy SDK after validating the rollout and closing the rollback window.
