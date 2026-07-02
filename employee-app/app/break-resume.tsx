import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { PendingDeviceBlock } from '@/components/PendingDeviceBlock';
import { employeeApi, ApiError } from '@/lib/api';
import type { BreakResumeStatus } from '@/lib/types';

export default function BreakResumeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

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

  return (
    <ScreenLayout
      title={STRINGS.breakResume.title}
      showSearch={false}
      showNotifications
      refreshing={refreshing}
      onRefresh={() => loadStatus(true)}
    >
      <PendingDeviceBlock>
      <View style={{ padding: Spacing[4], gap: Spacing[4] }}>
        <View
          style={{
            padding: Spacing[5],
            backgroundColor: colors.surfaceCard,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: Spacing[3],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="cafe-outline" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.text,
                }}
              >
                {STRINGS.breakResume.headline}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {STRINGS.breakResume.siteLabel}: {branchLabel}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
                {eligible
                  ? STRINGS.breakResume.eligibleHint
                  : status?.reason ?? STRINGS.breakResume.notEligibleDefault}
              </Text>

              {status?.requiresGeo && status.branch && (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {STRINGS.breakResume.geoRadius(status.branch.checkinRadiusMeters)}
                </Text>
              )}

              {locationHint && (
                <Text style={{ fontSize: 13, color: '#b45309' }}>{locationHint}</Text>
              )}

              <Pressable
                onPress={handleResume}
                disabled={!eligible || submitting}
                style={{
                  marginTop: Spacing[2],
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: eligible ? colors.primary : colors.border,
                  alignItems: 'center',
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

              {Platform.OS === 'web' && (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {STRINGS.breakResume.webGeoNote}
                </Text>
              )}
            </>
          )}
        </View>

        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
          {STRINGS.breakResume.kioskFallback}
        </Text>
      </View>
      </PendingDeviceBlock>
    </ScreenLayout>
  );
}
