import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';

interface EditAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: EditData) => Promise<void>;
  initialData: {
    caption: string;
    tags: string[];
    emotion: string;
    intensity: number;
  };
}

export interface EditData {
  caption?: string;
  tags?: string[];
  emotion?: string;
  intensity?: number;
}

const EMOTIONS = [
  { label: '기쁨', emoji: '😊' },
  { label: '평온', emoji: '😌' },
  { label: '사랑', emoji: '🥰' },
  { label: '감사', emoji: '🙏' },
  { label: '놀람', emoji: '😮' },
  { label: '불안', emoji: '😰' },
  { label: '슬픔', emoji: '😢' },
  { label: '분노', emoji: '😠' },
  { label: '몰입', emoji: '🎯' },
  { label: '생각', emoji: '🤔' },
  { label: '피곤', emoji: '😴' },
  { label: '아픔', emoji: '🤒' },
];

export function EditAnalysisModal({
  visible,
  onClose,
  onSave,
  initialData,
}: EditAnalysisModalProps) {
  const [caption, setCaption] = useState(initialData.caption);
  const [tagsText, setTagsText] = useState(initialData.tags.join(', '));
  const [emotion, setEmotion] = useState(initialData.emotion);
  const [intensity, setIntensity] = useState(initialData.intensity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCaption(initialData.caption);
      setTagsText(initialData.tags.join(', '));
      setEmotion(initialData.emotion);
      setIntensity(initialData.intensity);
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = tagsText
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await onSave({ caption, tags, emotion, intensity });
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>편집</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Caption */}
            <View style={styles.field}>
              <Text style={styles.label}>캡션</Text>
              <TextInput
                style={[styles.textInput, styles.multiline]}
                value={caption}
                onChangeText={setCaption}
                placeholder="사진 설명..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Tags */}
            <View style={styles.field}>
              <Text style={styles.label}>태그 (쉼표로 구분)</Text>
              <TextInput
                style={styles.textInput}
                value={tagsText}
                onChangeText={setTagsText}
                placeholder="음식, 여행, 가족..."
                placeholderTextColor="#999"
              />
            </View>

            {/* Emotion */}
            <View style={styles.field}>
              <Text style={styles.label}>감정</Text>
              <View style={styles.emotionGrid}>
                {EMOTIONS.map(e => (
                  <TouchableOpacity
                    key={e.label}
                    style={[
                      styles.emotionBtn,
                      emotion === e.label && styles.emotionBtnActive,
                    ]}
                    onPress={() => setEmotion(e.label)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emotionEmoji}>{e.emoji}</Text>
                    <Text
                      style={[
                        styles.emotionLabel,
                        emotion === e.label && styles.emotionLabelActive,
                      ]}
                    >
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Intensity */}
            <View style={styles.field}>
              <Text style={styles.label}>강도</Text>
              <View style={styles.intensityRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.intensityBtn,
                      intensity >= n && styles.intensityBtnActive,
                    ]}
                    onPress={() => setIntensity(n)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.intensityText,
                        intensity >= n && styles.intensityTextActive,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>저장</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 44,
  },
  multiline: {
    minHeight: 80,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '23%',
    backgroundColor: '#F9FAFB',
  },
  emotionBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  emotionEmoji: {
    fontSize: 22,
  },
  emotionLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  emotionLabelActive: {
    color: '#fff',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  intensityBtnActive: {
    backgroundColor: '#F08E76',
    borderColor: '#F08E76',
  },
  intensityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  intensityTextActive: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D3A35',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
