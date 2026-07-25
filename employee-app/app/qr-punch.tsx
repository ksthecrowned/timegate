import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenLayout } from '@/components/ScreenLayout';
import { PendingDeviceBlock } from '@/components/PendingDeviceBlock';
import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, employeeApi } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { isKioskQrPayload } from '@/lib/qrPunch';
import {
  enqueueQrOfflineScan,
  getQrOfflineQueueCount,
  isNetworkishError,
  syncQrOfflineQueue,
} from '@/lib/qr-offline-queue';

const SCAN_COOLDOWN_MS = 2500;

type ScanPhase = 'ready' | 'processing' | 'success' | 'queued' | 'error';

type SuccessDetails = {
  message: string;
  eventType: string;
  occurredAt?: string;
  kioskName?: string;
  branchName?: string | null;
};

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'CHECK_IN':
      return STRINGS.qrPunch.eventCheckIn;
    case 'CHECK_OUT':
      return STRINGS.qrPunch.eventCheckOut;
    case 'BREAK_START':
      return STRINGS.qrPunch.eventBreakStart;
    case 'BREAK_END':
      return STRINGS.qrPunch.eventBreakEnd;
    default:
      return type;
  }
}

function formatPunchTime(iso?: string): string {
  if (!iso) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function QrPunchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<ScanPhase>('ready');
  const [message, setMessage] = useState(STRINGS.qrPunch.subtitle);
  const [success, setSuccess] = useState<SuccessDetails | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showClaimCta, setShowClaimCta] = useState(false);
  const scanningEnabled = useRef(true);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPending = useCallback(async () => {
    setPendingCount(await getQrOfflineQueueCount());
  }, []);

  const runSync = useCallback(async () => {
    const summary = await syncQrOfflineQueue();
    await refreshPending();
    if (summary.synced > 0) {
      setPhase('success');
      setSuccess({
        message: summary.lastMessage ?? STRINGS.qrPunch.syncSuccess(summary.synced),
        eventType: 'SYNC',
      });
      setMessage(summary.lastMessage ?? STRINGS.qrPunch.syncSuccess(summary.synced));
      setShowClaimCta(false);
    } else if (summary.lastErrorCode === 'FORBIDDEN') {
      setShowClaimCta(true);
      setPhase('error');
      setSuccess(null);
      setMessage(summary.lastMessage ?? STRINGS.qrPunch.deviceNotTrusted);
    } else if (summary.failed > 0 && summary.pending === 0) {
      setShowClaimCta(true);
      setPhase('error');
      setSuccess(null);
      setMessage(summary.lastMessage ?? STRINGS.qrPunch.syncFailed);
    }
    return summary;
  }, [refreshPending]);

  useEffect(() => {
    void refreshPending();
    void runSync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runSync();
      }
    });
    return () => {
      sub.remove();
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, [refreshPending, runSync]);

  const reenableScan = useCallback((delayMs = SCAN_COOLDOWN_MS) => {
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      scanningEnabled.current = true;
      setPhase((p) => (p === 'processing' ? 'ready' : p));
    }, delayMs);
  }, []);

  const resetToReady = () => {
    setSuccess(null);
    setPhase('ready');
    setMessage(STRINGS.qrPunch.subtitle);
    setShowClaimCta(false);
    scanningEnabled.current = true;
  };

  const handleBarcode = useCallback(
    async (result: BarcodeScanningResult) => {
      if (!scanningEnabled.current) return;
      const data = (result.data ?? '').trim();
      if (!isKioskQrPayload(data)) return;

      scanningEnabled.current = false;
      setPhase('processing');
      setShowClaimCta(false);
      setSuccess(null);
      setMessage(STRINGS.qrPunch.processing);

      try {
        const res = await employeeApi.scanQrPunch(data);
        const details: SuccessDetails = {
          message: res.message || STRINGS.qrPunch.successDefault,
          eventType: res.eventType,
          occurredAt: res.occurredAt,
          kioskName: res.kiosk?.name,
          branchName: res.kiosk?.branchName,
        };
        setSuccess(details);
        setPhase('success');
        setMessage(details.message);
        trackEvent('employee.qr_punch_success');
        // Keep success visible; user dismisses or navigates away.
        scanningEnabled.current = false;
      } catch (err) {
        if (isNetworkishError(err)) {
          await enqueueQrOfflineScan(data);
          await refreshPending();
          setPhase('queued');
          setMessage(STRINGS.qrPunch.queuedOffline);
          setShowClaimCta(true);
          reenableScan(3000);
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setPhase('error');
          setMessage(err.message || STRINGS.qrPunch.deviceNotTrusted);
          setShowClaimCta(true);
          reenableScan(4000);
          return;
        }
        setPhase('error');
        setMessage(
          err instanceof ApiError ? err.message : STRINGS.qrPunch.scanError,
        );
        setShowClaimCta(true);
        reenableScan(3000);
      }
    },
    [reenableScan, refreshPending],
  );

  const permissionBody = !permission ? (
    <View style={styles.center} accessibilityLabel={STRINGS.app.loading}>
      <ActivityIndicator color={theme.primary} />
    </View>
  ) : !permission.granted ? (
    <View style={styles.center}>
      <Ionicons name="camera-outline" size={48} color={theme.textSecondary} />
      <Text style={[styles.message, { color: theme.text }]}>
        {STRINGS.qrPunch.cameraPermission}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={STRINGS.qrPunch.grantCamera}
        style={[styles.btn, { backgroundColor: theme.primary }]}
        onPress={() => void requestPermission()}
      >
        <Text style={styles.btnText}>{STRINGS.qrPunch.grantCamera}</Text>
      </Pressable>
      {Platform.OS !== 'web' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={STRINGS.qrPunch.openSettings}
          onPress={() => void Linking.openSettings()}
          style={{ marginTop: Spacing[3], minHeight: MinTouchTarget, justifyContent: 'center' }}
        >
          <Text style={{ color: theme.primary, fontWeight: '600' }}>
            {STRINGS.qrPunch.openSettings}
          </Text>
        </Pressable>
      )}
    </View>
  ) : null;

  return (
    <ScreenLayout
      title={STRINGS.qrPunch.title}
      showBack
      showSearch={false}
      refreshing={false}
      onRefresh={() => void runSync()}
    >
      <PendingDeviceBlock>
        <View testID="qr_punch_screen" style={{ padding: Spacing[4], gap: Spacing[4] }}>
          <Text
            style={{
              fontSize: 15,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
            accessibilityRole="summary"
          >
            {STRINGS.qrPunch.subtitle}
          </Text>

          {phase === 'success' && success ? (
            <View
              style={[
                styles.successCard,
                {
                  backgroundColor: theme.successSoft,
                  borderColor: theme.success,
                },
              ]}
              accessibilityRole="summary"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`${STRINGS.qrPunch.successTitle}. ${eventTypeLabel(success.eventType)}. ${formatPunchTime(success.occurredAt)}`}
            >
              <Ionicons name="checkmark-circle" size={40} color={theme.success} />
              <Text style={[styles.successTitle, { color: theme.text }]}>
                {STRINGS.qrPunch.successTitle}
              </Text>
              {success.eventType !== 'SYNC' ? (
                <Text style={[styles.successType, { color: theme.success }]}>
                  {eventTypeLabel(success.eventType)}
                </Text>
              ) : null}
              <Text style={[styles.successTime, { color: theme.text }]}>
                {formatPunchTime(success.occurredAt)}
              </Text>
              {success.kioskName ? (
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {STRINGS.qrPunch.atKiosk(success.kioskName)}
                </Text>
              ) : null}
              {success.branchName ? (
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {STRINGS.qrPunch.atBranch(success.branchName)}
                </Text>
              ) : null}
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  textAlign: 'center',
                  marginTop: Spacing[1],
                }}
              >
                {success.message}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={STRINGS.qrPunch.viewAttendance}
                onPress={() => router.push('/attendance' as never)}
                style={[styles.btn, { backgroundColor: theme.primary, marginTop: Spacing[3], width: '100%' }]}
              >
                <Text style={styles.btnText}>{STRINGS.qrPunch.viewAttendance}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={STRINGS.qrPunch.scanAgain}
                onPress={resetToReady}
                style={{ minHeight: MinTouchTarget, justifyContent: 'center' }}
              >
                <Text style={{ color: theme.primary, fontWeight: '700' }}>
                  {STRINGS.qrPunch.scanAgain}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.border,
                },
              ]}
              accessibilityLiveRegion="polite"
              accessibilityLabel={STRINGS.qrPunch.a11yStatus(message)}
            >
              <Ionicons
                name={
                  phase === 'queued'
                    ? 'cloud-upload-outline'
                    : phase === 'error'
                      ? 'alert-circle'
                      : phase === 'processing'
                        ? 'hourglass-outline'
                        : 'scan-outline'
                }
                size={28}
                color={
                  phase === 'error'
                    ? theme.danger
                    : phase === 'queued'
                      ? theme.warning
                      : theme.primary
                }
              />
              <Text style={{ flex: 1, color: theme.text, lineHeight: 20 }}>
                {message}
              </Text>
            </View>
          )}

          {phase !== 'success' &&
            (permissionBody ?? (
              <View
                style={styles.cameraWrap}
                accessibilityLabel={STRINGS.qrPunch.a11yCamera}
              >
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={
                    phase === 'processing' ? undefined : handleBarcode
                  }
                />
                <View style={styles.frame} pointerEvents="none" importantForAccessibility="no" />
              </View>
            ))}

          {pendingCount > 0 && phase !== 'success' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={STRINGS.qrPunch.syncPending(pendingCount)}
              style={[styles.btn, { backgroundColor: theme.primary }]}
              onPress={() => void runSync()}
            >
              <Text style={styles.btnText}>
                {STRINGS.qrPunch.syncPending(pendingCount)}
              </Text>
            </Pressable>
          )}

          {showClaimCta && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={STRINGS.qrPunch.claimCta}
              style={styles.linkBtn}
              onPress={() => router.push('/punch-claim-request' as never)}
            >
              <Text style={{ color: theme.primary, fontWeight: '600' }}>
                {STRINGS.qrPunch.claimCta}
              </Text>
            </Pressable>
          )}

          {phase !== 'success' ? (
            <Text
              style={{
                fontSize: 13,
                color: theme.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {STRINGS.qrPunch.hint}
            </Text>
          ) : null}
        </View>
      </PendingDeviceBlock>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
    gap: Spacing[3],
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing[4],
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[4],
  },
  successCard: {
    alignItems: 'center',
    gap: Spacing[2],
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[5],
  },
  successTitle: { fontSize: 20, fontWeight: '700', marginTop: Spacing[1] },
  successType: { fontSize: 15, fontWeight: '700' },
  successTime: { fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
  cameraWrap: {
    height: 320,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  frame: {
    ...StyleSheet.absoluteFill,
    margin: 48,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radius.md,
  },
  btn: {
    minHeight: MinTouchTarget,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinTouchTarget,
    paddingVertical: Spacing[2],
  },
});
