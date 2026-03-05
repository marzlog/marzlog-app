import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '../../store/settingsStore';
import { useTranslation } from '../../hooks/useTranslation';
import { sharePhoto, sharePhotoWithCaption, shareDiary } from '../../utils/shareUtils';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  caption?: string | null;
  diary?: {
    title: string;
    content: string;
  } | null;
  cardViewRef?: React.RefObject<any>;
}

type ShareMode = 'photo' | 'caption' | 'diary';

export function ShareSheet({ visible, onClose, imageUrl, caption, diary, cardViewRef }: ShareSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const [loadingMode, setLoadingMode] = useState<ShareMode | null>(null);

  const handleShare = useCallback(async (mode: ShareMode) => {
    setLoadingMode(mode);
    try {
      switch (mode) {
        case 'photo':
          await sharePhoto(imageUrl);
          break;
        case 'caption':
          if (cardViewRef?.current) {
            await sharePhotoWithCaption(cardViewRef);
          }
          break;
        case 'diary':
          if (diary) {
            await shareDiary(diary.title, diary.content, imageUrl);
          }
          break;
      }
      onClose();
    } catch (error: any) {
      if (error?.message?.includes('cancel') || error?.message?.includes('dismiss')) {
        // User cancelled sharing - not an error
      } else {
        Alert.alert(t('common.error'), t('share.error'));
      }
    } finally {
      setLoadingMode(null);
    }
  }, [imageUrl, caption, diary, cardViewRef, onClose, t]);

  const hasCaption = !!caption;
  const hasDiary = !!(diary?.title && diary?.content);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: insets.bottom + 16 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <Text style={[styles.title, isDark && styles.textLight]}>{t('share.title')}</Text>

          {/* Option A: Photo only */}
          <TouchableOpacity
            style={[styles.option, isDark && styles.optionDark]}
            onPress={() => handleShare('photo')}
            disabled={!!loadingMode}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="image-outline" size={22} color="#FA5252" />
              <Text style={[styles.optionText, isDark && styles.textLight]}>{t('share.photoOnly')}</Text>
            </View>
            {loadingMode === 'photo' ? (
              <ActivityIndicator size="small" color="#FA5252" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {/* Option B: Photo + AI caption */}
          {hasCaption && (
            <TouchableOpacity
              style={[styles.option, isDark && styles.optionDark]}
              onPress={() => handleShare('caption')}
              disabled={!!loadingMode}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="chatbubble-outline" size={22} color="#FA5252" />
                <Text style={[styles.optionText, isDark && styles.textLight]}>{t('share.photoWithCaption')}</Text>
              </View>
              {loadingMode === 'caption' ? (
                <ActivityIndicator size="small" color="#FA5252" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          )}

          {/* Option C: Diary */}
          {hasDiary && (
            <TouchableOpacity
              style={[styles.option, isDark && styles.optionDark]}
              onPress={() => handleShare('diary')}
              disabled={!!loadingMode}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="book-outline" size={22} color="#FA5252" />
                <Text style={[styles.optionText, isDark && styles.textLight]}>{t('share.diary')}</Text>
              </View>
              {loadingMode === 'diary' ? (
                <ActivityIndicator size="small" color="#FA5252" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          )}

          {/* Cancel */}
          <TouchableOpacity
            style={[styles.cancelButton, isDark && styles.cancelButtonDark]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, isDark && styles.textLight]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  sheetDark: {
    backgroundColor: '#1F2937',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  textLight: {
    color: '#F9FAFB',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  optionDark: {
    backgroundColor: '#374151',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  cancelButtonDark: {
    backgroundColor: '#374151',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default ShareSheet;
