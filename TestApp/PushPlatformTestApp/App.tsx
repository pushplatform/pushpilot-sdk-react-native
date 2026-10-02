import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, View, Platform} from 'react-native';
import {PushPlatform} from '@pushplatform/react-native';

/**
 * Step 3: Cold Launch - Final Production Flow
 *
 * Cold launch verification:
 * 1. Native module loaded
 * 2. await initialize()
 * 3. await getInstallationId() → UUID
 * 4. onNotificationReceived() subscription
 * 5. Event lifecycle (actual delivery deferred to E2E if no test emitter)
 */
function App(): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[Step3][${timestamp}] ${message}`);
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    const runColdLaunchFlow = async () => {
      log('=== Step 3: Cold Launch - Final Production Flow ===');
      log('');
      log(`Platform.OS: ${Platform.OS}`);
      log(`React Native: ${Platform.constants?.reactNativeVersion?.major}.${Platform.constants?.reactNativeVersion?.minor}.${Platform.constants?.reactNativeVersion?.patch}`);
      log('');

      // 1. Native module
      log('[1/4] Checking native module...');
      try {
        if (typeof PushPlatform === 'undefined' || typeof PushPlatform.initialize !== 'function') {
          log('❌ Native module check failed');
          return;
        }
        log('✅ Native module loaded');
      } catch (error) {
        log(`❌ Native module error: ${String(error)}`);
        return;
      }

      log('');

      // 2. Initialize
      log('[2/4] Calling initialize()...');
      const initStart = Date.now();
      try {
        await PushPlatform.initialize({
          apiKey: 'test-api-key-cold-launch',
          apiBaseURL: 'https://api.test.pushplatform.example',
          environment: 'production',
          debugMode: true,
        });
        const initDuration = Date.now() - initStart;
        log(`✅ initialize() succeeded (${initDuration}ms)`);
      } catch (error: any) {
        log(`❌ initialize() failed: ${error?.code || 'UNKNOWN'} - ${error?.message || String(error)}`);
        return;
      }

      log('');

      // 3. Get Installation ID
      log('[3/4] Calling getInstallationId()...');
      const getIdStart = Date.now();
      try {
        const installationId = await PushPlatform.getInstallationId();
        const getIdDuration = Date.now() - getIdStart;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUUID = uuidRegex.test(installationId);

        if (isValidUUID) {
          log(`✅ getInstallationId() returned: ${installationId}`);
          log(`   Valid UUID format (${getIdDuration}ms)`);
        } else {
          log(`⚠️ getInstallationId() returned: ${installationId}`);
          log(`   Invalid UUID format`);
        }
      } catch (error: any) {
        log(`❌ getInstallationId() failed: ${error?.code || 'UNKNOWN'} - ${error?.message || String(error)}`);
        return;
      }

      log('');

      // 4. Event subscription
      log('[4/4] Testing event subscription...');
      try {
        const subscription = PushPlatform.onNotificationReceived((context) => {
          log(`📬 onNotificationReceived callback fired`);
          log(`   title: ${context.notification?.title || 'N/A'}`);
          log(`   isForegrounded: ${context.isForegrounded}`);
        });

        log('✅ Event listener attached (onNotificationReceived)');
        log('');
        log('Note: Actual push delivery requires APNs/FCM');
        log('      Subscription lifecycle: PASS');
        log('      Push event delivery: DEFERRED TO E2E');

        // Cleanup
        setTimeout(() => {
          subscription.remove();
          log('');
          log('Event listener removed');
          log('');
          log('=== Cold Launch Flow: ALL STEPS PASSED ===');
        }, 3000);
      } catch (error: any) {
        log(`❌ Event subscription failed: ${error?.code || 'UNKNOWN'} - ${error?.message || String(error)}`);
      }
    };

    runColdLaunchFlow();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.logContainer}>
          {logs.map((logMessage, index) => (
            <Text key={index} style={styles.logText}>
              {logMessage}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  logContainer: {
    padding: 16,
  },
  logText: {
    fontFamily: 'Menlo',
    fontSize: 10,
    marginBottom: 3,
    color: '#333',
  },
});

export default App;
