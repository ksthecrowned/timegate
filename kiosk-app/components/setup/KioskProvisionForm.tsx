import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { OperatorLoginFields } from "./OperatorLoginFields";
import { MessageBox } from "../shared/MessageBox";
import { PrimaryButton } from "../shared/PrimaryButton";
import { colors, Radius, Spacing } from "../../theme/colors";
import type { TimeGateBranch, TimeGateKiosk } from "../../lib/timegate";

export type SetupStep = "login" | "site" | "device";
export type SetupFeedback =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | { kind: "info"; message: string }
  | null;

function deviceStatusLabel(status?: string) {
  if (!status) return "Inconnu";
  if (status === "ONLINE") return "En ligne";
  if (status === "OFFLINE") return "Hors ligne";
  return status;
}

type KioskProvisionFormProps = {
  loading: boolean;
  step: SetupStep;
  feedback: SetupFeedback;
  submitting: boolean;
  email: string;
  password: string;
  sku: string;
  showPassword: boolean;
  branches: TimeGateBranch[];
  selectedBranch: TimeGateBranch | null;
  kiosks: TimeGateKiosk[];
  selectedKioskId: string;
  creatingNewKiosk: boolean;
  inputKioskName: string;
  location: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onTogglePassword: () => void;
  onLogin: () => void;
  onChooseBranch: (site: TimeGateBranch) => void;
  onSelectKiosk: (kioskId: string) => void;
  onStartCreateKiosk: () => void;
  onInputKioskNameChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onProvision: () => void;
};

export function KioskProvisionForm({
  loading,
  step,
  feedback,
  submitting,
  email,
  password,
  sku,
  showPassword,
  branches,
  selectedBranch,
  kiosks,
  selectedKioskId,
  creatingNewKiosk,
  inputKioskName,
  location,
  onEmailChange,
  onPasswordChange,
  onSkuChange,
  onTogglePassword,
  onLogin,
  onChooseBranch,
  onSelectKiosk,
  onStartCreateKiosk,
  onInputKioskNameChange,
  onLocationChange,
  onProvision,
}: KioskProvisionFormProps) {
  if (loading) {
    return (
      <View style={styles.setupLoader}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.setupForm}>
      {step === "login" ? (
        <Text style={styles.setupIntro}>
          Connectez-vous avec un compte ADMIN ou MANAGER, puis associez ce
          terminal à un site et à un appareil.
        </Text>
      ) : null}

      {feedback ? (
        <MessageBox variant={feedback.kind} message={feedback.message} />
      ) : null}

      {step === "login" ? (
        <View style={styles.block}>
          <OperatorLoginFields
            email={email}
            password={password}
            sku={sku}
            showPassword={showPassword}
            onEmailChange={onEmailChange}
            onPasswordChange={onPasswordChange}
            onSkuChange={onSkuChange}
            onTogglePassword={onTogglePassword}
          />

          <PrimaryButton
            label={submitting ? "Connexion..." : "Se connecter"}
            onPress={onLogin}
            disabled={submitting || !email.trim() || !password || !sku.trim()}
            loading={submitting}
            variant="primary"
          />
        </View>
      ) : null}

      {step === "site" ? (
        <View style={styles.block}>
          <Text style={styles.setupGroupLabel}>Étape 2 — Choix du site</Text>
          <Text style={styles.setupHelperText}>
            Sélectionnez le site sur lequel installer ce kiosque.
          </Text>
          {branches.map((site) => (
            <Pressable
              key={site.id}
              style={({ pressed }) => [
                styles.setupChoiceCard,
                pressed && styles.choicePressed,
              ]}
              onPress={() => onChooseBranch(site)}
            >
              <View style={styles.choiceRow}>
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={colors.teal}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.setupChoiceTitle}>{site.name}</Text>
                  <Text style={styles.setupChoiceMeta}>
                    {site.address ?? "Adresse non renseignée"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </View>
            </Pressable>
          ))}
          {branches.length === 0 ? (
            <MessageBox
              variant="info"
              message="Aucun site disponible pour ce compte. Contactez votre administrateur."
            />
          ) : null}
        </View>
      ) : null}

      {step === "device" && selectedBranch ? (
        <View style={styles.block}>
          <Text style={styles.setupGroupLabel}>Étape 3 — Appareil</Text>
          <MessageBox
            variant="info"
            message={`Site sélectionné: ${selectedBranch.name}`}
          />

          {kiosks.length > 0 ? (
            <>
              <Text style={styles.setupInputLabel}>Appareils existants</Text>
              {kiosks.map((device) => {
                const selected = selectedKioskId === device.id;
                return (
                  <Pressable
                    key={device.id}
                    style={({ pressed }) => [
                      styles.setupChoiceCard,
                      selected && styles.setupChoiceSelected,
                      pressed && styles.choicePressed,
                    ]}
                    onPress={() => onSelectKiosk(device.id)}
                  >
                    <View style={styles.choiceRow}>
                      <Ionicons
                        name="desktop-outline"
                        size={20}
                        color={selected ? colors.teal : "#94a3b8"}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.setupChoiceTitle}>{device.name}</Text>
                        <Text style={styles.setupChoiceMeta}>
                          {device.location ?? "Sans localisation"} •{" "}
                          {deviceStatusLabel(device.status)}
                        </Text>
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.teal}
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#94a3b8"
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.setupSecondaryButton,
              pressed && styles.choicePressed,
            ]}
            onPress={onStartCreateKiosk}
          >
            <View style={styles.choiceRow}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.teal}
              />
              <Text style={styles.setupSecondaryButtonText}>
                Ajouter un nouvel appareil
              </Text>
            </View>
          </Pressable>

          {creatingNewKiosk ? (
            <>
              <Text style={styles.setupInputLabel}>Nom du nouvel appareil</Text>
              <TextInput
                style={styles.setupInput}
                placeholder="Borne principale"
                placeholderTextColor="#94a3b8"
                value={inputKioskName}
                onChangeText={onInputKioskNameChange}
              />
            </>
          ) : null}

          <Text style={styles.setupInputLabel}>Localisation</Text>
          <TextInput
            style={styles.setupInput}
            placeholder="Accueil"
            placeholderTextColor="#94a3b8"
            value={location}
            onChangeText={onLocationChange}
          />

          <PrimaryButton
            label={
              submitting ? "Configuration en cours..." : "Configurer l'appareil"
            }
            onPress={onProvision}
            disabled={submitting || (!creatingNewKiosk && !selectedKioskId)}
            loading={submitting}
            trailingIcon="arrow-forward"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  setupLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[8],
  },
  setupForm: { gap: 0 },
  setupIntro: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  setupGroupLabel: {
    color: "#64748b",
    marginTop: Spacing[1],
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  setupHelperText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  setupInputLabel: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
    marginTop: Spacing[2],
  },
  setupInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: 15,
  },
  setupChoiceCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
  },
  setupChoiceSelected: {
    borderColor: colors.teal,
    backgroundColor: "rgba(13, 148, 136, 0.08)",
  },
  setupSecondaryButton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    backgroundColor: "#ffffff",
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
  },
  setupSecondaryButtonText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  block: { gap: Spacing[2] },
  choicePressed: { opacity: 0.85 },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  setupChoiceTitle: { color: "#0f172a", fontWeight: "600", fontSize: 15 },
  setupChoiceMeta: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
});
