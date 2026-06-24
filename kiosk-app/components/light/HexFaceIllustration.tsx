import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { lightTheme } from '../../theme/colors';

/** Silhouette + cadre type « scan » (inspiration maquette iPAY, version simplifiée). */
export function HexFaceIllustration() {
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scan, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  const scanTranslate = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-56, 56],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.cornerTL} />
      <View style={styles.cornerTR} />
      <View style={styles.cornerBL} />
      <View style={styles.cornerBR} />

      <View style={styles.hexOuter}>
        <View style={styles.faceSilhouette}>
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanTranslate }] },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const corner = {
  position: 'absolute' as const,
  width: 28,
  height: 28,
  borderColor: lightTheme.text,
};

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerTL: {
    ...corner,
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    ...corner,
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    ...corner,
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    ...corner,
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  hexOuter: {
    width: 160,
    height: 180,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: lightTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  faceSilhouette: {
    width: 88,
    height: 110,
    borderRadius: 44,
    backgroundColor: '#E4E4E4',
    overflow: 'hidden',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    width: '120%',
    height: 4,
    backgroundColor: lightTheme.accentLine,
    opacity: 0.9,
    top: '45%',
  },
});
