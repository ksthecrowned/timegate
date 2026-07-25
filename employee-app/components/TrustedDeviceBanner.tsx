import { useEffect, useState } from 'react';
import { AppState, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { getDeviceTrust } from '@/lib/deviceInstallId';

export function TrustedDeviceBanner() {
  const theme = useTheme();
  const [trust, setTrust] = useState<'TRUSTED' | 'PENDING' | null>(null);

  useEffect(() => {
    const refresh = () => {
      void getDeviceTrust().then(setTrust);
    };
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  if (trust !== 'PENDING') return null;

  return (
    <View
      style={{
        marginHorizontal: Spacing[4],
        marginBottom: Spacing[3],
        padding: Spacing[3],
        borderRadius: 12,
        backgroundColor: theme.warningSoft,
        borderWidth: 1,
        borderColor: theme.warning,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
      }}
      accessibilityRole="summary"
      accessibilityLabel={`${STRINGS.auth.devicePendingTitle}. ${STRINGS.auth.devicePendingBody}`}
    >
      <Ionicons name="phone-portrait-outline" size={20} color={theme.warning} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: theme.warning, marginBottom: 4 }}>
          {STRINGS.auth.devicePendingTitle}
        </Text>
        <Text style={{ fontSize: 13, color: theme.warning, lineHeight: 18 }}>
          {STRINGS.auth.devicePendingBody}
        </Text>
      </View>
    </View>
  );
}
