import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { lightTheme } from '../../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

export function PillButton({ label, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, style]}
      accessibilityRole="button"
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: lightTheme.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPressed: { backgroundColor: lightTheme.primaryPressed },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: lightTheme.text,
  },
});
