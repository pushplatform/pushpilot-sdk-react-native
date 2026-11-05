import { useEffect, useState } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import PushPlatform from '@pushplatform/react-native';

const config = {
  apiKey: process.env.EXPO_PUBLIC_PUSHPILOT_API_KEY || 'pk_replace_with_client_key',
  applicationId: process.env.EXPO_PUBLIC_PUSHPILOT_APPLICATION_ID || '00000000-0000-4000-8000-000000000000',
  url: process.env.EXPO_PUBLIC_PUSHPILOT_API_URL || 'https://api.example.invalid',
  environment: 'development' as const,
  debugMode: __DEV__,
};

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [permission, setPermission] = useState('not requested');
  const log = (message: string) => setLogs((current) => [...current, message]);

  useEffect(() => {
    let received: { remove: () => void } | undefined;
    let opened: { remove: () => void } | undefined;
    const registration = PushPlatform.onRegistrationUpdated((update) => {
      log(`registration: ${update.type || 'native'} / ${update.success ? 'success' : update.error || 'failed'}`);
    });

    PushPlatform.initialize(config)
      .then(() => {
        received = PushPlatform.onNotificationReceived((context) => {
          log(`received: ${context.notification.title || context.notification.id}`);
        });
        opened = PushPlatform.onNotificationOpened((context) => {
          log(`opened: ${context.notification.id}`);
        });
        return PushPlatform.getInstallationId();
      })
      .then((installationId) => log(`initialized: ${installationId}`))
      .catch((error) => log(`initialization error: ${error.message}`));

    return () => {
      registration.remove();
      received?.remove();
      opened?.remove();
    };
  }, []);

  async function requestPermissions() {
    try {
      setPermission((await PushPlatform.requestPermissions()) ? 'granted' : 'denied');
    } catch (error) {
      setPermission(`error: ${String(error)}`);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>PushPilot Expo example</Text>
        <Text>Permission: {permission}</Text>
        <Button title="Request notification permission" onPress={requestPermissions} />
        {logs.map((message, index) => <Text key={`${message}-${index}`} style={styles.log}>{message}</Text>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '600' },
  log: { fontFamily: 'Menlo', fontSize: 12 },
});
