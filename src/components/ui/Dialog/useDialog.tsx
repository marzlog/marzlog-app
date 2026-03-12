/**
 * useDialog Hook
 *
 * 전역 Dialog 상태 관리
 * - alert: 단일 확인 버튼
 * - confirm: 취소 + 확인 버튼
 * - danger: 삭제 등 위험한 작업용
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dialog, DialogVariant } from './Dialog';
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
  resolve: ((value: any) => void) | null;
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
    resolve: null,
  };

  const [state, setState] = useState<DialogState>(initialState);

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
    return new Promise((resolve) => {
      setState({
        visible: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText || t('common.confirm'),
        cancelText: options.cancelText || t('common.cancel'),
        variant: options.variant || 'confirm',
        hasCancel: options.hasCancel !== false,
        hasDestructive: false,
        resolve,
      });
    });
  }, [t]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(state.hasDestructive ? 'confirm' : true);
    setState(initialState);
  }, [state.resolve, state.hasDestructive]);

  const handleCancel = useCallback(() => {
    state.resolve?.(state.hasDestructive ? null : false);
    setState(initialState);
  }, [state.resolve, state.hasDestructive]);

  const handleDestructive = useCallback(() => {
    state.resolve?.('destructive');
    setState(initialState);
  }, [state.resolve]);

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
    return new Promise((resolve) => {
      setState({
        visible: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText,
        cancelText: options.cancelText || t('common.cancel'),
        destructiveText: options.destructiveText,
        variant: 'confirm',
        hasCancel: true,
        hasDestructive: true,
        resolve,
      });
    });
  }, []);

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
