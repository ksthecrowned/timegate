import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  bootstrapOperator,
  clearProvisioning,
  fetchDevicesForSite,
  getProvisionState,
  provisionKiosk,
  type TimeGateDevice,
  type TimeGateSite,
} from "../lib/timegate";
import { darkTheme } from "../theme/colors";

type SetupStep = "login" | "site" | "device";

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [step, setStep] = useState<SetupStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sku, setSku] = useState("");
  const [operatorToken, setOperatorToken] = useState<string | null>(null);
  const [sites, setSites] = useState<TimeGateSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<TimeGateSite | null>(null);
  const [devices, setDevices] = useState<TimeGateDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [creatingNewDevice, setCreatingNewDevice] = useState(false);
  const [inputDeviceName, setInputDeviceName] = useState("Borne principale");
  const [location, setLocation] = useState("Accueil");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function deviceStatusLabel(status?: string) {
    if (!status) return "Inconnu";
    if (status === "ONLINE") return "En ligne";
    if (status === "OFFLINE") return "Hors ligne";
    return status;
  }

  useEffect(() => {
    void (async () => {
      const state = await getProvisionState();
      setConfigured(state.hasToken);
      setDeviceName(state.deviceName);
      setLoading(false);
    })();
  }, []);

  async function handleLoginStep() {
    setError(null);
    setSubmitting(true);
    try {
      const data = await bootstrapOperator(email.trim(), password, sku.trim());
      setOperatorToken(data.operatorToken);
      setSites(data.sites);
      setStep("site");
      if (data.sites.length === 1) {
        await handleChooseSite(data.sites[0], data.operatorToken);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChooseSite(site: TimeGateSite, tokenFromArg?: string) {
    const token = tokenFromArg ?? operatorToken;
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const fetchedDevices = await fetchDevicesForSite(token, site.id);
      setSelectedSite(site);
      setDevices(fetchedDevices);
      setSelectedDeviceId("");
      setCreatingNewDevice(false);
      setStep("device");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les appareils");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProvision() {
    if (!operatorToken || !selectedSite) return;
    setError(null);
    setSubmitting(true);
    try {
      const state = await provisionKiosk({
        operatorToken,
        siteId: selectedSite.id,
        deviceId: creatingNewDevice ? undefined : selectedDeviceId || undefined,
        deviceName: creatingNewDevice ? inputDeviceName : undefined,
        location: location || undefined,
      });
      setConfigured(state.hasToken);
      setDeviceName(state.deviceName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Provision impossible");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LinearGradient colors={[darkTheme.bgTop, darkTheme.bgBottom]} style={styles.root}>
      <SafeAreaView style={[styles.safe, !configured && { paddingHorizontal: 20, paddingBottom: 16 }]}>
        {!configured && (
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="scan" size={18} color={darkTheme.accent} />
              </View>
              <Text style={styles.brand}>TimeGate</Text>
            </View>
            <Text style={styles.sub}>Kiosk de vérification faciale</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#FFF" />
          </View>
        ) : configured ? (
          <View style={styles.readyScreen}>
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0)"]}
              locations={[0, 0.5, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.readyCenterGradient}
            />
            <View style={styles.readyContent}>
              <Text style={styles.readyTitle}>Verification faciale</Text>
              <Text style={styles.readySub}>Assurez-vous d'etre bien en face de la camera</Text>

              <View style={styles.readyFaceArea}>
                <View style={[styles.readyCorner, styles.readyTopLeft]} />
                <View style={[styles.readyCorner, styles.readyTopRight]} />
                <View style={[styles.readyCorner, styles.readyBottomLeft]} />
                <View style={[styles.readyCorner, styles.readyBottomRight]} />
                <View style={styles.readyGifWrap}>
                  <Image
                    source={require("../1_4Tr0FOsdUgkF32T3mdu6pg_transparent.gif")}
                    style={styles.readyGif}
                    resizeMode="cover"
                  />
                </View>
              </View>

              <Text style={styles.readyDeviceName}>{deviceName ?? "Appareil pret"}</Text>

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={() => router.push("/scan")}
              >
                <Text style={styles.buttonText}>Commencer</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </Pressable>
              <Pressable
                onPress={() => {
                  void clearProvisioning();
                  setConfigured(false);
                  setDeviceName(null);
                }}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Reconfigurer cet appareil</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.formWrap}
          >
            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Configuration initiale</Text>
                <Text style={styles.panelText}>
                  Connectez un compte ADMIN/MANAGER puis associez ce terminal à un site et à un appareil.
                </Text>
                {!!error && <Text style={styles.error}>{error}</Text>}

                {step === "login" && (
                  <View style={styles.block}>
                    <Text style={styles.groupLabel}>Étape 1 - Connexion opérateur</Text>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="admin@timegate.local"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />
                    <Text style={styles.inputLabel}>Mot de passe</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Votre mot de passe"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Text style={styles.inputLabel}>SKU organisation</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="TMGT"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={sku}
                      onChangeText={setSku}
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed,
                        submitting && styles.disabled,
                      ]}
                      disabled={submitting}
                      onPress={() => void handleLoginStep()}
                    >
                      <Text style={styles.buttonText}>
                        {submitting ? "Connexion..." : "Valider la connexion"}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {step === "site" && (
                  <View style={styles.block}>
                    <Text style={styles.groupLabel}>Étape 2 - Choix du site</Text>
                    <Text style={styles.helperText}>
                      Sélectionnez le site par son nom.
                    </Text>
                    {sites.map((site) => (
                      <Pressable
                        key={site.id}
                        style={({ pressed }) => [
                          styles.choiceCard,
                          pressed && styles.choicePressed,
                        ]}
                        onPress={() => void handleChooseSite(site)}
                      >
                        <Text style={styles.choiceTitle}>{site.name}</Text>
                        <Text style={styles.choiceMeta}>
                          {site.address ?? "Adresse non renseignée"}
                        </Text>
                      </Pressable>
                    ))}
                    {sites.length === 0 && (
                      <Text style={styles.helperText}>Aucun site disponible pour ce compte.</Text>
                    )}
                  </View>
                )}

                {step === "device" && selectedSite && (
                  <View style={styles.block}>
                    <Text style={styles.groupLabel}>Étape 3 - Appareil</Text>
                    <Text style={styles.helperText}>
                      Site sélectionné: {selectedSite.name}
                    </Text>

                    {devices.length > 0 && (
                      <>
                        <Text style={styles.inputLabel}>Appareils existants</Text>
                        {devices.map((device) => (
                          <Pressable
                            key={device.id}
                            style={({ pressed }) => [
                              styles.choiceCard,
                              selectedDeviceId === device.id && styles.choiceSelected,
                              pressed && styles.choicePressed,
                            ]}
                            onPress={() => {
                              setSelectedDeviceId(device.id);
                              setCreatingNewDevice(false);
                            }}
                          >
                            <Text style={styles.choiceTitle}>{device.name}</Text>
                            <Text style={styles.choiceMeta}>
                              {device.location ?? "Sans localisation"} - {deviceStatusLabel(device.status)}
                            </Text>
                          </Pressable>
                        ))}
                      </>
                    )}

                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.choicePressed,
                      ]}
                      onPress={() => {
                        setCreatingNewDevice(true);
                        setSelectedDeviceId("");
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>+ Ajouter un nouvel appareil</Text>
                    </Pressable>

                    {creatingNewDevice && (
                      <>
                        <Text style={styles.inputLabel}>Nom du nouvel appareil</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Borne principale"
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          value={inputDeviceName}
                          onChangeText={setInputDeviceName}
                        />
                      </>
                    )}

                    <Text style={styles.inputLabel}>Localisation</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Accueil"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      value={location}
                      onChangeText={setLocation}
                    />

                    <Pressable
                      style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed,
                        submitting && styles.disabled,
                      ]}
                      disabled={submitting || (!creatingNewDevice && !selectedDeviceId)}
                      onPress={() => void handleProvision()}
                    >
                      <Text style={styles.buttonText}>
                        {submitting ? "Configuration en cours..." : "Configurer l'appareil"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { marginTop: 10, marginBottom: 14, gap: 6 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 28, fontWeight: "800", color: "#FFF", letterSpacing: -0.4 },
  sub: { color: darkTheme.textMuted, lineHeight: 20, fontSize: 14 },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  formWrap: { flex: 1 },
  formContent: { paddingBottom: 10 },
  button: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
    backgroundColor: darkTheme.buttonStart,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonPressed: { opacity: 0.92 },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    gap: 9,
  },
  panelTitle: { color: "#FFF", fontWeight: "700", fontSize: 18 },
  panelText: { color: darkTheme.textMuted, lineHeight: 20 },
  readyScreen: {
    position: "relative",
    flex: 1,
  },
  readyContent: {
    position: "relative",
    flex: 1,
    borderRadius: 22,
    backgroundColor: "rgba(5, 8, 30, 0.35)",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 14,
  },
  readyTitle: { color: "#FFFFFF", fontSize: 33, fontWeight: "700", letterSpacing: -0.4 },
  readySub: { color: "rgba(255,255,255,0.68)", fontSize: 18, marginTop: 8 },
  readyFaceArea: {
    flex: 1,
    marginTop: 30,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  readyGifWrap: {
    width: "85%",
    height: "70%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  readyGif: {
    width: "100%",
    height: "100%",
  },
  readyCenterGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  readyCorner: {
    position: "absolute",
    width: 46,
    height: 46,
    borderColor: "#F0F4FF",
    borderWidth: 0,
  },
  readyTopLeft: {
    top: "13%",
    left: "4%",
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  readyTopRight: {
    top: "13%",
    right: "4%",
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  readyBottomLeft: {
    bottom: "13%",
    left: "4%",
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  readyBottomRight: {
    bottom: "13%",
    right: "4%",
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  readyDeviceName: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 6,
  },
  block: { gap: 8 },
  groupLabel: {
    color: "#E8E2F6",
    marginTop: 4,
    marginBottom: 1,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  inputLabel: {
    color: "#EDEAF7",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    color: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  choiceSelected: {
    borderColor: darkTheme.accent,
    backgroundColor: "rgba(0,212,255,0.12)",
  },
  choicePressed: { opacity: 0.85 },
  choiceTitle: { color: "#FFF", fontWeight: "700" },
  choiceMeta: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#FFF", fontWeight: "600" },
  helperText: { color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 17, marginTop: 2 },
  error: { color: "#FECACA", fontSize: 13 },
  disabled: { opacity: 0.6 },
  linkBtn: { marginTop: 2, alignItems: "center", paddingVertical: 8 },
  linkText: { color: darkTheme.accent, fontWeight: "600" },
});
