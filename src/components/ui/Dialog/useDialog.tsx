/**
 * useDialog Hook
 *
 * 전역 Dialog 상태 관리
 * - alert: 단일 확인 버튼
 * - confirm: 취소 + 확인 버튼
 * - danger: 삭제 등 위험한 작업용
 *
 * B-PAYWALL-HANG: 표시는 scheduleDialogPresentation 으로 다음 프레임·상호작용 종료(앱 비활성이면 active 복귀) 뒤로
 * 미룬다. promise 는 어떤 경우에도 끝난다 — 새 대화상자가 앞 것을 대체하거나 Provider 가 해제되면 앞 것은
 * '닫힘'(alert: void · confirm: false · choose: null)으로 끝난다.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { Dialog, DialogVariant } from './Dialog';
import { scheduleDialogPresentation, type DialogPresentationDeps } from './dialogPresentation';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';

interface DialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

interface ChooseOptions {
  title: string;
  description?: string;
  confirmText: string;
  destructiveText: string;
  cancelText?: string;
}

/** choose()의 반환값: 'confirm' | 'destructive' | null(취소) */
export type ChooseResult = 'confirm' | 'destructive' | null;

interface DialogContextType {
  /** 알림 다이얼로그 (확인 버튼만) */
  alert: (title: string, description?: string) => Promise<void>;
  /** 확인 다이얼로그 (취소/확인 버튼) */
  confirm: (options: DialogOptions) => Promise<boolean>;
  /** 삭제 확인 다이얼로그 */
  confirmDelete: (itemName?: string) => Promise<boolean>;
  /** 3버튼 선택 다이얼로그 (확인/위험/취소) */
  choose: (options: ChooseOptions) => Promise<ChooseResult>;
}

const DialogContext = createContext<DialogContextType | null>(null);

const presentationDeps: DialogPresentationDeps = {
  getAppState: () => AppState.currentState,
  onActive: (cb) => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') cb();
    });
    return () => sub.remove();
  },
  nextFrame: (cb) => {
    requestAnimationFrame(() => cb());
  },
  afterInteractions: (cb) => {
    InteractionManager.runAfterInteractions(cb);
  },
  delay: (ms, cb) => {
    setTimeout(cb, ms);
  },
};

interface DialogState {
  visible: boolean;
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  destructiveText?: string;
  variant: DialogVariant;
  hasCancel: boolean;
  hasDestructive: boolean;
}

/** 열려 있거나 표시 대기 중인 대화상자의 promise — closed 는 '닫힘'으로 끝낼 때의 값 */
interface PendingDialog {
  resolve: (value: any) => void;
  closed: unknown;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();

  const initialState: DialogState = {
    visible: false,
    title: '',
    description: undefined,
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    destructiveText: undefined,
    variant: 'confirm',
    hasCancel: true,
    hasDestructive: false,
  };

  const [state, setState] = useState<DialogState>(initialState);
  const pendingRef = useRef<PendingDialog | null>(null);
  const cancelScheduleRef = useRef<(() => void) | null>(null);

  // 대기 중인 promise 를 value 로 끝낸다(중복 settle 없음)
  const settle = useCallback((value: unknown) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.resolve(value);
  }, []);

  // 표시 예약 취소 + 앞 대화상자를 '닫힘'으로 끝낸다
  const dropCurrent = useCallback(() => {
    cancelScheduleRef.current?.();
    cancelScheduleRef.current = null;
    const pending = pendingRef.current;
    if (pending) settle(pending.closed);
  }, [settle]);

  useEffect(() => dropCurrent, [dropCurrent]);

  const open = useCallback(<T,>(next: Omit<DialogState, 'visible'>, closed: T): Promise<T> => {
    return new Promise<T>((resolve) => {
      dropCurrent();
      setState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      pendingRef.current = { resolve, closed };
      cancelScheduleRef.current = scheduleDialogPresentation(() => {
        cancelScheduleRef.current = null;
        setState({ ...next, visible: true });
      }, presentationDeps);
    });
  }, [dropCurrent]);

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const showDialog = useCallback((options: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    hasCancel?: boolean;
  }): Promise<boolean> => {
    return open({
      title: options.title,
      description: options.description,
      confirmText: options.confirmText || t('common.confirm'),
      cancelText: options.cancelText || t('common.cancel'),
      destructiveText: undefined,
      variant: options.variant || 'confirm',
      hasCancel: options.hasCancel !== false,
      hasDestructive: false,
    }, false);
  }, [t, open]);

  const handleConfirm = useCallback(() => {
    settle(state.hasDestructive ? 'confirm' : true);
    setState(initialState);
  }, [settle, state.hasDestructive]);

  const handleCancel = useCallback(() => {
    settle(state.hasDestructive ? null : false);
    setState(initialState);
  }, [settle, state.hasDestructive]);

  const handleDestructive = useCallback(() => {
    settle('destructive');
    setState(initialState);
  }, [settle]);

  // alert: 단일 확인 버튼
  const alert = useCallback(async (title: string, description?: string): Promise<void> => {
    await showDialog({
      title,
      description,
      variant: 'alert',
      hasCancel: false,
    });
  }, [showDialog]);

  // confirm: 취소/확인 버튼
  const confirm = useCallback(async (options: DialogOptions): Promise<boolean> => {
    return showDialog({
      ...options,
      hasCancel: true,
    });
  }, [showDialog]);

  // confirmDelete: 삭제 확인
  const confirmDelete = useCallback(async (itemName?: string): Promise<boolean> => {
    return showDialog({
      title: t('dialog.deleteConfirmTitle'),
      description: itemName
        ? t('dialog.deleteConfirmDescWithName', { name: itemName })
        : t('dialog.deleteConfirmDesc'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      hasCancel: true,
    });
  }, [showDialog, t]);

  // choose: 3버튼 선택 (confirm / destructive / cancel)
  const choose = useCallback(async (options: ChooseOptions): Promise<ChooseResult> => {
    return open<ChooseResult>({
      title: options.title,
      description: options.description,
      confirmText: options.confirmText,
      cancelText: options.cancelText || t('common.cancel'),
      destructiveText: options.destructiveText,
      variant: 'confirm',
      hasCancel: true,
      hasDestructive: true,
    }, null);
  }, [t, open]);

  return (
    <DialogContext.Provider value={{ alert, confirm, confirmDelete, choose }}>
      {children}
      <Dialog
        visible={state.visible}
        title={state.title}
        description={state.description}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        destructiveText={state.destructiveText}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={state.hasCancel ? handleCancel : undefined}
        onDestructive={state.hasDestructive ? handleDestructive : undefined}
        isDark={isDark}
      />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextType {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}

export default useDialog;
