import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, Radius, Spacing } from "../../theme/colors";

type OperatorLoginFieldsProps = {
  email: string;
  password: string;
  sku: string;
  showPassword: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onTogglePassword: () => void;
};

export function OperatorLoginFields({
  email,
  password,
  sku,
  showPassword,
  onEmailChange,
  onPasswordChange,
  onSkuChange,
  onTogglePassword,
}: OperatorLoginFieldsProps) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="admin@sotrafer.cg"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={onEmailChange}
      />

      <Text style={styles.label}>Mot de passe</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.inputWithIcon]}
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={onPasswordChange}
        />
        <Pressable
          onPress={onTogglePassword}
          style={styles.eyeBtn}
          hitSlop={8}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#64748b"
          />
        </Pressable>
      </View>

      <Text style={styles.label}>Organisation (SKU)</Text>
      <TextInput
        style={styles.input}
        placeholder="SOTR"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        value={sku}
        onChangeText={onSkuChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing[2], marginBottom: Spacing[2] },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing[2],
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[4],
    fontSize: 15,
  },
  inputWithIcon: {
    flex: 1,
    paddingRight: 44,
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  eyeBtn: {
    position: "absolute",
    right: Spacing[2],
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
