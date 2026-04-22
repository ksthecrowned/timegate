import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  title: string;
  variant?: 'light' | 'dark';
};

export function BackHeader({ title, variant = 'light' }: Props) {
  const router = useRouter();
  const isDark = variant === 'dark';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, isDark && styles.backBtnDark]}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name="chevron-back" size={22} color={isDark ? '#FFF' : '#111'} />
      </Pressable>
      <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnDark: {
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginHorizontal: 8,
  },
  titleDark: { color: '#FFF' },
  spacer: { width: 40 },
});
