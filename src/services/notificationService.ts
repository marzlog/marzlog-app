import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import { getLanguage, t } from '../i18n';

// Foreground notification display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: Platform.OS === 'ios',
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android notification channel (required for Android 8+)
export const setupNotificationChannels = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('daily-reminder', {
    name: 'Daily Reminder',
    description: 'Daily memory recording reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FA5252',
    enableVibrate: true,
    enableLights: true,
  });
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: true,
    },
  });

  if (status !== 'granted') {
    Alert.alert(
      t('reminder.permissionTitle'),
      t('reminder.permissionMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('reminder.openSettings'), onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  return true;
};

export const scheduleDailyReminder = async (
  hour: number,
  minute: number,
): Promise<string | null> => {
  await cancelDailyReminder();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: getLanguage() === 'ko' ? '오늘의 기억' : "Today's Memory",
      body: getRandomMessage(),
      data: { screen: 'upload', action: 'daily_reminder' },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'daily-reminder', color: '#FA5252' }),
      ...(Platform.OS === 'ios' && { badge: 1 }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
};

export const cancelDailyReminder = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0);
  }
};

const MESSAGES_KO = [
  '오늘 하루, 어떤 순간이 기억에 남았나요?',
  '잊고 싶지 않은 오늘의 순간을 기록하세요.',
  '사진 한 장이 내일의 소중한 기억이 됩니다.',
  '오늘의 이야기를 사진으로 남겨보세요.',
  '지금 이 순간을 기억으로 저장하세요.',
  '하루를 마무리하며, 오늘의 기억을 남겨볼까요?',
];

const MESSAGES_EN = [
  'What moment stood out today?',
  'Capture a memory before the day ends.',
  'One photo today becomes a cherished memory tomorrow.',
  "Tell today's story through a photo.",
  'Save this moment before it fades.',
  'Wind down your day — capture a memory.',
];

const getRandomMessage = (): string => {
  const msgs = getLanguage() === 'ko' ? MESSAGES_KO : MESSAGES_EN;
  return msgs[Math.floor(Math.random() * msgs.length)];
};
