import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { colors, Spacing } from "../../theme/colors";
import { MessageBox } from "./MessageBox";

type BannerVariant = "error" | "success" | "warn" | "info";

type PunchModeHeaderProps = {
  title: string;
  bannerMessage?: string | null;
  bannerVariant?: BannerVariant;
  onBack?: () => void;
  transparent?: boolean;
  style?: ViewStyle;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function PunchModeHeader({
  title,
  bannerMessage,
  bannerVariant = "info",
  onBack,
  transparent = false,
  style,
  onLayout,
}: PunchModeHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        transparent ? styles.wrapTransparent : null,
        style,
      ]}
      onLayout={onLayout}
    >
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {bannerMessage ? (
        <View style={styles.bannerWrap}>
          <MessageBox variant={bannerVariant} message={bannerMessage} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  wrapTransparent: {
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[4],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  headerSpacer: {
    width: 28,
  },
  bannerWrap: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[3],
  },
});
