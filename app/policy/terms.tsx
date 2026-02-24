import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

const TERMS_URL = 'https://marzlog.com/terms';

export default function TermsOfServiceScreen() {
  useEffect(() => {
    WebBrowser.openBrowserAsync(TERMS_URL).then(() => {
      if (router.canGoBack()) router.back();
    });
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
