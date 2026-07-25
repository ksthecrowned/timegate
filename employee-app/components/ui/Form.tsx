import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const S = Spacing;

type FormErrorProps = {
  message?: string | null;
};

/** Inline form error banner (theme danger — replaces hardcoded pink boxes). */
export function FormError({ message }: FormErrorProps) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <View
      style={[
        styles.error,
        {
          backgroundColor: theme.dangerSoft,
          borderColor: theme.danger,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Ionicons
        name="alert-circle"
        size={18}
        color={theme.danger}
        style={styles.errorIcon}
      />
      <Text style={[styles.errorText, { color: theme.danger }]}>{message}</Text>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Label + optional hint wrapping a control. */
export function FormField({ label, hint, children, style }: FormFieldProps) {
  const theme = useTheme();
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      {children}
      {hint ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

type FormTextInputProps = TextInputProps & {
  label: string;
  hint?: string;
  rightSlot?: ReactNode;
  disabled?: boolean;
};

export function FormTextInput({
  label,
  hint,
  rightSlot,
  disabled,
  style,
  editable,
  ...props
}: FormTextInputProps) {
  const theme = useTheme();
  const isEditable = editable !== false && !disabled;
  return (
    <FormField label={label} hint={hint}>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textMuted}
          editable={isEditable}
          style={[
            styles.input,
            rightSlot ? styles.inputWithRight : null,
            !isEditable ? styles.inputDisabled : null,
            {
              color: isEditable ? theme.text : theme.textSecondary,
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
            style,
          ]}
          {...props}
        />
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
    </FormField>
  );
}

type FormTextAreaProps = TextInputProps & {
  label: string;
  hint?: string;
  minHeight?: number;
};

export function FormTextArea({
  label,
  hint,
  minHeight = 140,
  style,
  ...props
}: FormTextAreaProps) {
  const theme = useTheme();
  return (
    <FormField label={label} hint={hint}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        multiline
        textAlignVertical="top"
        style={[
          styles.input,
          styles.textarea,
          {
            minHeight,
            color: theme.text,
            backgroundColor: theme.background,
            borderColor: theme.border,
          },
          style,
        ]}
        {...props}
      />
    </FormField>
  );
}

type FormPasswordInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function FormPasswordInput({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  disabled,
  placeholder = '••••••••',
}: FormPasswordInputProps) {
  const theme = useTheme();
  return (
    <FormTextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      disabled={disabled}
      placeholder={placeholder}
      rightSlot={
        <Pressable
          onPress={onToggleVisible}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
      }
    />
  );
}

type FormPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function FormPrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: FormPrimaryButtonProps) {
  const theme = useTheme();
  const inactive = Boolean(loading || disabled);
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: theme.primary,
          opacity: pressed || inactive ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

type FormSecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function FormSecondaryButton({
  label,
  onPress,
  disabled,
}: FormSecondaryButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.secondaryBtn,
        {
          borderColor: theme.border,
          backgroundColor: theme.surfaceCard,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

type FormCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FormCard({ children, style }: FormCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceCard,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: S[3],
    marginBottom: S[3],
  },
  errorIcon: { marginRight: S[2], marginTop: 1 },
  errorText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  field: { marginBottom: S[4] },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: S[2],
  },
  hint: { fontSize: 12, marginTop: S[1] },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    fontSize: 16,
    minHeight: MinTouchTarget,
  },
  inputWithRight: { paddingRight: 48 },
  inputDisabled: { opacity: 0.75 },
  textarea: {
    paddingTop: S[3],
  },
  rightSlot: {
    position: 'absolute',
    right: S[3],
    height: '100%',
    justifyContent: 'center',
  },
  primaryBtn: {
    marginTop: S[2],
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[4],
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    marginTop: S[2],
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[4],
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700' },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: S[4],
  },
});
