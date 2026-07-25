import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { LeaveType } from '@/lib/types';

const S = Spacing;

export default function LeaveTypesScreen() {
  const theme = useTheme();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await employeeApi.getLeaveTypes();
      setLeaveTypes(data.data ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    load(true);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const showSpinner = loading && leaveTypes.length === 0;

  return (
    <ScreenLayout
      title={STRINGS.leaveTypes.title}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {showSpinner ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>
                {STRINGS.leaveTypes.title}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.textSecondary },
                ]}
              >
                {leaveTypes.length}{' '}
                {leaveTypes.length === 1 ? 'type disponible' : 'types disponibles'}
              </Text>
            </View>

            {leaveTypes.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.surfaceCard },
                ]}
              >
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {STRINGS.leaveTypes.noData}
                </Text>
              </View>
            ) : (
              leaveTypes.map((lt) => (
                <View
                  key={lt.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.surfaceCard },
                  ]}
                >
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: theme.primary + '20' },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={22}
                        color={theme.primary}
                      />
                    </View>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {lt.name}
                    </Text>
                    <Text
                      style={[
                        styles.cardDetail,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {lt.maxDaysPerYear != null
                        ? `${lt.maxDaysPerYear} ${STRINGS.leaveTypes.daysAllocated}`
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.daysValue, { color: theme.primary }]}>
                      {lt.maxDaysPerYear ?? '∞'}
                    </Text>
                    <Text
                      style={[
                        styles.daysUnit,
                        { color: theme.textSecondary },
                      ]}
                    >
                      j / an
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[6],
    paddingBottom: S[6],
    alignItems: 'stretch',
    flexGrow: 1,
  },
  centered: { alignItems: 'center', padding: S[8] },
  header: { marginBottom: S[4] },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  errorBox: {
    backgroundColor: '#FADBD8',
    borderRadius: S[2],
    padding: S[3],
    margin: S[4],
  },
  errorText: { color: '#C0392B', fontSize: 14, textAlign: 'center' },
  emptyCard: {
    borderRadius: S[4],
    padding: S[6],
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: S[4],
    padding: S[4],
    marginBottom: S[2],
  },
  cardLeft: { marginRight: S[3] },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardDetail: { fontSize: 13 },
  cardRight: { alignItems: 'flex-end', marginLeft: S[2] },
  daysValue: { fontSize: 24, fontWeight: '800' },
  daysUnit: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});