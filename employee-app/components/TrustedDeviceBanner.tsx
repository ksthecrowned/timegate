import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getDeviceTrust } from '@/lib/deviceInstallId';
import { DevicePendingPanel } from '@/components/DevicePendingPanel';

export function TrustedDeviceBanner() {
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

  return <DevicePendingPanel variant="banner" />;
}
