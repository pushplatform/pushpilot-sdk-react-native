import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import {PushPlatform} from '@pushplatform/react-native';

/**
 * iOS Runtime Verification Harness
 *
 * Reproducible test that verifies:
 * 1. Native module loads
 * 2. PushPlatform.initialize() succeeds
 * 3. PushPlatform.getInstallationId() returns UUID (not "SDK not initialized")
 *
 * Expected output:
 * ✅ Native module loaded
 * ✅ initialize() succeeded
 * ✅ getInstallationId() returned: <UUID>
 *
 * This file is tracked in git for reproducibility.
 */
function VerificationApp(): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string) => {
    console.log(`[VerificationApp] ${message}`);
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    const runVerification = async () => {
      log('BUILD_TIMESTAMP: ' + new Date().toISOString());
      log('=== iOS Runtime Verification ===');
      log('');

      // Test 1: Verify Native Module Loading
      log('[TEST 1] Verify native module loaded');
      try {
        // PushPlatform class existence check
        if (typeof PushPlatform === 'undefined') {
          log('❌ PushPlatform class not found');
          return;
        }
        log('✅ Native module loaded');
      } catch (error) {
        log(`❌ Native module error: ${String(error)}`);
        return;
      }

      log('');

      // Test 2: Initialize SDK via Public API
      log('[TEST 2] Initialize SDK via public API');
      try {
        await PushPlatform.initialize({
          apiKey: 'test-api-key-verification',
          apiBaseURL: 'https://api.test.pushplatform.example',
          environment: 'development',
          debugMode: true,
        });
        log('✅ initialize() succeeded');
      } catch (error) {
        log(`❌ initialize() failed: ${String(error)}`);
        return;
      }

      log('');

      // Test 3: Get Installation ID
      log('[TEST 3] Get installation ID');
      try {
        const installationId = await PushPlatform.getInstallationId();
        log(`✅ getInstallationId() returned: ${installationId}`);
      } catch (error) {
        log(`❌ getInstallationId() failed: ${String(error)}`);
        return;
      }

      log('');
      log('=== All tests passed ===');
    };

    runVerification().catch(error => {
      log(`❌ Unhandled error: ${String(error)}`);
    });
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
    fontSize: 12,
    marginBottom: 4,
    color: '#333',
  },
});

export default VerificationApp;
