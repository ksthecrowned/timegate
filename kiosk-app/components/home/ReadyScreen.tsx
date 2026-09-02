import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { MessageBox } from "../shared/MessageBox";
import { PrimaryButton } from "../shared/PrimaryButton";
import { colors, Spacing } from "../../theme/colors";
import { KioskInfoModal } from "./KioskInfoModal";
import { ModeSlide } from "./ModeSlide";
import { buildPunchModes, type PunchMode } from "./punch-modes";

type ReadyScreenProps = {
  pendingOfflineCount: number;
  syncingOffline: boolean;
  faceEnabled: boolean;
  nfcEnabled: boolean;
  qrEnabled: boolean;
  onStartFace: () => void;
  onStartNfc: () => void;
  onStartQr: () => void;
  onSyncOffline: () => void;
};

export function ReadyScreen({
  pendingOfflineCount,
  syncingOffline,
  faceEnabled,
  nfcEnabled,
  qrEnabled,
  onStartFace,
  onStartNfc,
  onStartQr,
  onSyncOffline,
}: ReadyScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const listRef = useRef<FlatList<PunchMode>>(null);

  const modes = useMemo(
    () =>
      buildPunchModes({
        faceEnabled,
        nfcEnabled,
        qrEnabled,
        onStartFace,
        onStartNfc,
        onStartQr,
      }),
    [faceEnabled, nfcEnabled, qrEnabled, onStartFace, onStartNfc, onStartQr],
  );

  const multiMode = modes.length > 1;

  useEffect(() => {
    if (activeIndex >= modes.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, modes.length]);

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / screenWidth,
    );
    setActiveIndex(nextIndex);
  }

  if (modes.length === 0) {
    return null;
  }

  return (
    <View style={styles.readyScreen}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.readyCenterGradient}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Informations borne"
        onPress={() => setInfoOpen(true)}
        style={styles.infoButton}
      >
        <Ionicons
          name="information-circle-outline"
          size={26}
          color={colors.textSecondary}
        />
      </Pressable>

      <FlatList
        ref={listRef}
        data={modes}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={multiMode}
        scrollEnabled={multiMode}
        showsHorizontalScrollIndicator={false}
        bounces={multiMode}
        onMomentumScrollEnd={multiMode ? handleScrollEnd : undefined}
        getItemLayout={
          multiMode
            ? (_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })
            : undefined
        }
        style={styles.modePager}
        renderItem={({ item }) => (
          <View style={[styles.modeSlidePage, { width: screenWidth }]}>
            <ModeSlide mode={item} />
          </View>
        )}
      />

      <View style={styles.readyBottomBar}>
        {multiMode ? (
          <View style={styles.pageIndicatorWrap}>
            <Text style={styles.pageHint}>Glissez pour changer de mode</Text>
            <View style={styles.pageDots}>
              {modes.map((mode, index) => (
                <Pressable
                  key={mode.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Mode ${mode.title}`}
                  onPress={() => {
                    listRef.current?.scrollToIndex({ index, animated: true });
                    setActiveIndex(index);
                  }}
                  style={[
                    styles.pageDot,
                    index === activeIndex && styles.pageDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {pendingOfflineCount > 0 ? (
          <View style={styles.offlinePendingWrap}>
            <MessageBox
              variant="warn"
              message={`${pendingOfflineCount} vérification(s) en attente de synchronisation.`}
            />
            <PrimaryButton
              label={
                syncingOffline
                  ? "Synchronisation..."
                  : "Synchroniser maintenant"
              }
              onPress={onSyncOffline}
              disabled={syncingOffline}
              loading={syncingOffline}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>

      <KioskInfoModal
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
        faceEnabled={faceEnabled}
        nfcEnabled={nfcEnabled}
        qrEnabled={qrEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  readyScreen: { position: "relative", flex: 1 },
  infoButton: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[4],
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  modePager: { flex: 1 },
  modeSlidePage: { flex: 1 },
  readyBottomBar: {
    flexShrink: 0,
    width: "100%",
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
  },
  pageIndicatorWrap: {
    alignItems: "center",
    gap: Spacing[2],
  },
  pageHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  pageDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(148, 163, 184, 0.45)",
  },
  pageDotActive: {
    width: 22,
    backgroundColor: colors.tealLight,
  },
  readyCenterGradient: { position: "absolute", width: "100%", height: "100%" },
  offlinePendingWrap: { gap: Spacing[2] },
});
