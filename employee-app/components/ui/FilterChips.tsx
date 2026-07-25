import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MinTouchTarget, Radius, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";

export type FilterChipOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              selected
                ? STRINGS.a11y.filterSelected(opt.label)
                : STRINGS.a11y.filter(opt.label)
            }
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.surfaceCard,
                borderColor: selected ? theme.primary : theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selected ? "#fff" : theme.text },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  chip: {
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
