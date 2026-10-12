import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { PRIVACY_URL } from '@/src/constants/legal';

export default function PrivacyPolicyScreen() {
  useEffect(() => {
    WebBrowser.openBrowserAsync(PRIVACY_URL).then(() => {
      if (router.canGoBack()) router.back();
    });
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
