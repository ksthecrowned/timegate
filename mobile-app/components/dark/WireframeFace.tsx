import { StyleSheet, View } from 'react-native';
import { darkTheme } from '../../theme/colors';

/** Grille / repères type maquette « mesh » (simplifié, sans caméra). */
export function WireframeFace() {
  return (
    <View style={styles.oval}>
      <View style={[styles.line, styles.brow]} />
      <View style={styles.eyesRow}>
        <View style={styles.eye} />
        <View style={styles.eye} />
      </View>
      <View style={[styles.line, styles.nose]} />
      <View style={[styles.line, styles.mouth]} />
      <View style={[styles.dot, styles.d1]} />
      <View style={[styles.dot, styles.d2]} />
      <View style={[styles.dot, styles.d3]} />
      <View style={[styles.dot, styles.d4]} />
    </View>
  );
}

const c = darkTheme.frame;

const styles = StyleSheet.create({
  oval: {
    width: 200,
    height: 260,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: c,
    alignSelf: 'center',
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  line: {
    position: 'absolute',
    backgroundColor: c,
  },
  brow: { width: 100, height: 2, top: 64 },
  eyesRow: { flexDirection: 'row', gap: 36, marginTop: -20 },
  eye: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: c,
  },
  nose: { width: 2, height: 36, top: 118 },
  mouth: { width: 64, height: 2, top: 168 },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: darkTheme.accent,
  },
  d1: { left: 24, top: 52 },
  d2: { right: 22, top: 38 },
  d3: { left: 20, top: 72 },
  d4: { right: 18, top: 78 },
});
