import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { palette, lightTheme, darkTheme, Theme } from '@/src/theme/colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 24; // Figma: 풀 너비에 가깝게
const CARD_HEIGHT = 437;

// Figma 기반 이모티콘 아이콘 (감정 표시용)
function EmotionIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="8" stroke={color} strokeWidth={1.5} />
      <Circle cx="7" cy="8" r="1" fill={color} />
      <Circle cx="13" cy="8" r="1" fill={color} />
      <Path
        d="M7 12C7.5 13.5 8.5 14 10 14C11.5 14 12.5 13.5 13 12"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// 복사(그룹) 아이콘
function CopyIcon({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M11.667 5.25H6.417C5.773 5.25 5.25 5.773 5.25 6.417V11.667C5.25 12.311 5.773 12.833 6.417 12.833H11.667C12.311 12.833 12.833 12.311 12.833 11.667V6.417C12.833 5.773 12.311 5.25 11.667 5.25Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.917 8.75H2.333C2.024 8.75 1.728 8.627 1.509 8.409C1.291 8.191 1.167 7.894 1.167 7.583V2.333C1.167 2.022 1.291 1.726 1.509 1.508C1.728 1.29 2.024 1.167 2.333 1.167H7.583C7.894 1.167 8.191 1.29 8.409 1.508C8.627 1.726 8.75 2.022 8.75 2.333V2.917"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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
  /** 테마 (외부 주입용, 없으면 자동 감지) */
  theme?: Theme;
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
  theme: externalTheme,
}: ScheduleCardProps) {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();

  // 다크모드 결정
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme = externalTheme || (isDark ? darkTheme : lightTheme);

  return (
    <View style={styles.container}>
      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
            {title}
          </Text>
          {location && (
            <Text style={[styles.location, { color: theme.text.secondary }]} numberOfLines={1}>
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
          {/* Emoji Button (Figma: 반투명 배경 + 이모티콘 아이콘) */}
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={onEmojiPress}
            activeOpacity={0.8}
          >
            <EmotionIcon color={palette.neutral[900]} />
          </TouchableOpacity>

          {/* Time Badge (Figma: 반투명 배경 + 시간 텍스트) */}
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{time}</Text>
          </View>
        </View>

        {/* Group Count Badge (+N 형식) */}
        {groupCount && groupCount > 1 && (
          <View style={styles.groupBadge}>
            <CopyIcon color="#fff" />
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
    marginBottom: 16,
  },
  infoSection: {
    height: 55,
    paddingTop: 12,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  textContainer: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.63,
    lineHeight: 25,
  },
  location: {
    fontSize: 12,
    fontWeight: '500',
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Figma: 반투명 배경
    borderRadius: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Figma: 반투명 배경
    borderRadius: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: palette.neutral[900],
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ScheduleCard;
