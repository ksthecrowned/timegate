import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { MinTouchTarget, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

function parseIsoDay(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = parseIsoDay(iso);
  if (!d) return iso;
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  label: string;
  value: string;
  onChange: (isoDay: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
};

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Choisir une date",
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = parseIsoDay(value) ?? new Date();

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
    }
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }
    if (date) {
      onChange(toIsoDay(date));
    }
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `, ${formatDisplay(value)}` : ""}`}
        accessibilityHint="Ouvre le sélecteur de date"
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.value,
            { color: value ? theme.text : theme.textMuted },
          ]}
        >
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
      </Pressable>

      {open ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickerChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          locale="fr-FR"
        />
      ) : null}

      {Platform.OS === "ios" && open ? (
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer le sélecteur de date"
          style={[styles.doneBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.doneText}>OK</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing[1] },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  field: {
    minHeight: MinTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing[2],
  },
  value: { flex: 1, fontSize: 15, fontWeight: "500" },
  doneBtn: {
    alignSelf: "flex-end",
    marginTop: Spacing[2],
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
