import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import NetInfo from '@react-native-community/netinfo';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@src/store/settingsStore';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';
import { useDialog } from '@/src/components/ui/Dialog';
import { Logo } from '@/src/components/common/Logo';
import { PlusCta } from '@/src/components/plus/PlusCta';
import { plusColors } from '@/src/components/plus/plusColors';
import { addBreadcrumb, captureError, captureMessage } from '@/src/utils/sentry';
import {
  checkPlusEntitlementForUserFresh,
  hasPlusEntitlementForUser,
  hasPlusEntitlementForUserFresh,
  loadPaywallOffer,
  purchasePaywallPlan,
  type PaywallOfferResult,
  type PaywallPlanKind,
} from '@src/services/purchases';
import { shouldCheckEntitlementOnResume } from '@src/services/purchaseRecovery';
import {
  countsAsAutoReflectAttempt,
  isNetworkRestored,
  isOnline,
  resolveRecheckRoute,
  resolveUnconfirmedRecheck,
} from '@src/services/reconnectRecheck';
import {
  PAYWALL_COMPARE_STORAGE,
  PAYWALL_DEFAULT_PLAN,
  PAYWALL_SUBHEAD,
  autoReflectExitTarget,
  buildAlreadyOwnedDialog,
  buildPaywallVM,
  footerFitsWithDisclosure,
  normalizePaywallSource,
  resolveLockedErrorAction,
  resolvePurchaseFollowUp,
  restoreExitTarget,
  shouldLoadOffer,
  shouldRedirectToSubscription,
  type PaywallExitTarget,
  type PaywallLockedProgress,
  type PaywallPlanVM,
  type PaywallReflectPhase,
  type TextRef,
} from '@src/utils/paywallViewModel';
import { waitForPlusReflected } from '@src/utils/plusReflect';
import { usePlusRestore } from '@src/hooks/usePlusRestore';
import { useReturnHome } from '@src/hooks/useReturnHome';
import { toPlusSuccessRouteParams } from '@src/utils/plusSuccessViewModel';
import {
  PLUS_REFLECT_ATTEMPT_TIMEOUT_MS,
  PLUS_REFLECT_INTERVAL_MS,
  PLUS_REFLECT_LONG_AFTER_MS,
  PLUS_REFLECT_MAX_WAIT_MS,
} from '@src/constants/plus';
import { PRIVACY_URL, TERMS_URL } from '@src/constants/legal';
import { borderRadius, darkTheme, fontScaleCap, lightTheme, palette, spacing, typography, type Theme } from '@src/theme';

/**
 * Marzlog Plus 결제 화면 (PAYWALL 명세 §3.1, 시안 01-paywall.png).
 *
 * ADR-2026-09-18-01 ②: Plus 표시 판정은 서버 user.plan 만 본다.
 * 구매/복원 성공은 /auth/me 재조회 트리거일 뿐 — SDK 결과로 Plus 를 단정하지 않는다.
 * 상태별 표시는 buildPaywallVM(순수 함수)이 정하고, 여기서는 렌더·이동·기록만 한다.
 *
 * 구매 완료(completed)는 서버 반영을 최대 PLUS_REFLECT_MAX_WAIT_MS 확인한 뒤(대기 문구 표시, 화면 잠금 유지)
 * 반영 여부와 무관하게 /plus-success 로 replace 한다(PW-7 — 미반영도 alert 없이
 * 완료 화면의 "반영 중" 변형으로).
 * 복원(PW-14): RC 응답에 활성 구독이 없으면 바로 restoreNone. 있으면 같은 반영 확인 → 반영되면 완료 화면(기본 변형),
 * 30초 안에 안 되면 완료 화면 "반영 중"(복원 확인 안내). 복원이 반영되면 구독 화면(/subscription?restored=1, D6-2).
 * 이미 Plus 로 들어오면 구독 화면으로 replace(D6-2) — "이용 중" 카드는 이동 전 한 번 그려질 수 있는 대체 표시.
 */
