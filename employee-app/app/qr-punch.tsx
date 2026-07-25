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
  useColorScheme,
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
import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ApiError, employeeApi } from '@/lib/api';
import {
  enqueueQrOfflineScan,
  getQrOfflineQueueCount,
  isNetworkishError,
  syncQrOfflineQueue,
} from '@/lib/qr-offline-queue';

const KIOSK_QR_PREFIX = 'TGQR:v3:';
const SCAN_COOLDOWN_MS = 2500;

type ScanPhase = 'ready' | 'processing' | 'success' | 'queued' | 'error';

export default function QrPunchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<ScanPhase>('ready');
  const [message, setMessage] = useState(STRINGS.qrPunch.subtitle);
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
      setMessage(
        summary.lastMessage ??
          STRINGS.qrPunch.syncSuccess(summary.synced),
      );
      setShowClaimCta(false);
    } else if (summary.lastErrorCode === 'FORBIDDEN') {
      setShowClaimCta(true);
      setPhase('error');
      setMessage(summary.lastMessage ?? STRINGS.qrPunch.deviceNotTrusted);
    } else if (summary.failed > 0 && summary.pending === 0) {
      setShowClaimCta(true);
      setPhase('error');
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

  const handleBarcode = useCallback(
    async (result: BarcodeScanningResult) => {
      if (!scanningEnabled.current) return;
      const data = (result.data ?? '').trim();
      if (!data.startsWith(KIOSK_QR_PREFIX)) return;

      scanningEnabled.current = false;
      setPhase('processing');
      setShowClaimCta(false);
      setMessage(STRINGS.qrPunch.processing);

      try {
        const res = await employeeApi.scanQrPunch(data);
        setPhase('success');
        setMessage(res.message || STRINGS.qrPunch.successDefault);
        reenableScan(3500);
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
          err instanceof ApiError
            ? err.message
            : STRINGS.qrPunch.scanError,
        );
        setShowClaimCta(true);
        reenableScan(3000);
      }
    },
    [reenableScan, refreshPending],
  );

  const permissionBody = !permission ? (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : !permission.granted ? (
    <View style={styles.center}>
      <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
      <Text style={[styles.message, { color: colors.text }]}>
        {STRINGS.qrPunch.cameraPermission}
      </Text>
      <Pressable
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={() => void requestPermission()}
      >
        <Text style={styles.btnText}>{STRINGS.qrPunch.grantCamera}</Text>
      </Pressable>
      {Platform.OS !== 'web' && (
        <Pressable onPress={() => void Linking.openSettings()} style={{ marginTop: Spacing[3] }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {STRINGS.qrPunch.openSettings}
          </Text>
        </Pressable>
      )}
    </View>
  ) : null;

  return (
    <ScreenLayout
      title={STRINGS.qrPunch.title}
      showSearch={false}
      refreshing={false}
      onRefresh={() => void runSync()}
    >
      <PendingDeviceBlock>
        <View style={{ padding: Spacing[4], gap: Spacing[4] }}>
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {STRINGS.qrPunch.subtitle}
          </Text>

          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name={
                phase === 'success'
                  ? 'checkmark-circle'
                  : phase === 'queued'
                    ? 'cloud-upload-outline'
                    : phase === 'error'
                      ? 'alert-circle'
                      : phase === 'processing'
                        ? 'hourglass-outline'
                        : 'scan-outline'
              }
              size={28}
              color={
                phase === 'success'
                  ? '#10b981'
                  : phase === 'error'
                    ? '#ef4444'
                    : colors.primary
              }
            />
            <Text style={{ flex: 1, color: colors.text, lineHeight: 20 }}>
              {message}
            </Text>
          </View>

          {permissionBody ?? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={
                  phase === 'processing' ? undefined : handleBarcode
                }
              />
              <View style={styles.frame} pointerEvents="none" />
            </View>
          )}

          {pendingCount > 0 && (
            <Pressable
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => void runSync()}
            >
              <Text style={styles.btnText}>
                {STRINGS.qrPunch.syncPending(pendingCount)}
              </Text>
            </Pressable>
          )}

          {showClaimCta && (
            <Pressable
              style={styles.linkBtn}
              onPress={() => router.push('/punch-claim-request' as never)}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {STRINGS.qrPunch.claimCta}
              </Text>
            </Pressable>
          )}

          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {STRINGS.qrPunch.hint}
          </Text>
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
    borderRadius: 14,
    padding: Spacing[4],
  },
  cameraWrap: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  frame: {
    ...StyleSheet.absoluteFill,
    margin: 48,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
  btn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: Spacing[2] },
});
