import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { PendingDeviceBlock } from '@/components/PendingDeviceBlock';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi, ApiError } from '@/lib/api';
import type { BreakResumeStatus } from '@/lib/types';

export default function BreakResumeScreen() {
  const theme = useTheme();

  const [status, setStatus] = useState<BreakResumeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await employeeApi.getBreakResumeStatus();
      setStatus(data);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : STRINGS.errors.networkError;
      Alert.alert(STRINGS.app.name, msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleResume() {
    setSubmitting(true);
    setLocationHint(null);
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setLocationHint(STRINGS.breakResume.locationDenied);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const result = await employeeApi.resumeBreak({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      Alert.alert(STRINGS.breakResume.successTitle, result.message, [
        { text: STRINGS.app.close, onPress: () => loadStatus(true) },
      ]);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : STRINGS.errors.networkError;
      Alert.alert(STRINGS.breakResume.errorTitle, msg);
    } finally {
      setSubmitting(false);
    }
  }

  const eligible = status?.eligible === true;
  const branchLabel = status?.branch?.name ?? '—';
  const statusText = eligible
    ? STRINGS.breakResume.eligibleHint
    : status?.reason ?? STRINGS.breakResume.notEligibleDefault;

  return (
    <ScreenLayout
      title={STRINGS.breakResume.title}
      showBack
      showSearch={false}
      showNotifications
      refreshing={refreshing}
      onRefresh={() => loadStatus(true)}
    >
      <View testID="break_resume_screen">
      <PendingDeviceBlock>
        <View style={{ padding: Spacing[4], gap: Spacing[4] }}>
          <View
            style={{
              padding: Spacing[5],
              backgroundColor: theme.surfaceCard,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: theme.border,
              gap: Spacing[3],
            }}
            accessibilityRole="summary"
            accessibilityLabel={`${STRINGS.breakResume.headline}. ${STRINGS.breakResume.siteLabel} ${branchLabel}. ${statusText}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.primary + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                importantForAccessibility="no"
              >
                <Ionicons name="cafe-outline" size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.text,
                  }}
                  accessibilityRole="header"
                >
                  {STRINGS.breakResume.headline}
                </Text>
                <Text
                  style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}
                >
                  {STRINGS.breakResume.siteLabel}: {branchLabel}
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator
                color={theme.primary}
                accessibilityLabel={STRINGS.app.loading}
              />
            ) : (
              <>
                <Text
                  style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 20 }}
                  accessibilityLiveRegion="polite"
                >
                  {statusText}
                </Text>

                {status?.requiresGeo && status.branch ? (
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {STRINGS.breakResume.geoRadius(
                      status.branch.checkinRadiusMeters,
                    )}
                  </Text>
                ) : null}

                {locationHint ? (
                  <Text
                    style={{ fontSize: 13, color: theme.warning }}
                    accessibilityRole="alert"
                  >
                    {locationHint}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleResume}
                  disabled={!eligible || submitting}
                  accessibilityRole="button"
                  accessibilityLabel={STRINGS.breakResume.action}
                  accessibilityState={{
                    disabled: !eligible || submitting,
                    busy: submitting,
                  }}
                  style={{
                    marginTop: Spacing[2],
                    minHeight: MinTouchTarget + 4,
                    paddingVertical: 14,
                    borderRadius: Radius.md,
                    backgroundColor: eligible ? theme.primary : theme.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                      {STRINGS.breakResume.action}
                    </Text>
                  )}
                </Pressable>

                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {STRINGS.breakResume.webGeoNote}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
            {STRINGS.breakResume.kioskFallback}
          </Text>
        </View>
      </PendingDeviceBlock>
      </View>
    </ScreenLayout>
  );
}