const MIN_TOUCH = 44;

/** 잠금이 풀린 뒤 띄울 안내(B-PAYWALL-HANG) */
type PaywallNoticeKey = 'paywall.failed' | 'paywall.identityMismatch' | 'paywall.restoreNone';

type RecheckTrigger = 'focus' | 'foreground' | 'reconnect';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const { alert, confirm } = useDialog();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const source = normalizePaywallSource(params.source);
  const runRestore = usePlusRestore(source);
  const returnHome = useReturnHome();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme: Theme = isDark ? darkTheme : lightTheme;
  const accent = plusColors(theme, isDark);
  const isPlus = user?.plan === 'plus';

  const [offerResult, setOfferResult] = useState<PaywallOfferResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PaywallPlanKind>(PAYWALL_DEFAULT_PLAN);
  const [busy, setBusy] = useState(false);
  // 조건 7: VM 의 locked(렌더 기준)와 별개로 핸들러에서도 중복 탭을 막는다(상태 반영 전 연타 대비)
  const busyRef = useRef(false);
  // 조건 1: 고지문까지 하단에 두되, 하단 영역이 화면 절반을 넘으면 고지문은 스크롤 끝으로 내린다
  const [disclosureInFooter, setDisclosureInFooter] = useState(true);
  // 구매 완료 후 이동할 완료 화면 파라미터 — 잠금(usePreventRemove)이 풀린 뒤에 이동한다
  const [exitTarget, setExitTarget] = useState<PaywallExitTarget | null>(null);
  // 구매 후 서버 반영 확인 단계 — 완료 화면으로 넘어갈 때까지 idle 로 되돌리지 않는다(VM 고정)
  const [reflectPhase, setReflectPhase] = useState<PaywallReflectPhase>('idle');
  // 결과 미확인 구매(unconfirmed) — 재확인 대상. 렌더용(CTA 아래 "확인 중" 문구)은 state, 핸들러 판단은 ref
  const unconfirmedPurchaseRef = useRef<{ kind: PaywallPlanKind; trial: boolean; price: string } | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const setUnconfirmedPurchase = (pending: { kind: PaywallPlanKind; trial: boolean; price: string } | null) => {
    unconfirmedPurchaseRef.current = pending;
    setAwaitingConfirmation(pending !== null);
  };

  const vm = buildPaywallVM({
    isAuthenticated,
    isPlus,
    loading,
    offerResult,
    selected,
    busy,
    reflecting: reflectPhase,
    awaitingConfirmation,
  });
  const tx = (ref: TextRef) => t(ref.key, ref.params);

  useEffect(() => {
    addBreadcrumb('paywall', 'view', { source });
  }, [source]);

  const loadOffer = useCallback(async () => {
    setLoading(true);
    const result = await loadPaywallOffer();
    addBreadcrumb('paywall', 'offer', { status: result.status });
    setOfferResult(result);
    setLoading(false);
  }, []);

  // 조건 3: 미인증(딥링크 진입 — 루트가 로그인으로 보낸다)·이미 Plus 면 조회하지 않는다
  const loadEnabled = shouldLoadOffer({ isAuthenticated, isPlus });
  useEffect(() => {
    if (loadEnabled) loadOffer();
  }, [loadEnabled, loadOffer]);

  // 글자 크기·화면 회전으로 높이가 바뀌면 다시 잰다
  useEffect(() => {
    setDisclosureInFooter(true);
  }, [windowHeight]);

  // 구매 중에는 화면이 닫히지 않게(Android 하드웨어 뒤로가기 포함) — 닫기 버튼도 비활성
  usePreventRemove(busy, () => {});

  // 잠금 중 replace 는 usePreventRemove 에 막히므로, 잠금이 풀린 렌더 뒤에 완료 화면으로 보낸다
  useEffect(() => {
    if (!busy && exitTarget) router.replace({ pathname: exitTarget.pathname, params: exitTarget.params });
  }, [busy, exitTarget, router]);

  // D6-2: 이미 Plus 면 구독 화면으로(반영 확인 중·잠금 중 제외 — 구매·복원 직후 이동은 각 흐름이 정한다)
  const redirectToSubscription = shouldRedirectToSubscription({
    isAuthenticated,
    isPlus,
    reflecting: reflectPhase,
    busy,
    awaitingConfirmation,
  });
  useEffect(() => {
    if (redirectToSubscription && !goingToSuccessRef.current) router.replace('/subscription');
  }, [redirectToSubscription, router]);

  // B-UNCONFIRMED-RACE: 결과 미확인 구매를 기다리는 중에 다른 경로로 Plus 가 반영되면 구독 화면이 아니라 구매 완료 화면으로
  const plusWhileAwaiting = isAuthenticated && isPlus && awaitingConfirmation && !busy && reflectPhase === 'idle';
  useEffect(() => {
    const pending = unconfirmedPurchaseRef.current;
    if (!plusWhileAwaiting || !pending || goingToSuccessRef.current) return;
    setUnconfirmedPurchase(null);
    addBreadcrumb('paywall', 'unconfirmed-reflected', { source });
    goToSuccess(toPlusSuccessRouteParams({ ...pending, reflected: true }));
    // goToSuccess·setUnconfirmedPurchase 는 ref·setState 만 쓴다
  }, [plusWhileAwaiting, source]);

  // 완료 화면으로 보내기로 정했는지 — 아니면 잠금이 풀릴 때 반영 확인 단계를 idle 로 되돌린다
  const goingToSuccessRef = useRef(false);
  const goToSuccess = (params: Record<string, string>, pathname: PaywallExitTarget['pathname'] = '/plus-success') => {
    goingToSuccessRef.current = true;
    // 표시 대기 중인 안내(실패 등)는 무의미해졌다 — 띄우지 않는다(떠 있으면 닫는다, B-UNCONFIRMED-RACE)
    noticeAbortRef.current?.abort();
    noticeAbortRef.current = null;
    setExitTarget({ pathname, params });
  };

  // 잠금 밖 안내 — 이동(goToSuccess)이 정해지면 취소된다. 새 안내는 앞 안내를 대체한다
  const noticeAbortRef = useRef<AbortController | null>(null);
  const showNotice = async (notice: PaywallNoticeKey) => {
    noticeAbortRef.current?.abort();
    const controller = new AbortController();
    noticeAbortRef.current = controller;
    try {
      await alert(t('paywall.title'), t(notice), { signal: controller.signal });
    } finally {
      if (noticeAbortRef.current === controller) noticeAbortRef.current = null;
    }
  };

  // D5-b-5: 예상 밖 오류에도 잠금이 풀리고, 스토어 거래가 끝난 뒤의 오류면 "실패" 대신 완료 화면 반영 중으로 보낸다
  // B-PAYWALL-HANG: 잠금 안에서는 대화상자를 기다리지 않는다 — task 는 안내 문구 키만 돌려주고, 대화상자는 잠금이
  // 풀린 뒤에 띄운다(시스템 시트가 닫히는 중이라 대화상자가 안 뜨면 잠금 안의 await 가 끝나지 않아 화면이 영영 잠겼다)
  const runLocked = async (task: (progress: { current: PaywallLockedProgress }) => Promise<PaywallNoticeKey | void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const progress: { current: PaywallLockedProgress } = { current: { stage: 'before-completion' } };
    let notice: PaywallNoticeKey | null = null;
    try {
      notice = (await task(progress)) ?? null;
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'paywall.locked', stage: progress.current.stage }, {
        tags: { area: 'paywall', source },
      });
      const action = resolveLockedErrorAction(progress.current);
      if (action.type === 'go-success') goToSuccess(action.params);
      else notice = 'paywall.failed';
    } finally {
      if (!goingToSuccessRef.current) setReflectPhase('idle');
      busyRef.current = false;
      setBusy(false);
    }
    if (notice) await showNotice(notice);
  };

  // 서버 반영 확인(최대 PLUS_REFLECT_MAX_WAIT_MS) — 대기 문구 단계는 완료 화면으로 넘어갈 때까지 유지
  const waitReflected = async (): Promise<boolean> => {
    setReflectPhase('checking');
    const longTimer = setTimeout(() => setReflectPhase('checking-long'), PLUS_REFLECT_LONG_AFTER_MS);
    try {
      const { reflected } = await waitForPlusReflected(
        async (timeoutMs) => (await useAuthStore.getState().refreshUser(timeoutMs)).plan === 'plus',
        {
          intervalMs: PLUS_REFLECT_INTERVAL_MS,
          maxWaitMs: PLUS_REFLECT_MAX_WAIT_MS,
          attemptTimeoutMs: PLUS_REFLECT_ATTEMPT_TIMEOUT_MS,
        },
      );
      return reflected;
    } finally {
      clearTimeout(longTimer);
    }
  };

  const handlePurchase = async () => {
    let offerRestore = false;
    await runLocked(async (progress) => {
      const kind = selected;
      const plan = offerResult?.status === 'ok' ? offerResult.offer[kind] : null;
      addBreadcrumb('paywall', 'purchase', { kind, phase: 'start', source });
      const outcome = await purchasePaywallPlan(kind, useAuthStore.getState().user?.id, source);
      addBreadcrumb('paywall', 'purchase', { kind, outcome, source });
      // B-UNCONFIRMED-RACE: 결과를 못 받았으면(네트워크·스토어 문제·시간 초과) 실패 안내 대신 "확인 중" 문구를 두고,
      // 네트워크 복귀·포그라운드 복귀 때 재확인 → 있으면 구매 완료 경로, '없음'이면 그때 실패 안내 1회
      setUnconfirmedPurchase(
        outcome === 'unconfirmed' ? { kind, trial: plan?.trial.eligible === true, price: plan?.priceString ?? '' } : null,
      );
      const followUp = resolvePurchaseFollowUp(outcome);
      if (followUp === 'none' || followUp === 'await-confirmation') return;
      // 구매 시트는 뜨지 않았다. 기록(tags reason)은 래퍼가 한 번 남겼다
      if (followUp === 'alert-identity') return 'paywall.identityMismatch';
      // captureError(tags area·kind·source·reason)는 purchasePaywallPlan 이 한 번 남겼다
      if (followUp === 'alert-failed') return 'paywall.failed';
      if (followUp === 'offer-restore') {
        // 기록(info, purchases-already-owned)은 래퍼가 남겼다. 대화상자는 잠금이 풀린 뒤에
        offerRestore = true;
        return;
      }
      const trial = plan?.trial.eligible === true;
      const price = plan?.priceString ?? '';
      progress.current = { stage: 'purchase-completed', kind, trial, price };
      const reflected = await waitReflected();
      if (!reflected) {
        captureMessage('paywall plus not reflected after purchase', { kind, source }, {
          level: 'warning',
          fingerprint: ['paywall-reflect-timeout'],
          tags: { area: 'paywall', kind, source },
        });
      }
      goToSuccess(toPlusSuccessRouteParams({ kind, trial, price, reflected }));
    });
    if (!offerRestore) return;

    // D5-c: 이 기기의 스토어 계정이 이미 구독 중 → 복원 안내. 복원은 기존 경로(신원 대조·PW-14·완료 화면)를 새 잠금으로
    const dialog = buildAlreadyOwnedDialog(Platform.OS);
    const restore = await confirm({
      title: tx(dialog.title),
      description: t(dialog.body.key, { store: tx(dialog.storeName) }),
      confirmText: tx(dialog.confirm),
      cancelText: tx(dialog.cancel),
    });
    addBreadcrumb('paywall', 'already-owned', { choice: restore ? 'restore' : 'close', source });
    if (restore) await handleRestore();
  };

  // B-PURCHASE-ERROR-AFTER-SUCCESS ②: 결제 화면 포커스·앱 복귀 때 RC 에 Plus 자격이 있는데 서버가 아직 free 면
  // 기존 반영 확인(waitReflected)을 자동으로 시작한다. 화면당 1회(미반영이 계속돼도 복귀마다 30초 잠그지 않게)
  // B-REFLECT-ON-RECONNECT: 네트워크 복귀도 트리거(빠른 설정에서 비행기 모드를 끄면 포커스·AppState 변화가 없다).
  // 대기 중 오프라인을 겪고 미반영이면 1회에 세지 않고 결제 화면에 남는다 → 다음 복귀 때 다시 시도
  const autoReflectDoneRef = useRef(false);
  const offlineSeenRef = useRef(false);
  const lastOnlineRef = useRef<boolean | null>(null);
  const canAutoCheck = () => {
    const auth = useAuthStore.getState();
    return shouldCheckEntitlementOnResume({
      isAuthenticated: auth.isAuthenticated,
      isPlus: auth.user?.plan === 'plus',
      busy: busyRef.current,
      autoReflectDone: autoReflectDoneRef.current,
    });
  };
  const autoReflectIfEntitled = async (trigger: RecheckTrigger) => {
    if (!canAutoCheck()) return;
    const userId = useAuthStore.getState().user?.id;
    const entitled = trigger === 'reconnect' ? await hasPlusEntitlementForUserFresh(userId) : await hasPlusEntitlementForUser(userId);
    if (!entitled || !canAutoCheck() || unconfirmedPurchaseRef.current) return;
    autoReflectDoneRef.current = true;
    addBreadcrumb('paywall', 'auto-reflect', { trigger, source });
    await runLocked(async (progress) => {
      progress.current = { stage: 'restore-active' };
      offlineSeenRef.current = false;
      const reflected = await waitReflected();
      if (!countsAsAutoReflectAttempt({ reflected, offlineDuringWait: offlineSeenRef.current })) {
        autoReflectDoneRef.current = false;
        addBreadcrumb('paywall', 'auto-reflect-offline', { trigger, source });
        return;
      }
      const target = autoReflectExitTarget(reflected);
      goToSuccess(target.params, target.pathname);
    });
  };

  // 결과 미확인 구매의 재확인 — RC 캐시를 비우고 자격 1회. 있으면 구매 완료 경로("결제를 확인하고 있어요" → /plus-success),
  // '없음'이면 그때 실패 안내 1회, 확인 불가(통신 전·기기 계산)면 "확인 중" 문구를 둔 채 다음 복귀를 기다린다
  const recheckUnconfirmed = async (trigger: RecheckTrigger) => {
    const pending = unconfirmedPurchaseRef.current;
    if (!pending || busyRef.current || !useAuthStore.getState().isAuthenticated) return;
    const check = await checkPlusEntitlementForUserFresh(useAuthStore.getState().user?.id);
    addBreadcrumb('paywall', 'unconfirmed-recheck', { trigger, check, source });
    if (unconfirmedPurchaseRef.current !== pending || busyRef.current) return;
    const action = resolveUnconfirmedRecheck(check);
    if (action === 'keep-waiting') return;
    setUnconfirmedPurchase(null);
    if (action === 'alert-failed') {
      await showNotice('paywall.failed');
      return;
    }
    autoReflectDoneRef.current = true;
    await runLocked(async (progress) => {
      progress.current = { stage: 'purchase-completed', ...pending };
      const reflected = await waitReflected();
      goToSuccess(toPlusSuccessRouteParams({ ...pending, reflected }));
    });
  };

  // 포커스·포그라운드 복귀·네트워크 복귀 공용 — 미확인 구매가 있으면 그 재확인만(자동 반영 확인과 경쟁하지 않게,
  // B-UNCONFIRMED-RACE). 확인이 진행 중이면 뒤 트리거는 건너뛴다
  const recheckInFlightRef = useRef(false);
  const recheck = async (trigger: RecheckTrigger) => {
    const route = resolveRecheckRoute({
      hasUnconfirmed: unconfirmedPurchaseRef.current !== null,
      online: lastOnlineRef.current,
      inFlight: recheckInFlightRef.current,
    });
    if (route === 'skip') return;
    recheckInFlightRef.current = true;
    try {
      if (route === 'unconfirmed') await recheckUnconfirmed(trigger);
      else await autoReflectIfEntitled(trigger);
    } finally {
      recheckInFlightRef.current = false;
    }
  };
  // 리스너는 한 번만 등록하고 최신 클로저를 부른다(recheck 는 ref·스토어만 읽는다)
  const recheckRef = useRef(recheck);
  recheckRef.current = recheck;

  useFocusEffect(
    useCallback(() => {
      recheckRef.current('focus');
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheckRef.current('foreground');
    });
    return () => sub.remove();
  }, []);

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const online = isOnline(state);
        if (online === false) offlineSeenRef.current = true;
        const restored = isNetworkRestored(lastOnlineRef.current, online);
        if (online !== null) lastOnlineRef.current = online;
        if (restored) recheckRef.current('reconnect');
      }),
    [],
  );

  const handleRestore = () =>
    runLocked(async (progress) => {
      // 복원 흐름(신원 대조 → PW-14 → 반영 확인)은 usePlusRestore(D6-0). 여기서는 결과별 안내·이동만
      const result = await runRestore({
        waitReflected,
        onRestoreActive: () => {
          progress.current = { stage: 'restore-active' };
        },
      });
      if (result === 'identity_mismatch') return 'paywall.identityMismatch';
      if (result === 'failed') return 'paywall.failed';
      if (result === 'restored-none') return 'paywall.restoreNone';
      // D6-2: 반영되면 구독 화면(상단 "구매를 복원했어요" 1회), 30초 미반영이면 완료 화면 반영 중(restore=1)
      const target = restoreExitTarget(result === 'reflected');
      goToSuccess(target.params, target.pathname);
    });

  const handleClose = () => {
    if (!vm.header.closeEnabled) return;
    if (router.canGoBack()) router.back();
    else returnHome();
  };

  const onFooterLayout = (e: LayoutChangeEvent) => {
    if (disclosureInFooter && !footerFitsWithDisclosure(e.nativeEvent.layout.height, windowHeight)) {
      setDisclosureInFooter(false);
    }
  };

  const body = vm.body;
  const ready = body.kind === 'ready' ? body : null;

  const renderDisclosure = () =>
    ready ? (
      <View style={styles.disclosureBlock}>
        {ready.noChargeToday && (
          <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.noCharge, { color: theme.text.primary }]}>{t('paywall.noChargeToday')}</Text>
        )}
        <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.disclosure, { color: theme.text.secondary }]}>{tx(ready.disclosure)}</Text>
        <View style={styles.links}>
          <TouchableOpacity
            style={styles.linkTouch}
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
            accessibilityRole="link"
          >
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.linkText, { color: theme.text.secondary }]}>{t('paywall.terms')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkTouch}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
            accessibilityRole="link"
          >
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.linkText, { color: theme.text.secondary }]}>{t('paywall.privacy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null;

  const renderPlan = (plan: PaywallPlanVM, locked: boolean) => (
    <TouchableOpacity
      key={plan.kind}
      onPress={() => setSelected(plan.kind)}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityState={{ selected: plan.selected, disabled: locked }}
      style={[
        styles.planCard,
        {
          backgroundColor: plan.selected ? accent.selectedCardBackground : theme.surface.primary,
          borderColor: plan.selected ? accent.selectedCardBorder : theme.border.default,
        },
        locked && styles.dimmed,
      ]}
    >
      <View
        style={[
          styles.radio,
          plan.selected
            ? { backgroundColor: theme.primary.default, borderColor: theme.primary.default }
            : { borderColor: theme.border.strong },
        ]}
      >
        {plan.selected && <Ionicons name="checkmark" size={16} color={palette.neutral[0]} />}
      </View>
      <View style={styles.planMain}>
        <View style={styles.planTitleRow}>
          <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.planTitle, { color: theme.text.primary }]}>{tx(plan.title)}</Text>
          {plan.discount && (
            <View style={[styles.badge, { backgroundColor: accent.badgeBackground }]}>
              <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.badgeText, { color: accent.badgeText }]}>{tx(plan.discount)}</Text>
            </View>
          )}
        </View>
        {plan.perMonth && <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.planSub, { color: theme.text.secondary }]}>{tx(plan.perMonth)}</Text>}
      </View>
      <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.planPrice, { color: theme.text.primary }]}>
        {plan.price}
        <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.planPeriod, { color: theme.text.secondary }]}> {tx(plan.period)}</Text>
      </Text>
    </TouchableOpacity>
  );

  const renderStateBody = () => {
    switch (body.kind) {
      case 'unauthenticated':
        return null;
      case 'already-plus': {
        const until = user?.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : null;
        return (
          <View style={[styles.card, { backgroundColor: theme.surface.primary, borderColor: theme.border.light }]}>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.planTitle, { color: theme.text.primary }]}>{t('paywall.active')}</Text>
            {until && (
              <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.planSub, { color: theme.text.secondary }]}>{t('paywall.activeUntil', { date: until })}</Text>
            )}
          </View>
        );
      }
      case 'loading':
        return <ActivityIndicator size="large" color={theme.primary.default} style={styles.stateBox} />;
      case 'unavailable':
      case 'load-failed':
        return (
          <View style={styles.stateBox}>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.stateText, { color: theme.text.secondary }]}>{tx(body.message)}</Text>
            <TouchableOpacity onPress={loadOffer} style={styles.linkTouch} accessibilityRole="button">
              <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.retryText, { color: theme.primary.default }]}>{t('paywall.retry')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 'ready':
        return <View style={styles.plans}>{body.plans.map((plan) => renderPlan(plan, body.locked))}</View>;
    }
  };

  const check = <Ionicons name="checkmark" size={20} color={theme.icon.primary} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary, paddingTop: insets.top }]}>
      <Stack.Screen options={{ gestureEnabled: !busy }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          disabled={!vm.header.closeEnabled}
          style={[styles.headerTouch, !vm.header.closeEnabled && styles.dimmed]}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.close')}
        >
          <Ionicons name="close" size={28} color={theme.icon.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRestore}
          disabled={!vm.header.restoreEnabled}
          style={[styles.headerTouch, styles.headerRight, !vm.header.restoreEnabled && styles.dimmed]}
          accessibilityRole="button"
        >
          <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.restoreText, { color: theme.text.secondary }]}>{t('paywall.restore')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandRow}>
          <Logo iconOnly size={32} color={theme.text.primary} />
          <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.brand, { color: theme.text.primary }]}>{t('paywall.brand')}</Text>
        </View>
        <Text maxFontSizeMultiplier={fontScaleCap.title} style={[styles.headline, { color: theme.text.primary }]}>{t('paywall.headline')}</Text>
        <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.subhead, { color: theme.text.secondary }]}>{tx(PAYWALL_SUBHEAD)}</Text>

        <View style={[styles.card, { backgroundColor: theme.surface.primary, borderColor: theme.border.light }]}>
          <View style={[styles.compareRow, { borderBottomColor: theme.border.light }]}>
            <View style={styles.compareLabel} />
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareHead, styles.colFree, { color: theme.text.secondary }]}>{t('paywall.compare.free')}</Text>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareHead, styles.colPlus, styles.strong, { color: theme.text.primary }]}>{t('paywall.compare.plus')}</Text>
          </View>
          <View style={[styles.compareRow, { borderBottomColor: theme.border.light }]}>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareLabel, { color: theme.text.primary }]}>{t('paywall.compare.diaryWrite')}</Text>
            <View style={[styles.compareCell, styles.colFree]}>{check}</View>
            <View style={[styles.compareCell, styles.colPlus]}>{check}</View>
          </View>
          <View style={[styles.compareRow, { borderBottomColor: theme.border.light }]}>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareLabel, { color: theme.text.primary }]}>{t('paywall.compare.diaryRegen')}</Text>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareCellText, styles.colFree, { color: theme.text.secondary }]}>–</Text>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareCellText, styles.colPlus, styles.strong, { color: theme.text.primary }]}>
              {t('paywall.compare.unlimited')}
            </Text>
          </View>
          <View style={[styles.compareRow, styles.compareRowLast]}>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareLabel, { color: theme.text.primary }]}>{t('paywall.compare.storage')}</Text>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareCellText, styles.colFree, { color: theme.text.secondary }]}>{tx(PAYWALL_COMPARE_STORAGE.free)}</Text>
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.compareCellText, styles.colPlus, styles.strong, { color: theme.text.primary }]}>
              {tx(PAYWALL_COMPARE_STORAGE.plus)}
            </Text>
          </View>
        </View>

        {renderStateBody()}

        {ready && !disclosureInFooter && renderDisclosure()}
      </ScrollView>

      {ready && (
        <View
          onLayout={onFooterLayout}
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.base, backgroundColor: theme.background.primary }]}
        >
          <PlusCta label={tx(ready.cta)} onPress={handlePurchase} loading={ready.locked} colors={accent} />
          {ready.status && (
            <Text maxFontSizeMultiplier={fontScaleCap.body} style={[styles.reflectStatus, { color: theme.text.secondary }]} accessibilityLiveRegion="polite">
              {tx(ready.status)}
            </Text>
          )}
          {disclosureInFooter && renderDisclosure()}
        </View>
      )}
    </View>
  );
}

