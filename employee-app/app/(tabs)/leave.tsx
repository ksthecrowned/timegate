import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { employeeApi } from '@/lib/api';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const filters: StatusFilter[] = ['all', 'pending', 'approved', 'rejected'];

const filterLabel = (f: StatusFilter) => {
  switch (f) {
    case 'all':
      return STRINGS.leave.all;
    case 'pending':
      return STRINGS.leave.pending;
    case 'approved':
      return STRINGS.leave.approved;
    case 'rejected':
      return STRINGS.leave.rejected;
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'approved':
      return STRINGS.leave.approved;
    case 'rejected':
      return STRINGS.leave.rejected;
    case 'pending':
      return STRINGS.leave.pending;
    default:
      return s;
  }
};

export default function LeaveScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [leaves, setLeaves] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaves = async (newPage: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (newPage === 1) setLoading(true);
      else setLoadingMore(true);

      const query: Record<string, any> = { page: newPage, limit };
      if (filter !== 'all') query.status = filter;

      const res = await employeeApi.getLeaves(query);
      const newData = res.data || [];
      setLeaves((prev) => (newPage === 1 ? newData : [...prev, ...newData]));
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
    loadLeaves(1, true);
  }, [filter]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadLeaves(page + 1);
    }
  };

  const changeFilter = (newFilter: StatusFilter) => {
    setFilter(newFilter);
    setPage(1);
    setLeaves([]);
  };

  useEffect(() => {
    loadLeaves(1);
  }, [filter]);

  const isScrollCloseToEnd = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#2ECC7120', text: '#2ECC71' };
      case 'rejected':
        return { bg: '#E74C3C20', text: '#E74C3C' };
      case 'pending':
        return { bg: '#F39C1220', text: '#F39C12' };
      default:
        return { bg: colors.surfaceMuted, text: colors.textSecondary };
    }
  };

  return (
    <ScreenLayout
      title={STRINGS.leave.title}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable
          onPress={() => router.push('/leave-request')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={22} color="#ffffff" />
        </Pressable>
      }
    >
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing[4],
          gap: Spacing[2],
          paddingVertical: Spacing[2],
        }}
      >
        {filters.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => changeFilter(f)}
              style={{
                paddingHorizontal: Spacing[4],
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? colors.primary : colors.surfaceCard,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: active ? '#ffffff' : colors.text,
                }}
              >
                {filterLabel(f)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      <ScrollView
        onScroll={({ nativeEvent }) => {
          if (isScrollCloseToEnd(nativeEvent)) loadMore();
        }}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {loading && leaves.length === 0 ? (
          <View style={{ padding: Spacing[8], alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View
            style={{
              margin: Spacing[4],
              padding: Spacing[5],
              backgroundColor: '#E74C3C15',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E74C3C40',
            }}
          >
            <Text style={{ color: '#E74C3C', fontSize: 14 }}>{error}</Text>
          </View>
        ) : leaves.length === 0 ? (
          <View
            style={{
              margin: Spacing[4],
              padding: Spacing[8],
              backgroundColor: colors.surfaceCard,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                marginTop: 12,
              }}
            >
              {STRINGS.leave.noRequests}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textMuted,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {filter !== 'all' ? STRINGS.leave.differentFilter : STRINGS.leave.noRequestsHint}
            </Text>
          </View>
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
                {leaves.length} sur {total} demandes
              </Text>
            )}
            {leaves.map((leave) => {
              const sc = getStatusColors(leave.status);
              return (
                <View
                  key={leave.id}
                  style={{
                    padding: Spacing[4],
                    backgroundColor: colors.surfaceCard,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: Spacing[3],
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: colors.text,
                          marginBottom: 2,
                        }}
                      >
                        {leave.leaveType?.name || 'Congé'}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                        }}
                      >
                        {STRINGS.leave.from} {new Date(leave.startDate).toLocaleDateString()} —{' '}
                        {STRINGS.leave.to} {new Date(leave.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: sc.bg,
                      }}
                    >
                      <Text
                        style={{
                          color: sc.text,
                          fontSize: 11,
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {statusLabel(leave.status)}
                      </Text>
                    </View>
                  </View>
                  {leave.reason && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 4,
                        lineHeight: 18,
                      }}
                      numberOfLines={3}
                    >
                      {leave.reason}
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
            {!hasMore && leaves.length > 0 && (
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