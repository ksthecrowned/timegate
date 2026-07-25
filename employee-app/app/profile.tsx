import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTheme } from '@/hooks/use-theme';
import { dispatchLogout } from '@/lib/authEvents';
import { getMeCached } from '@/lib/meCache';
import { removeToken } from '@/lib/api';
import type { Profile } from '@/lib/types';

const S = Spacing;

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
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
      <ScreenLayout title={STRINGS.profile.title} showBack showNotifications={false}>
        <View style={{ padding: S[8], alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout title={STRINGS.profile.title} showBack showNotifications={false}>
        <View
          style={{
            margin: S[4],
            padding: S[5],
            backgroundColor: theme.dangerSoft,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: theme.danger,
          }}
        >
          <Text style={{ color: theme.danger, fontSize: 14 }}>{error}</Text>
        </View>
      </ScreenLayout>
    );
  }

  const fullName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();

  return (
    <ScreenLayout
      title={STRINGS.profile.title}
      showBack
      showNotifications={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable
          onPress={() => router.push('/profile/edit')}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.profile.edit}
          hitSlop={8}
          style={({ pressed }) => ({
            minWidth: MinTouchTarget,
            minHeight: MinTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="create-outline" size={22} color={theme.primary} />
        </Pressable>
      }
    >
      <View style={{ alignItems: 'center', marginVertical: S[6] }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: S[3],
          }}
          accessibilityRole="image"
          accessibilityLabel={`Avatar de ${fullName || 'profil'}`}
        >
          <Text style={{ color: '#ffffff', fontSize: 36, fontWeight: '700' }}>
            {getInitials(profile?.firstName, profile?.lastName)}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: theme.text,
            marginBottom: 4,
          }}
          accessibilityRole="header"
        >
          {fullName}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: theme.textSecondary,
            fontWeight: '500',
          }}
        >
          {profile?.position ?? 'Employé'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: S[4] }}>
        <InfoRow
          icon="mail-outline"
          label={STRINGS.profile.email}
          value={profile?.loginEmail ?? profile?.email}
          theme={theme}
        />
        <InfoRow
          icon="call-outline"
          label={STRINGS.profile.phone}
          value={profile?.phone}
          theme={theme}
        />
        <InfoRow
          icon="briefcase-outline"
          label={STRINGS.profile.position}
          value={profile?.position}
          theme={theme}
        />
        <InfoRow
          icon="business-outline"
          label={STRINGS.profile.department}
          value={profile?.department}
          theme={theme}
        />
        <InfoRow
          icon="globe-outline"
          label={STRINGS.profile.organization}
          value={profile?.organizationName}
          theme={theme}
        />
        <InfoRow
          icon="language-outline"
          label={STRINGS.profile.language}
          value={profile?.language ? profile.language.toUpperCase() : null}
          theme={theme}
        />
      </View>

      <View style={{ paddingHorizontal: S[4], marginTop: S[3] }}>
        <ActionRow
          icon="create-outline"
          label={STRINGS.profile.edit}
          onPress={() => router.push('/profile/edit')}
          theme={theme}
        />
        <ActionRow
          icon="lock-closed-outline"
          label={STRINGS.profile.changePassword}
          onPress={() => router.push('/profile/change-password')}
          theme={theme}
        />
      </View>

      <View style={{ height: S[6] }} />

      <View style={{ paddingHorizontal: S[4] }}>
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.a11y.logout}
          style={({ pressed }) => ({
            backgroundColor: theme.surfaceCard,
            borderWidth: 1,
            borderColor: theme.danger,
            borderRadius: Radius.md,
            minHeight: MinTouchTarget,
            padding: S[3],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text
            style={{
              color: theme.danger,
              fontSize: 15,
              fontWeight: '600',
              marginLeft: S[2],
            }}
          >
            {STRINGS.auth.logout}
          </Text>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}

type ThemeColors = ReturnType<typeof useTheme>;

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  theme: ThemeColors;
};

function InfoRow({ icon, label, value, theme }: InfoRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MinTouchTarget,
        padding: S[4],
        backgroundColor: theme.surfaceCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: S[3],
      }}
      accessible
      accessibilityLabel={`${label} : ${value || 'non renseigné'}`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: S[3],
        }}
      >
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            color: theme.textSecondary,
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
            color: theme.text,
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
  theme: ThemeColors;
};

function ActionRow({ icon, label, onPress, theme }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MinTouchTarget,
        padding: S[4],
        backgroundColor: theme.surfaceCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: S[3],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: S[3],
        }}
      >
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '600',
          color: theme.text,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}
