import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { getDeviceTrust } from '@/lib/deviceInstallId';

type Props = {
  children: ReactNode;
};

/** Renders children only when the device is not PENDING; otherwise shows a block message. */
export function PendingDeviceBlock({ children }: Props) {
  const theme = useTheme();
  const [trust, setTrust] = useState<'TRUSTED' | 'PENDING' | null>(null);

  useEffect(() => {
    void getDeviceTrust().then(setTrust);
  }, []);

  if (trust === null) return null;

  if (trust === 'PENDING') {
    return (
      <View style={{ padding: Spacing[4], alignItems: 'center' }}>
        <View
          style={{
            padding: Spacing[5],
            borderRadius: 16,
            backgroundColor: '#fef3c7',
            borderWidth: 1,
            borderColor: '#fcd34d',
            alignItems: 'center',
            width: '100%',
            maxWidth: 360,
          }}
        >
          <Ionicons name="phone-portrait-outline" size={48} color="#b45309" />
          <Text
            style={{
              marginTop: Spacing[4],
              fontSize: 18,
              fontWeight: '700',
              color: '#92400e',
              textAlign: 'center',
            }}
          >
            {STRINGS.auth.devicePendingTitle}
          </Text>
          <Text
            style={{
              marginTop: Spacing[2],
              fontSize: 14,
              color: '#92400e',
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {STRINGS.auth.devicePendingBody}
          </Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

export function useDeviceTrustPending(): boolean | null {
  const [pending, setPending] = useState<boolean | null>(null);

  useEffect(() => {
    void getDeviceTrust().then((trust) => setPending(trust === 'PENDING'));
  }, []);

  return pending;
}
