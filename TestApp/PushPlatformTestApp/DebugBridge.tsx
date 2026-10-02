import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, View, NativeModules} from 'react-native';

function DebugBridge(): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    const {PushPlatformBridge} = NativeModules;
    
    log('=== Bridge Debug ===');
    log('');
    log(`PushPlatformBridge exists: ${!!PushPlatformBridge}`);
    
    if (PushPlatformBridge) {
      log('');
      log('Available methods:');
      Object.keys(PushPlatformBridge).forEach(key => {
        log(`  - ${key}: ${typeof PushPlatformBridge[key]}`);
      });
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Bridge Debug</Text>
        </View>
        <View style={styles.logContainer}>
          {logs.map((logLine, index) => (
            <Text key={index} style={styles.logText}>
              {logLine}
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
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 5,
  },
});

export default DebugBridge;
