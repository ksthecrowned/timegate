import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { dispatchLogout } from '@/lib/authEvents';
import { getMeCached } from '@/lib/meCache';
import { removeToken } from '@/lib/api';
import type { Profile } from '@/lib/types';

const S = Spacing;

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await getMeCached();
      setProfile(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.profile.loadingError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadProfile(true);
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await removeToken().catch(() => undefined);
    dispatchLogout();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const f = (firstName || '?').charAt(0).toUpperCase();
    const l = (lastName || '').charAt(0).toUpperCase();
    return `${f}${l}`;
  };

  if (loading && !profile) {
    return (
      <ScreenLayout title={STRINGS.profile.title} showNotifications={false}>
        <View style={{ padding: S[8], alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout title={STRINGS.profile.title} showNotifications={false}>
        <View
          style={{
            margin: S[4],
            padding: S[5],
            backgroundColor: '#E74C3C15',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E74C3C40',
          }}
        >
          <Text style={{ color: '#E74C3C', fontSize: 14 }}>{error}</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title={STRINGS.profile.title}
      showNotifications={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable
          onPress={() => router.push('/profile/edit')}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            paddingHorizontal: S[2],
          })}
        >
          <Ionicons name="create-outline" size={22} color={Colors.light.primary} />
        </Pressable>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: S[6] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
          />
        }
      >
        {/* Header with avatar */}
        <View style={{ alignItems: 'center', marginVertical: S[6] }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: Colors.light.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: S[3],
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 36, fontWeight: '700' }}>
              {getInitials(profile?.firstName, profile?.lastName)}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: Colors.light.text,
              marginBottom: 4,
            }}
          >
            {profile?.firstName} {profile?.lastName}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: Colors.light.textSecondary,
              fontWeight: '500',
            }}
          >
            {profile?.position ?? 'Employé'}
          </Text>
        </View>

        {/* Info cards */}
        <View style={{ paddingHorizontal: S[4] }}>
          <InfoRow
            icon="mail-outline"
            label={STRINGS.profile.email}
            value={profile?.loginEmail ?? profile?.email}
          />
          <InfoRow
            icon="call-outline"
            label={STRINGS.profile.phone}
            value={profile?.phone}
          />
          <InfoRow
            icon="briefcase-outline"
            label={STRINGS.profile.position}
            value={profile?.position}
          />
          <InfoRow
            icon="business-outline"
            label={STRINGS.profile.department}
            value={profile?.department}
          />
          <InfoRow
            icon="globe-outline"
            label={STRINGS.profile.organization}
            value={profile?.organizationName}
          />
          <InfoRow
            icon="language-outline"
            label={STRINGS.profile.language}
            value={profile?.language ? profile.language.toUpperCase() : null}
          />
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: S[4], marginTop: S[3] }}>
          <ActionRow
            icon="create-outline"
            label={STRINGS.profile.edit}
            onPress={() => router.push('/profile/edit')}
          />
          <ActionRow
            icon="lock-closed-outline"
            label={STRINGS.profile.changePassword}
            onPress={() => router.push('/profile/change-password')}
          />
        </View>

        <View style={{ height: S[6] }} />

        {/* Logout button */}
        <View style={{ paddingHorizontal: S[4] }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({
              backgroundColor: Colors.light.surfaceCard,
              borderWidth: 1,
              borderColor: '#ef4444',
              borderRadius: 12,
              padding: S[3],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text
              style={{
                color: '#ef4444',
                fontSize: 15,
                fontWeight: '600',
                marginLeft: S[2],
              }}
            >
              {STRINGS.auth.logout}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: S[4],
        backgroundColor: Colors.light.surfaceCard,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.light.border,
        marginBottom: S[3],
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: Colors.light.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: S[3],
        }}
      >
        <Ionicons name={icon} size={18} color={Colors.light.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            color: Colors.light.textSecondary,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: Colors.light.text,
          }}
          numberOfLines={1}
        >
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

type ActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function ActionRow({ icon, label, onPress }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: S[4],
        backgroundColor: Colors.light.surfaceCard,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.light.border,
        marginBottom: S[3],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: Colors.light.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: S[3],
        }}
      >
        <Ionicons name={icon} size={18} color={Colors.light.primary} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '600',
          color: Colors.light.text,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
    </Pressable>
  );
}