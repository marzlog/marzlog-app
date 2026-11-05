import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { resolveDiaryTone, type DiaryTone } from '@/src/constants/diaryTones';
import { buildToneSheetVM } from '@/src/utils/toneViewModel';
import type { TextRef } from '@/src/utils/paywallViewModel';
import { borderRadius, darkTheme, fontScaleCap, lightTheme, spacing, typography, type Theme } from '@/src/theme';
import { PlusCta } from './plus/PlusCta';
import { plusColors } from './plus/plusColors';

/**
 * 문체 선택 시트 (D10-c · D10-c2) — Plus 재생성에서 쓴다.
 *
 * 3카드(진솔·문학적·간결)에서 하나를 고르고 확인하면 onConfirm(tone). 열릴 때 최근에 고른 문체(users.diary_tone)가
 * 미리 선택되고 "최근" 배지가 붙는다. 재생성·최근 문체 저장·Plus 판정은 부르는 화면이 한다.
 * 표시는 buildToneSheetVM(순수 함수). 레이아웃은 PlusUpsellSheet 와 같다(B-SHEET-FONT-SCALE —
 * 본문만 스크롤, 최대 화면 높이 70%, 버튼은 스크롤 밖 고정). 바깥 누름·Android 뒤로가기는 onClose.
 */
const MIN_TOUCH = 44;
/** 본문 스크롤 영역 최대 높이 = 화면 높이의 비율(B-SHEET-FONT-SCALE) — PlusUpsellSheet 와 같다 */
const BODY_MAX_HEIGHT_RATIO = 0.7;

interface ToneSheetProps {
  visible: boolean;
  /** 최근에 고른 문체(/auth/me diary_tone) — 열릴 때 선택값이고 "최근"으로 표시 */
  lastUsedTone: unknown;
  isPlus: boolean;
  /** Free 에게 Plus 문체 잠금 표시 — 재생성 시트는 Plus 만 열어 false(기본) */
  showLocks?: boolean;
  /** 재생성할 카드의 현재 문체 — 있으면 제목 아래 "지금 문체: ○○" (D10-c2) */
  currentTone?: unknown;
  /** 제목 아래 1줄 안내 */
  body: TextRef;
  confirmLabel: TextRef;
  onConfirm: (tone: DiaryTone) => void;
  onClose: () => void;
}

export function ToneSheet({ visible, lastUsedTone, currentTone, isPlus, showLocks = false, body, confirmLabel, onConfirm, onClose }: ToneSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { t } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme: Theme = isDark ? darkTheme : lightTheme;
  const accent = plusColors(theme, isDark);

  const [selected, setSelected] = useState<DiaryTone>(resolveDiaryTone(lastUsedTone));

  // 열릴 때마다 최근 문체에서 시작한다
  useEffect(() => {
    if (visible) setSelected(resolveDiaryTone(lastUsedTone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const vm = buildToneSheetVM({ lastUsedTone, selected, isPlus, showLocks, currentTone });
  const tx = (ref: TextRef) => t(ref.key, ref.params);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} accessibilityLabel={t('common.cancel')}>
        <View
          style={[styles.sheet, { backgroundColor: theme.background.primary, paddingBottom: insets.bottom + spacing.base }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: theme.border.default }]} />
          <ScrollView
            style={[styles.bodyScroll, { maxHeight: windowHeight * BODY_MAX_HEIGHT_RATIO }]}
            contentContainerStyle={styles.content}
            bounces={false}
          >
            <Text maxFontSizeMultiplier={fontScaleCap.title} style={[styles.title, { color: theme.text.primary }]} accessibilityRole="header">
              {t('tone.title')}
            </Text>
            {vm.current && (
              <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.current, { color: theme.text.primary }]}>
                {t(vm.current.key, { tone: t(vm.current.toneKey) })}
              </Text>
            )}
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.body, { color: theme.text.secondary }]}>{tx(body)}</Text>

            {vm.cards.map((card) => (
              <TouchableOpacity
                key={card.tone}
                onPress={() => setSelected(card.tone)}
                accessibilityRole="radio"
                accessibilityState={{ selected: card.selected }}
                style={[
                  styles.card,
                  { backgroundColor: theme.surface.secondary, borderColor: card.selected ? accent.ctaBackground : 'transparent' },
                ]}
              >
                <View style={styles.cardText}>
                  <View style={styles.cardTitleRow}>
                    <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.cardLabel, { color: theme.text.primary }]}>{tx(card.label)}</Text>
                    {card.isLastUsed && (
                      <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.chip, { color: theme.text.secondary, borderColor: theme.border.default }]}>
                        {t('tone.lastUsedBadge')}
                      </Text>
                    )}
                    {card.locked && (
                      <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.chip, { color: accent.ctaBackground, borderColor: accent.ctaBackground }]}>
                        {t('paywall.compare.plus')}
                      </Text>
                    )}
                  </View>
                  <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.cardDesc, { color: theme.text.secondary }]}>{tx(card.description)}</Text>
                </View>
                <Ionicons
                  name={card.selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={card.selected ? accent.ctaBackground : theme.icon.primary}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.buttons}>
            <PlusCta label={tx(confirmLabel)} onPress={() => onConfirm(selected)} colors={accent} />
            <TouchableOpacity onPress={onClose} style={styles.secondary} accessibilityRole="button">
              <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.secondaryText, { color: theme.text.secondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.sm },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold },
  current: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold },
  body: { fontSize: typography.fontSize.base, lineHeight: typography.fontSize.base * typography.lineHeight.normal },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.base,
  },
  cardText: { flex: 1, gap: spacing.xs },
  // 글자 확대에서 칩이 다음 줄로 내려가게 wrap
  cardTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  cardLabel: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semiBold },
  cardDesc: { fontSize: typography.fontSize.sm },
  chip: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  // flexShrink: 화면이 짧으면 본문이 줄어든다(버튼은 잘리지 않음) — PlusUpsellSheet 와 같다
  bodyScroll: { flexGrow: 0, flexShrink: 1 },
  buttons: { gap: spacing.xs, marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  secondary: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium },
});
