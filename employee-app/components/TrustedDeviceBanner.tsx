import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { getDeviceTrust } from '@/lib/deviceInstallId';

export function TrustedDeviceBanner() {
  const theme = useTheme();
  const [trust, setTrust] = useState<'TRUSTED' | 'PENDING' | null>(null);

  useEffect(() => {
    void getDeviceTrust().then(setTrust);
  }, []);

  if (trust !== 'PENDING') return null;

  return (
    <View
      style={{
        marginHorizontal: Spacing[4],
        marginBottom: Spacing[3],
        padding: Spacing[3],
        borderRadius: 12,
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fcd34d',
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <Ionicons name="phone-portrait-outline" size={20} color="#b45309" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: '#92400e', marginBottom: 4 }}>
          {STRINGS.auth.devicePendingTitle}
        </Text>
        <Text style={{ fontSize: 13, color: '#92400e', lineHeight: 18 }}>
          {STRINGS.auth.devicePendingBody}
        </Text>
      </View>
    </View>
  );
}
