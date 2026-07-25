import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import {
  markDeviceOnboardingSeen,
  shouldShowDeviceOnboarding,
} from '@/lib/deviceInstallId';

const STEPS = [
  {
    icon: 'phone-portrait-outline' as const,
    title: STRINGS.auth.deviceOnboardingStep1Title,
    body: STRINGS.auth.deviceOnboardingStep1Body,
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: STRINGS.auth.deviceOnboardingStep2Title,
    body: STRINGS.auth.deviceOnboardingStep2Body,
  },
  {
    icon: 'qr-code-outline' as const,
    title: STRINGS.auth.deviceOnboardingStep3Title,
    body: STRINGS.auth.deviceOnboardingStep3Body,
  },
];

/**
 * One-time explainer when the current install is PENDING admin approval.
 */
export function DeviceTrustOnboarding() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void shouldShowDeviceOnboarding().then(setVisible);
  }, []);

  const dismiss = useCallback(async () => {
    await markDeviceOnboardingSeen();
    setVisible(false);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => void dismiss()}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.border,
            },
          ]}
          accessibilityRole="summary"
          accessibilityLabel={STRINGS.auth.deviceOnboardingTitle}
        >
          <View
            style={[styles.heroIcon, { backgroundColor: theme.warningSoft }]}
          >
            <Ionicons name="phone-portrait-outline" size={28} color={theme.warning} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            {STRINGS.auth.deviceOnboardingTitle}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {STRINGS.auth.deviceOnboardingSubtitle}
          </Text>

          {STEPS.map((step) => (
            <View key={step.title} style={styles.stepRow}>
              <View
                style={[styles.stepIcon, { backgroundColor: `${theme.primary}18` }]}
              >
                <Ionicons name={step.icon} size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>
                  {step.title}
                </Text>
                <Text style={[styles.stepBody, { color: theme.textSecondary }]}>
                  {step.body}
                </Text>
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => void dismiss()}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.auth.deviceOnboardingCta}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.ctaText}>{STRINGS.auth.deviceOnboardingCta}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: Spacing[5],
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[5],
    gap: Spacing[3],
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  stepBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  cta: {
    marginTop: Spacing[2],
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
