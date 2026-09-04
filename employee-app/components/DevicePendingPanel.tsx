import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { STRINGS } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Compact banner-style vs full panel for blocked screens */
  variant?: 'banner' | 'panel';
};

/**
 * Explains PENDING device trust: shared-phone / new-device case,
 * what remains readable, and that RH must approve before punch.
 */
export function DevicePendingPanel({ variant = 'panel' }: Props) {
  const theme = useTheme();
  const compact = variant === 'banner';

  return (
    <View
      style={[
        styles.root,
        compact ? styles.banner : styles.panel,
        {
          backgroundColor: theme.warningSoft,
          borderColor: theme.warning,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${STRINGS.auth.devicePendingTitle}. ${STRINGS.auth.devicePendingBody}`}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconWrap,
            compact && styles.iconWrapCompact,
            { backgroundColor: `${theme.warning}22` },
          ]}
        >
          <Ionicons
            name="shield-outline"
            size={compact ? 20 : 28}
            color={theme.warning}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.warning }]}>
            {STRINGS.auth.devicePendingTitle}
          </Text>
          <Text
            style={[
              styles.body,
              { color: theme.warning, marginTop: compact ? 2 : 4 },
            ]}
          >
            {STRINGS.auth.devicePendingBody}
          </Text>
        </View>
      </View>

      {!compact ? (
        <>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            {STRINGS.auth.devicePendingSharedHint}
          </Text>

          <View style={styles.lists}>
            <View style={styles.listBlock}>
              <View style={styles.listTitleRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={theme.success}
                />
                <Text style={[styles.listTitle, { color: theme.text }]}>
                  {STRINGS.auth.devicePendingAllowedTitle}
                </Text>
              </View>
              <Text style={[styles.listBody, { color: theme.textSecondary }]}>
                {STRINGS.auth.devicePendingAllowedBody}
              </Text>
            </View>

            <View style={styles.listBlock}>
              <View style={styles.listTitleRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={theme.danger}
                />
                <Text style={[styles.listTitle, { color: theme.text }]}>
                  {STRINGS.auth.devicePendingBlockedTitle}
                </Text>
              </View>
              <Text style={[styles.listBody, { color: theme.textSecondary }]}>
                {STRINGS.auth.devicePendingBlockedBody}
              </Text>
            </View>
          </View>

          <Text style={[styles.askAdmin, { color: theme.text }]}>
            {STRINGS.auth.devicePendingAskAdmin}
          </Text>
        </>
      ) : (
        <Text style={[styles.hintCompact, { color: theme.warning }]}>
          {STRINGS.auth.devicePendingAskAdmin}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  banner: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[3],
    gap: Spacing[2],
  },
  panel: {
    padding: Spacing[4],
    gap: Spacing[3],
    width: '100%',
    maxWidth: 400,
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  hintCompact: {
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 48,
  },
  lists: {
    gap: Spacing[3],
  },
  listBlock: {
    gap: 4,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  listBody: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 22,
  },
  askAdmin: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
