import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  text: string;
  fontSize?: number;
  isDark?: boolean;
}

export function AiNotice({ text, fontSize = 11, isDark = false }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="sparkles" size={12} color={isDark ? '#6B7280' : '#9CA3AF'} />
      <Text style={[styles.text, { fontSize }, isDark && styles.textDark]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  text: {
    color: '#9CA3AF',
    flex: 1,
  },
  textDark: {
    color: '#6B7280',
  },
});
