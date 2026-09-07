import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { lightTheme } from '../../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

/** Primary pill CTA — dashboard login gradient (primary → secondary). */
export function PillButton({ label, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.press, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={[lightTheme.buttonStart, lightTheme.buttonEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.btn}
      >
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: { opacity: 0.9 },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
