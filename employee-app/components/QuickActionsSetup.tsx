import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';

import { STRINGS } from '@/constants/strings';
import { getToken } from '@/lib/api';
import { onLogout } from '@/lib/authEvents';

/**
 * Registers Android/iOS home-screen shortcuts (long-press app icon)
 * and routes taps via expo-router.
 */
export function QuickActionsSetup() {
  const router = useRouter();

  useEffect(() => {
    const register = async () => {
      const supported = await QuickActions.isSupported().catch(() => false);
      if (!supported) return;

      const token = await getToken();
      if (!token) {
        await QuickActions.setItems([]);
        return;
      }

      await QuickActions.setItems([
        {
          id: 'qr-punch',
          title: STRINGS.home.actionMyQr,
          subtitle: Platform.OS === 'ios' ? STRINGS.qrPunch.title : undefined,
          icon: Platform.OS === 'ios' ? 'symbol:qrcode' : 'time',
          params: { href: '/qr-punch' },
        },
        {
          id: 'leave-balances',
          title: STRINGS.leaveBalances.title,
          icon: Platform.OS === 'ios' ? 'symbol:calendar' : 'date',
          params: { href: '/leave-balances' },
        },
        {
          id: 'break-resume',
          title: STRINGS.home.actionBreakResume,
          icon: Platform.OS === 'ios' ? 'symbol:cup.and.saucer' : 'pause',
          params: { href: '/break-resume' },
        },
        {
          id: 'attendance',
          title: STRINGS.home.actionAttendance,
          icon: Platform.OS === 'ios' ? 'symbol:clock' : 'bookmark',
          params: { href: '/attendance' },
        },
      ]);
    };

    void register();
    return onLogout(() => {
      void QuickActions.setItems([]);
    });
  }, []);

  useQuickActionCallback((action) => {
    const href = action?.params?.href;
    if (typeof href === 'string' && href.startsWith('/')) {
      router.push(href as never);
    }
  });

  return null;
}
