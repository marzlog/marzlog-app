import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { t } from '@/src/i18n';

interface ShareCardViewProps {
  imageUrl: string;
  caption: string;
}

const CARD_WIDTH = 360;

export const ShareCardView = forwardRef<View, ShareCardViewProps>(
  ({ imageUrl, caption }, ref) => (
    <View
      ref={ref}
      style={styles.container}
      collapsable={false}
    >
      <Image
        source={imageUrl}
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.captionArea}>
        <Text style={styles.label}>{t('share.aiCaption')}</Text>
        <Text style={styles.captionText}>"{caption}"</Text>
        <Text style={styles.watermark}>{t('share.watermark')}</Text>
      </View>
    </View>
  )
);

ShareCardView.displayName = 'ShareCardView';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    width: CARD_WIDTH,
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
  },
  captionArea: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 8,
  },
  captionText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  watermark: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'right',
    marginTop: 12,
  },
});

export default ShareCardView;
