import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors, MinTouchTarget, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { FilterChips } from '@/components/ui/FilterChips';
import { StatusBadge, statusToneFromLeave } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { employeeApi } from '@/lib/api';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const filters: StatusFilter[] = ['all', 'pending', 'approved', 'rejected'];

const filterLabel = (f: StatusFilter) => {
  switch (f) {
    case 'all':
      return STRINGS.swaps.all;
    case 'pending':
      return STRINGS.swaps.pending;
    case 'approved':
      return STRINGS.swaps.approved;
    case 'rejected':
      return STRINGS.swaps.rejected;
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'approved':
      return STRINGS.swaps.approved;
    case 'rejected':
      return STRINGS.swaps.rejected;
    case 'pending':
      return STRINGS.swaps.pending;
    default:
      return s;
  }
};

export default function ShiftSwapsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [swaps, setSwaps] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSwaps = async (newPage: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (newPage === 1) setLoading(true);
      else setLoadingMore(true);

      const query: Record<string, any> = { page: newPage, limit };
      if (filter !== 'all') query.status = filter;

      const res = await employeeApi.getShiftSwaps(query);
      const newData = res.data || [];
      setSwaps((prev) => (newPage === 1 ? newData : [...prev, ...newData]));
      setTotal(res.meta?.total || 0);
      setHasMore(newData.length === limit);
      setPage(newPage);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadSwaps(1, true);
  }, [filter]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadSwaps(page + 1);
    }
  };

  const changeFilter = (newFilter: StatusFilter) => {
    setFilter(newFilter);
    setPage(1);
    setSwaps([]);
  };

  useEffect(() => {
    loadSwaps(1);
  }, [filter]);

  const isScrollCloseToEnd = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
  };

  return (
    <ScreenLayout
      title={STRINGS.swaps.title}
      showScroll={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable
          onPress={() => router.push('/shift-swap-request')}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.swaps.newRequest}
          hitSlop={8}
          style={{
            minWidth: MinTouchTarget,
            minHeight: MinTouchTarget,
            borderRadius: MinTouchTarget / 2,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={22} color="#ffffff" />
        </Pressable>
      }
    >
      <FilterChips
        options={filters.map((f) => ({ value: f, label: filterLabel(f) }))}
        value={filter}
        onChange={changeFilter}
      />

      <ScrollView
        onScroll={({ nativeEvent }) => {
          if (isScrollCloseToEnd(nativeEvent)) loadMore();
        }}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing[4] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            accessibilityLabel="Actualiser"
          />
        }
      >
        {loading && swaps.length === 0 ? (
          <View style={{ padding: Spacing[8], alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadSwaps(1)} />
        ) : swaps.length === 0 ? (
          <EmptyState
            icon="swap-horizontal-outline"
            title={STRINGS.swaps.noRequests}
            hint={
              filter !== 'all'
                ? STRINGS.swaps.differentFilter
                : STRINGS.swaps.noRequestsHint
            }
            actionLabel={STRINGS.swaps.newRequest}
            onAction={() => router.push('/shift-swap-request')}
          />
        ) : (
          <View style={{ padding: Spacing[4] }}>
            {total > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontWeight: '500',
                }}
              >
                {swaps.length} sur {total} demandes
              </Text>
            )}
            {swaps.map((swap) => {
              const title = swap.shift?.name || `Shift #${swap.shiftId}`;
              return (
                <View
                  key={swap.id}
                  style={{
                    padding: Spacing[4],
                    backgroundColor: colors.surfaceCard,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: Spacing[3],
                  }}
                  accessibilityRole="summary"
                  accessibilityLabel={`${title}, ${statusLabel(swap.status)}`}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: colors.text,
                          marginBottom: 2,
                        }}
                      >
                        {title}
                      </Text>
                      {swap.swapWith && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                          }}
                        >
                          Avec : {swap.swapWith.firstName} {swap.swapWith.lastName}
                        </Text>
                      )}
                    </View>
                    <StatusBadge
                      label={statusLabel(swap.status)}
                      tone={statusToneFromLeave(swap.status)}
                    />
                  </View>
                  {swap.reason && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 4,
                        lineHeight: 18,
                      }}
                      numberOfLines={3}
                    >
                      {swap.reason}
                    </Text>
                  )}
                </View>
              );
            })}
            {loadingMore && (
              <View style={{ padding: Spacing[4], alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
            {!hasMore && swaps.length > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  textAlign: 'center',
                  paddingVertical: Spacing[4],
                }}
              >
                {STRINGS.app.endOfList}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}