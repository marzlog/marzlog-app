import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 60;
const CARD_HEIGHT = 437;

interface ScheduleCardProps {
  id: string;
  title: string;
  location?: string;
  time: string;
  imageUrl: string;
  emoji?: string;
  groupCount?: number;  // 그룹 내 이미지 수 (2 이상이면 배지 표시)
  onPress?: () => void;
  onEmojiPress?: () => void;
}

export function ScheduleCard({
  id,
  title,
  location,
  time,
  imageUrl,
  emoji,
  groupCount,
  onPress,
  onEmojiPress,
}: ScheduleCardProps) {
  return (
    <View style={styles.container}>
      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {location && (
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          )}
        </View>
      </View>

      {/* Image Card */}
      <TouchableOpacity
        style={styles.imageCard}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Overlay Buttons */}
        <View style={styles.overlayContainer}>
          {/* Emoji Button */}
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={onEmojiPress}
            activeOpacity={0.8}
          >
            <Ionicons name="happy-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          {/* Time Badge */}
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{time}</Text>
          </View>
        </View>

        {/* Group Count Badge (+N 형식) */}
        {groupCount && groupCount > 1 && (
          <View style={styles.groupBadge}>
            <Ionicons name="copy-outline" size={14} color="#fff" />
            <Text style={styles.groupBadgeText}>+{groupCount - 1}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  infoSection: {
    height: 55,
    paddingTop: 12,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  textContainer: {
    gap: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.63,
    lineHeight: 25,
  },
  location: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
    opacity: 0.5,
    letterSpacing: -0.24,
    lineHeight: 18,
  },
  imageCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emojiButton: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: colors.neutral['0.5'],
    borderRadius: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: colors.neutral['0.5'],
    borderRadius: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text.primary,
    letterSpacing: -0.24,
    lineHeight: 18,
  },
  groupBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ScheduleCard;
