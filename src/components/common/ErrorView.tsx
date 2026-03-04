import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/src/i18n';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
  textColor?: string;
  subTextColor?: string;
  buttonColor?: string;
}

function WarningIcon({ color = '#EF4444' }: { color?: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 9V13M12 17H12.01M12 3L2 21H22L12 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ErrorView({
  message,
  onRetry,
  retryText,
  textColor = '#1F2937',
  subTextColor = '#6B7280',
  buttonColor = '#6366F1',
}: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <WarningIcon color={subTextColor} />
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: buttonColor }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>{retryText || t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
