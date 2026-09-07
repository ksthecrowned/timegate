import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  getDeviceTrust,
  onDeviceTrustChange,
  type DeviceTrustValue,
} from '@/lib/deviceInstallId';
import { DevicePendingPanel } from '@/components/DevicePendingPanel';

export function TrustedDeviceBanner() {
  const [trust, setTrust] = useState<DeviceTrustValue>(null);

  useEffect(() => {
    const refresh = () => {
      void getDeviceTrust().then(setTrust);
    };
    refresh();
    const unsub = onDeviceTrustChange(setTrust);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      unsub();
      sub.remove();
    };
  }, []);

  if (trust !== 'PENDING') return null;

  return <DevicePendingPanel variant="banner" />;
}