// 조건 2: 글자 확대(fontScale 1.3 등)에서 잘리지 않게 고정 height 대신 minHeight·줄바꿈 허용
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  headerTouch: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm },
  headerRight: { alignItems: 'flex-end' },
  restoreText: { fontSize: typography.fontSize.base },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.base },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  brand: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semiBold },
  headline: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold },
  subhead: { fontSize: typography.fontSize.base },
  card: { borderWidth: 1, borderRadius: borderRadius.xl, paddingHorizontal: spacing.base, paddingVertical: spacing.xs },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compareRowLast: { borderBottomWidth: 0 },
  compareLabel: { flex: 1, fontSize: typography.fontSize.base },
  compareHead: { textAlign: 'center', fontSize: typography.fontSize.sm },
  compareCell: { alignItems: 'center' },
  compareCellText: { textAlign: 'center', fontSize: typography.fontSize.base },
  // 열 너비는 최소값만 — 긴 문구(en "Unlimited", vi "Không giới hạn")는 열이 넓어지고 단어 중간에서 끊기지 않는다
  // (RN 기본 flexShrink 0 + 단어 단위 줄바꿈. 남는 폭은 항목 열(flex 1)이 줄어 맞춘다)
  colFree: { minWidth: 64 },
  colPlus: { minWidth: 104 },
  strong: { fontWeight: typography.fontWeight.bold },
  plans: { gap: spacing.md },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    minHeight: 64,
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planMain: { flex: 1, minWidth: 120, gap: spacing.xs },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  planTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  planSub: { fontSize: typography.fontSize.sm },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semiBold },
  planPrice: { flexShrink: 1, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  planPeriod: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.regular },
  stateBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  stateText: { fontSize: typography.fontSize.base, textAlign: 'center' },
  retryText: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  disclosureBlock: { gap: spacing.sm },
  reflectStatus: { fontSize: typography.fontSize.sm, textAlign: 'center' },
  noCharge: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semiBold, textAlign: 'center' },
  disclosure: { fontSize: typography.fontSize.xs, lineHeight: typography.fontSize.xs * typography.lineHeight.normal },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.lg },
  linkTouch: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.xs },
  linkText: { fontSize: typography.fontSize.sm, textDecorationLine: 'underline' },
  dimmed: { opacity: 0.5 },
});
