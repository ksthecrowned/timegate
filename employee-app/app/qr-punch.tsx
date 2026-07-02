import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

import { ScreenLayout } from '@/components/ScreenLayout';
import { PendingDeviceBlock } from '@/components/PendingDeviceBlock';
import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ApiError, employeeApi } from '@/lib/api';

function formatCountdown(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '0 s';
  const seconds = Math.ceil(ms / 1000);
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${seconds} s`;
}

export default function QrPunchScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactive, setInactive] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('—');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadQrRef = useRef<(() => Promise<void>) | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const scheduleRefresh = (nextExpiresAt: string) => {
    clearRefreshTimer();
    const ms = new Date(nextExpiresAt).getTime() - Date.now() + 500;
    refreshTimerRef.current = setTimeout(() => {
      void loadQrRef.current?.();
    }, Math.max(ms, 5000));
  };

  const loadQr = useCallback(async () => {
    setLoading(true);
    setError('');
    setInactive(false);
    try {
      const res = await employeeApi.getQrPunchCurrent();
      setQrPayload(res.qrPayload);
      setExpiresAt(res.expiresAt);
      scheduleRefresh(res.expiresAt);
    } catch (err) {
      setQrPayload(null);
      setExpiresAt(null);
      if (err instanceof ApiError && err.status === 400) {
        setInactive(true);
        setError(
          err.message ||
            STRINGS.qrPunch.inactiveHint,
        );
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : STRINGS.qrPunch.loadError,
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  loadQrRef.current = loadQr;

  useEffect(() => {
    void loadQr();
    return () => {
      clearRefreshTimer();
      clearCountdownTimer();
    };
  }, [loadQr]);

  useEffect(() => {
    clearCountdownTimer();
    if (!expiresAt) {
      setCountdown('—');
      return;
    }
    const tick = () => setCountdown(formatCountdown(expiresAt));
    tick();
    countdownTimerRef.current = setInterval(tick, 1000);
    return clearCountdownTimer;
  }, [expiresAt]);

  return (
    <ScreenLayout
      title={STRINGS.qrPunch.title}
      showSearch={false}
      refreshing={loading}
      onRefresh={() => void loadQr()}
    >
      <PendingDeviceBlock>
      <View style={{ padding: Spacing[4], alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: Spacing[4],
            lineHeight: 22,
          }}
        >
          {STRINGS.qrPunch.subtitle}
        </Text>

        <View
          style={{
            backgroundColor: colors.surfaceCard,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: Spacing[5],
            alignItems: 'center',
            width: '100%',
            maxWidth: 320,
          }}
        >
          {loading && !qrPayload ? (
            <View style={{ paddingVertical: Spacing[8] }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : inactive ? (
            <View style={{ alignItems: 'center', paddingVertical: Spacing[6] }}>
              <Ionicons
                name="qr-code-outline"
                size={56}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  marginTop: Spacing[4],
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                {STRINGS.qrPunch.inactiveTitle}
              </Text>
              <Text
                style={{
                  marginTop: Spacing[2],
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {error || STRINGS.qrPunch.inactiveHint}
              </Text>
            </View>
          ) : qrPayload ? (
            <>
              <View
                style={{
                  backgroundColor: '#ffffff',
                  padding: Spacing[3],
                  borderRadius: 12,
                }}
              >
                <QRCode value={qrPayload} size={220} />
              </View>
              <Text
                style={{
                  marginTop: Spacing[4],
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                {STRINGS.qrPunch.refreshIn(countdown)}
              </Text>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: Spacing[6] }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {error || STRINGS.qrPunch.loadError}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            marginTop: Spacing[5],
            padding: Spacing[4],
            backgroundColor: colors.primary + '12',
            borderRadius: 12,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: colors.text,
              lineHeight: 20,
            }}
          >
            {STRINGS.qrPunch.hint}
          </Text>
        </View>
      </View>
      </PendingDeviceBlock>
    </ScreenLayout>
  );
}
