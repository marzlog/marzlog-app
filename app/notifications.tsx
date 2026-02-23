import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import announcementsApi, { Announcement } from '@src/api/announcements';

type TabType = 'all' | 'announcements' | 'personal';

// Unified item for FlatList
interface UnifiedItem {
  id: string;
  source: 'announcement' | 'notification';
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const { confirm } = useDialog();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const bgColor = isDark ? '#111827' : '#F5F5F0';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#2D3A35';
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E8E8E3';
  const tabActiveBg = isDark ? '#374151' : '#2D3A35';
  const tabInactiveBg = isDark ? '#1F2937' : '#FFFFFF';

  const fetchData = useCallback(async () => {
    try {
      const [notifData, annData] = await Promise.all([
        notificationsApi.getNotifications().catch(() => ({ notifications: [], total: 0 })),
        announcementsApi.getAnnouncements().catch(() => ({ announcements: [], total: 0, unread_count: 0 })),
      ]);
      setNotifications(notifData.notifications);
      setAnnouncements(annData.announcements);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Merge and sort by created_at
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const annItems: UnifiedItem[] = announcements.map(a => ({
      id: `ann_${a.id}`,
      source: 'announcement',
      title: a.title,
      body: a.body,
      type: a.type,
      is_read: a.is_read,
      created_at: a.created_at,
    }));

    const notifItems: UnifiedItem[] = notifications.map(n => ({
      id: `notif_${n.id}`,
      source: 'notification',
      title: n.title,
      body: n.body,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
    }));

    let items: UnifiedItem[];
    switch (activeTab) {
      case 'announcements':
        items = annItems;
        break;
      case 'personal':
        items = notifItems;
        break;
      default:
        items = [...annItems, ...notifItems];
    }

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [announcements, notifications, activeTab]);

  const handleItemPress = async (item: UnifiedItem) => {
    if (deleteMode) {
      if (item.source === 'notification') {
        toggleSelect(item.id);
      }
      return;
    }
    if (!item.is_read) {
      try {
        const realId = item.id.replace(/^(ann_|notif_)/, '');
        if (item.source === 'announcement') {
          await announcementsApi.markAsRead(realId);
          setAnnouncements(prev =>
            prev.map(a => a.id === realId ? { ...a, is_read: true } : a)
          );
        } else {
          await notificationsApi.markAsRead(realId);
          setNotifications(prev =>
            prev.map(n => n.id === realId ? { ...n, is_read: true } : n)
          );
        }
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
        const realIds = Array.from(selectedIds).map(id => id.replace(/^notif_/, ''));
        await notificationsApi.deleteNotifications(realIds);
        setNotifications(prev => prev.filter(n => !realIds.includes(n.id)));
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

  const getIcon = (item: UnifiedItem): { name: keyof typeof Ionicons.glyphMap; bgColor: string; color: string } => {
    if (item.source === 'announcement') {
      // 공지사항: 파란색
      return {
        name: 'megaphone-outline',
        bgColor: isDark ? '#1E3A5F' : '#EBF5FF',
        color: '#3B82F6',
      };
    }
    // 개인 알림: 빨간색
    const notifBg = isDark ? '#3B2020' : '#FFF0ED';
    if (item.type === 'recall') return { name: 'images-outline', bgColor: notifBg, color: '#FF6A5F' };
    if (item.type === 'marketing') return { name: 'gift-outline', bgColor: notifBg, color: '#FF6A5F' };
    return { name: 'notifications-outline', bgColor: notifBg, color: '#FF6A5F' };
  };

  const getTypeLabel = (item: UnifiedItem): string | null => {
    if (item.source !== 'announcement') return null;
    switch (item.type) {
      case 'system': return t('announcement.system');
      case 'event': return t('announcement.event');
      case 'update': return t('announcement.update');
      default: return null;
    }
  };

  const unreadAnnCount = announcements.filter(a => !a.is_read).length;
  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const renderTab = (tab: TabType, label: string, count?: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          { backgroundColor: isActive ? tabActiveBg : tabInactiveBg, borderColor },
        ]}
        onPress={() => { setActiveTab(tab); setDeleteMode(false); setSelectedIds(new Set()); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, { color: isActive ? '#FFFFFF' : subtextColor }]}>
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: UnifiedItem }) => {
    const icon = getIcon(item);
    const typeLabel = getTypeLabel(item);
    const isAnn = item.source === 'announcement';

    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          { backgroundColor: cardBg, borderColor },
          !item.is_read && (isAnn ? styles.notifCardUnreadAnn : styles.notifCardUnread),
        ]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {deleteMode && !isAnn && (
          <View style={[styles.checkbox, selectedIds.has(item.id) && styles.checkboxSelected]}>
            {selectedIds.has(item.id) && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
        )}
        <View style={[styles.notifIcon, { backgroundColor: icon.bgColor }]}>
          <Ionicons name={icon.name} size={18} color={icon.color} />
        </View>
        <View style={styles.notifContent}>
          {typeLabel && (
            <View style={styles.typeLabelRow}>
              <Text style={[styles.typeLabel, { color: isAnn ? '#3B82F6' : '#FF6A5F' }]}>
                {typeLabel}
              </Text>
              {!item.is_read && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{t('announcement.new')}</Text>
                </View>
              )}
            </View>
          )}
          <Text style={[styles.notifTitle, { color: textColor }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.body && (
            <Text style={[styles.notifBody, { color: subtextColor }]} numberOfLines={2}>
              {item.body}
            </Text>
          )}
          <Text style={[styles.notifDate, { color: subtextColor }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        {!item.is_read && !deleteMode && !typeLabel && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

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

      {/* Tabs */}
      <View style={styles.tabRow}>
        {renderTab('all', t('notification.tabAll'), unreadAnnCount + unreadNotifCount)}
        {renderTab('announcements', t('notification.tabAnnouncements'), unreadAnnCount)}
        {renderTab('personal', t('notification.tabPersonal'), unreadNotifCount)}
      </View>

      {/* List */}
      <FlatList
        data={unifiedItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={unifiedItems.length === 0 ? styles.emptyList : styles.listContent}
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabBadge: {
    backgroundColor: '#FF6A5F',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
  notifCardUnreadAnn: {
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
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
  typeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  newBadge: {
    backgroundColor: '#FF6A5F',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
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
