import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  showArrow?: boolean;
};

export function GradientButton({ label, onPress, showArrow }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.press} accessibilityRole="button">
      <LinearGradient
        colors={[darkTheme.buttonStart, darkTheme.buttonEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.grad}
      >
        <Text style={styles.txt}>{label}</Text>
        {showArrow ? <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.icon} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: 999, overflow: 'hidden' },
  grad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 8,
  },
  txt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  icon: { marginLeft: 4 },
});
