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

interface DialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

interface DialogContextType {
  /** 알림 다이얼로그 (확인 버튼만) */
  alert: (title: string, description?: string) => Promise<void>;
  /** 확인 다이얼로그 (취소/확인 버튼) */
  confirm: (options: DialogOptions) => Promise<boolean>;
  /** 삭제 확인 다이얼로그 */
  confirmDelete: (itemName?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

interface DialogState {
  visible: boolean;
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  variant: DialogVariant;
  hasCancel: boolean;
  resolve: ((value: boolean) => void) | null;
}

const initialState: DialogState = {
  visible: false,
  title: '',
  description: undefined,
  confirmText: '확인',
  cancelText: '취소',
  variant: 'confirm',
  hasCancel: true,
  resolve: null,
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(initialState);
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();

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
        confirmText: options.confirmText || '확인',
        cancelText: options.cancelText || '취소',
        variant: options.variant || 'confirm',
        hasCancel: options.hasCancel !== false,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(initialState);
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
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
      title: '삭제하시겠습니까?',
      description: itemName
        ? `"${itemName}"을(를) 삭제합니다.\n삭제된 항목은 복구할 수 없습니다.`
        : '삭제된 항목은 복구할 수 없습니다.',
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
      hasCancel: true,
    });
  }, [showDialog]);

  return (
    <DialogContext.Provider value={{ alert, confirm, confirmDelete }}>
      {children}
      <Dialog
        visible={state.visible}
        title={state.title}
        description={state.description}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={state.hasCancel ? handleCancel : undefined}
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
