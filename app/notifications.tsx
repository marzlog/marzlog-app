import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { useDialog } from '@/src/components/ui/Dialog';
import notificationsApi, { Notification } from '@src/api/notifications';

export default function NotificationsScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const { confirm } = useDialog();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const bgColor = isDark ? '#111827' : '#F5F5F0';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#2D3A35';
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E8E8E3';

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data.notifications);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleItemPress = async (item: Notification) => {
    if (deleteMode) {
      toggleSelect(item.id);
      return;
    }
    if (!item.is_read) {
      try {
        await notificationsApi.markAsRead(item.id);
        setNotifications(prev =>
          prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
        );
      } catch {}
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await confirm({
      title: t('notification.deleteConfirmTitle'),
      description: t('notification.deleteConfirmDesc'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await notificationsApi.deleteNotifications(Array.from(selectedIds));
        setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
        setSelectedIds(new Set());
        setDeleteMode(false);
      } catch {}
    }
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedIds(new Set());
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours < 12 ? t('notification.am') : t('notification.pm');
    const h12 = hours % 12 || 12;
    return `${year}-${month}-${day}, ${ampm} ${String(h12).padStart(2, '0')}:${minutes}`;
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notifCard,
        { backgroundColor: cardBg, borderColor },
        !item.is_read && styles.notifCardUnread,
      ]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      {deleteMode && (
        <View style={[styles.checkbox, selectedIds.has(item.id) && styles.checkboxSelected]}>
          {selectedIds.has(item.id) && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </View>
      )}
      <View style={[styles.notifIcon, { backgroundColor: isDark ? '#374151' : '#FFF0ED' }]}>
        <Ionicons
          name={item.type === 'recall' ? 'images-outline' : item.type === 'marketing' ? 'megaphone-outline' : 'flag-outline'}
          size={18}
          color="#FF6A5F"
        />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: textColor }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.body && (
          <Text style={[styles.notifBody, { color: subtextColor }]} numberOfLines={1}>
            {item.body}
          </Text>
        )}
        <Text style={[styles.notifDate, { color: subtextColor }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>
      {!item.is_read && !deleteMode && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('@/assets/images/mascot.png')}
        style={styles.emptyMascot}
        resizeMode="contain"
      />
      <Text style={[styles.emptyText, { color: subtextColor }]}>
        {t('notification.empty')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A5F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{t('notification.title')}</Text>
        <TouchableOpacity onPress={toggleDeleteMode} style={styles.headerBtn}>
          <Ionicons
            name={deleteMode ? 'close' : 'trash-outline'}
            size={22}
            color={deleteMode ? '#FF6A5F' : textColor}
          />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6A5F" />
        }
      />

      {/* Delete Button (delete mode) */}
      {deleteMode && selectedIds.size > 0 && (
        <View style={styles.deleteBar}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteSelected}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>
              {t('notification.deleteSelected', { count: selectedIds.size })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  emptyList: {
    flexGrow: 1,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  notifCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6A5F',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifDate: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6A5F',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6A5F',
    borderColor: '#FF6A5F',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyMascot: {
    width: 100,
    height: 100,
    borderRadius: 25,
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  deleteBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  deleteButton: {
    backgroundColor: '#FF6A5F',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 50,
  },
  deleteButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
});
