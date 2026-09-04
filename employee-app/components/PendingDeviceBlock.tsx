import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppState, View, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getDeviceTrust } from '@/lib/deviceInstallId';
import { DevicePendingPanel } from '@/components/DevicePendingPanel';

type Props = {
  children: ReactNode;
};

/** Renders children only when the device is not PENDING; otherwise shows verify panel. */
export function PendingDeviceBlock({ children }: Props) {
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

  if (trust === null) return null;

  if (trust === 'PENDING') {
    return (
      <View style={styles.wrap}>
        <DevicePendingPanel variant="panel" />
      </View>
    );
  }

  return <>{children}</>;
}

/** Hook: true when device trust is PENDING; null while loading. */
export function useDeviceTrustPending(): boolean | null {
  const [pending, setPending] = useState<boolean | null>(null);

  useEffect(() => {
    const refresh = () => {
      void getDeviceTrust().then((trust) => setPending(trust === 'PENDING'));
    };
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  return pending;
}

const styles = StyleSheet.create({
  wrap: {
    padding: Spacing[4],
    alignItems: 'center',
  },
});
