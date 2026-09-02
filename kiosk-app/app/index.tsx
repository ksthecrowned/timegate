import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KioskSetupShell } from "../components/setup/KioskSetupShell";
import { OperatorLoginFields } from "../components/setup/OperatorLoginFields";
import { MessageBox } from "../components/shared/MessageBox";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { KIOSK_ACCESS_REVOKED } from "../lib/kiosk-sse";
import { getPendingVerifyCount, syncOfflineVerifications } from "../lib/offline-verify-queue";
import {
    bootstrapOperator,
    fetchKiosksForBranch,
    fetchKioskConfig,
    getKioskFeatures,
    getProvisionState,
    getTimeGateApiBase,
    provisionKiosk,
    type KioskFeatures,
    type TimeGateBranch,
    type TimeGateKiosk
} from "../lib/timegate";
import { colors, Radius, Spacing } from "../theme/colors";

type SetupStep = "login" | "site" | "device";
type Feedback =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | { kind: "info"; message: string }
  | null;

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [step, setStep] = useState<SetupStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sku, setSku] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [operatorToken, setOperatorToken] = useState<string | null>(null);
  const [branches, setBranches] = useState<TimeGateBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<TimeGateBranch | null>(null);
  const [kiosks, setKiosks] = useState<TimeGateKiosk[]>([]);
  const [selectedKioskId, setSelectedKioskId] = useState<string>("");
  const [creatingNewKiosk, setCreatingNewKiosk] = useState(false);
  const [inputKioskName, setInputKioskName] = useState("Borne principale");
  const [location, setLocation] = useState("Accueil");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [features, setFeatures] = useState<KioskFeatures | null>(null);

  function deviceStatusLabel(status?: string) {
    if (!status) return "Inconnu";
    if (status === "ONLINE") return "En ligne";
    if (status === "OFFLINE") return "Hors ligne";
    return status;
  }

  useEffect(() => {
    void (async () => {
      try {
        const state = await getProvisionState();
        let fetchedFeatures = await getKioskFeatures();
        if (state.hasToken) {
          fetchedFeatures = (await fetchKioskConfig()) ?? fetchedFeatures;
        }
        setConfigured(state.hasToken);
        setDeviceName(state.deviceName);
        setFeatures(fetchedFeatures);
        if (state.hasToken) {
          setPendingOfflineCount(await getPendingVerifyCount());
        }
        console.log("[TimeGateKiosk] home ready", {
          configured: state.hasToken,
          apiBase: getTimeGateApiBase(),
        });
      } catch (error) {
        console.error("[TimeGateKiosk] bootstrap failed", error);
        setFeedback({
          kind: "error",
          message:
            error instanceof Error
              ? `Initialisation impossible: ${error.message}`
              : "Initialisation impossible. Redémarrez l'application.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      KIOSK_ACCESS_REVOKED,
      (payload: { reason?: string }) => {
        setConfigured(false);
        setDeviceName(null);
        setFeatures(null);
        setStep("login");
        setFeedback({
          kind: "info",
          message:
            payload?.reason === "deactivated"
              ? "Cette borne a été désactivée. Contactez un administrateur."
              : "Accès réinitialisé. Reconfigurez la borne pour continuer.",
        });
      },
    );
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!configured) return;
      void getPendingVerifyCount().then(setPendingOfflineCount);
      void fetchKioskConfig()
        .then((next) => {
          if (next) setFeatures(next);
          else void getKioskFeatures().then(setFeatures);
        })
        .catch(() => void getKioskFeatures().then(setFeatures));
    }, [configured]),
  );

  async function handleOfflineSync() {
    setSyncingOffline(true);
    try {
      const result = await syncOfflineVerifications(60_000);
      setPendingOfflineCount(result.pending);
      if (result.synced > 0) {
        setFeedback({
          kind: "success",
          message: `${result.synced} vérification(s) hors ligne synchronisée(s) avec succès.`,
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        message:
          "Impossible de synchroniser les pointages hors ligne. Vérifiez le réseau.",
      });
    } finally {
      setSyncingOffline(false);
    }
  }

  async function handleLoginStep() {
    setFeedback(null);
    setSubmitting(true);
    try {
      const data = await bootstrapOperator(email.trim(), password, sku.trim());
      setOperatorToken(data.operatorToken);
      setBranches(data.branches);
      setStep("site");
      if (data.branches.length === 1) {
        await handleChooseBranch(data.branches[0], data.operatorToken);
      }
    } catch (e) {
      setFeedback({
        kind: "error",
        message:
          e instanceof Error
            ? `${e.message}. Vérifiez l'email, le mot de passe et le SKU.`
            : "Connexion impossible. Vérifiez votre saisie.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChooseBranch(site: TimeGateBranch, tokenFromArg?: string) {
    const token = tokenFromArg ?? operatorToken;
    if (!token) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      const fetchedKiosks = await fetchKiosksForBranch(token, site.id);
      setSelectedBranch(site);
      setKiosks(fetchedKiosks);
      setSelectedKioskId("");
      setCreatingNewKiosk(false);
      setStep("device");
    } catch (e) {
      setFeedback({
        kind: "error",
        message:
          e instanceof Error
            ? `Impossible de charger les appareils: ${e.message}`
            : "Impossible de charger les appareils pour ce site.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProvision() {
    if (!operatorToken || !selectedBranch) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      const state = await provisionKiosk({
        operatorToken,
        branchId: selectedBranch.id,
        kioskId: creatingNewKiosk ? undefined : selectedKioskId || undefined,
        deviceName: creatingNewKiosk ? inputKioskName : undefined,
        location: location || undefined,
      });
      setConfigured(state.hasToken);
      setDeviceName(state.deviceName);
      setFeedback({
        kind: "success",
        message: "Appareil configuré avec succès. Vous pouvez lancer le scan.",
      });
    } catch (e) {
      setFeedback({
        kind: "error",
        message:
          e instanceof Error
            ? `Provision impossible: ${e.message}`
            : "Impossible de configurer cet appareil. Réessayez.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const setupSubtitle =
    step === "login"
      ? "Configuration du kiosque"
      : step === "site"
        ? "Choix du site"
        : "Association de l'appareil";

  return (
    <>
      {configured ? (
        <LinearGradient
          colors={[colors.bgTop, colors.bgBottom]}
          style={styles.root}
        >
          <SafeAreaView style={styles.safe}>
            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.text} />
              </View>
            ) : features !== null ? (
              <ReadyScreen
                deviceName={deviceName}
                pendingOfflineCount={pendingOfflineCount}
                syncingOffline={syncingOffline}
                nfcEnabled={features.nfcEnabled}
                faceEnabled={features.faceEnabled}
                qrEnabled={features.qrEnabled}
                onStartFace={() => router.push("/scan")}
                onStartNfc={() => router.push("/nfc")}
                onStartQr={() => router.push("/qr")}
                onSyncOffline={() => void handleOfflineSync()}
              />
            ) : null}
          </SafeAreaView>
        </LinearGradient>
      ) : (
        <KioskSetupShell subtitle={setupSubtitle}>
          {loading ? (
            <View style={styles.setupLoader}>
              <ActivityIndicator color={colors.teal} />
            </View>
          ) : (
            <View style={styles.setupForm}>
              {step === "login" ? (
                <Text style={styles.setupIntro}>
                  Connectez-vous avec un compte ADMIN ou MANAGER, puis associez
                  ce terminal à un site et à un appareil.
                </Text>
              ) : null}

              {feedback ? (
                <MessageBox
                  variant={feedback.kind}
                  message={feedback.message}
                />
              ) : null}

              {step === "login" ? (
                <View style={styles.block}>
                  <OperatorLoginFields
                    email={email}
                    password={password}
                    sku={sku}
                    showPassword={showPassword}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onSkuChange={setSku}
                    onTogglePassword={() => setShowPassword((v) => !v)}
                  />

                  <PrimaryButton
                    label={submitting ? "Connexion..." : "Se connecter"}
                    onPress={() => void handleLoginStep()}
                    disabled={
                      submitting || !email.trim() || !password || !sku.trim()
                    }
                    loading={submitting}
                    variant="primary"
                  />
                </View>
              ) : null}

              {step === "site" ? (
                  <View style={styles.block}>
                    <Text style={styles.setupGroupLabel}>
                      Étape 2 — Choix du site
                    </Text>
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
                        onPress={() => void handleChooseBranch(site)}
                      >
                        <View style={styles.choiceRow}>
                          <Ionicons
                            name="business-outline"
                            size={20}
                            color={colors.teal}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.setupChoiceTitle}>
                              {site.name}
                            </Text>
                            <Text style={styles.setupChoiceMeta}>
                              {site.address ?? "Adresse non renseignée"}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#94a3b8"
                          />
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
                    <Text style={styles.setupGroupLabel}>
                      Étape 3 — Appareil
                    </Text>
                    <MessageBox
                      variant="info"
                      message={`Site sélectionné: ${selectedBranch.name}`}
                    />

                    {kiosks.length > 0 ? (
                      <>
                        <Text style={styles.setupInputLabel}>
                          Appareils existants
                        </Text>
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
                              onPress={() => {
                                setSelectedKioskId(device.id);
                                setCreatingNewKiosk(false);
                              }}
                            >
                              <View style={styles.choiceRow}>
                                <Ionicons
                                  name="desktop-outline"
                                  size={20}
                                  color={selected ? colors.teal : "#94a3b8"}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.setupChoiceTitle}>
                                    {device.name}
                                  </Text>
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
                      onPress={() => {
                        setCreatingNewKiosk(true);
                        setSelectedKioskId("");
                      }}
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
                        <Text style={styles.setupInputLabel}>
                          Nom du nouvel appareil
                        </Text>
                        <TextInput
                          style={styles.setupInput}
                          placeholder="Borne principale"
                          placeholderTextColor="#94a3b8"
                          value={inputKioskName}
                          onChangeText={setInputKioskName}
                        />
                      </>
                    ) : null}

                    <Text style={styles.setupInputLabel}>Localisation</Text>
                    <TextInput
                      style={styles.setupInput}
                      placeholder="Accueil"
                      placeholderTextColor="#94a3b8"
                      value={location}
                      onChangeText={setLocation}
                    />

                    <PrimaryButton
                      label={
                        submitting
                          ? "Configuration en cours..."
                          : "Configurer l'appareil"
                      }
                      onPress={() => void handleProvision()}
                      disabled={
                        submitting || (!creatingNewKiosk && !selectedKioskId)
                      }
                      loading={submitting}
                      trailingIcon="arrow-forward"
                    />
                  </View>
                ) : null}
            </View>
          )}
        </KioskSetupShell>
      )}
    </>
  );
}

function ReadyScreen({
  deviceName,
  pendingOfflineCount,
  syncingOffline,
  faceEnabled,
  nfcEnabled,
  qrEnabled,
  onStartFace,
  onStartNfc,
  onStartQr,
  onSyncOffline,
}: {
  deviceName: string | null;
  pendingOfflineCount: number;
  syncingOffline: boolean;
  faceEnabled: boolean;
  nfcEnabled: boolean;
  qrEnabled: boolean;
  onStartFace: () => void;
  onStartNfc: () => void;
  onStartQr: () => void;
  onSyncOffline: () => void;
}) {
  const multiMode = faceEnabled && (nfcEnabled || qrEnabled);

  if (!multiMode) {
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
        <View style={styles.readyContent}>
          <Text style={styles.readyTitle}>Vérification faciale</Text>
          <Text style={styles.readySub}>
            Assurez-vous d'être bien en face de la caméra, dans un endroit
            bien éclairé.
          </Text>

          <View style={styles.readyFaceArea}>
            <View style={[styles.readyCorner, styles.readyTopLeft]} />
            <View style={[styles.readyCorner, styles.readyTopRight]} />
            <View style={[styles.readyCorner, styles.readyBottomLeft]} />
            <View style={[styles.readyCorner, styles.readyBottomRight]} />
            <View style={styles.readyGifWrap}>
              <Image
                source={require("../assets/images/scan_loader_transparent.gif")}
                style={styles.readyGif}
                resizeMode="cover"
              />
            </View>
          </View>

          <Text style={styles.readyDeviceName}>
            {deviceName ?? "Appareil prêt"}
          </Text>

          {pendingOfflineCount > 0 ? (
            <View style={styles.offlinePendingWrap}>
              <MessageBox
                variant="warn"
                message={`${pendingOfflineCount} vérification(s) en attente de synchronisation.`}
              />
              <PrimaryButton
                label={syncingOffline ? "Synchronisation..." : "Synchroniser maintenant"}
                onPress={onSyncOffline}
                disabled={syncingOffline}
                loading={syncingOffline}
                variant="secondary"
              />
            </View>
          ) : null}

          <PrimaryButton
            label={faceEnabled ? "Commencer le scan" : nfcEnabled ? "Badge NFC" : "Commencer"}
            onPress={faceEnabled ? onStartFace : nfcEnabled ? onStartNfc : onStartFace}
            trailingIcon={faceEnabled ? "scan-outline" : "card-outline"}
          />
        </View>
      </View>
    );
  }

  // If NFC is enabled, show the new two-card layout
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
      <View style={styles.readyContent}>
        <Text style={styles.readyTitle}>Choisissez votre mode de pointage</Text>
        <Text style={styles.readySub}>
          Sélectionnez une option pour pointer votre présence.
        </Text>

        <View style={[styles.readyHero, { flexDirection: "column" }]}>
          {faceEnabled ? (
            <ModeCard
              icon="scan-outline"
              title="Reconnaissance faciale"
              sub="Assurez-vous d'être bien en face de la caméra, dans un endroit bien éclairé."
              iconSize={40}
              onPress={onStartFace}
            />
          ) : null}
          {nfcEnabled ? (
            <ModeCard
              icon="card-outline"
              title="Badge NFC"
              sub="Approchez votre badge NFC pour pointer votre présence"
              iconSize={40}
              onPress={onStartNfc}
            />
          ) : null}
          {qrEnabled ? (
            <ModeCard
              icon="qr-code-outline"
              title="QR-code"
              sub="Scannez le QR-code pour pointer votre présence"
              iconSize={36}
              onPress={onStartQr}
            />
          ) : null}
        </View>

        <Text style={styles.readyDeviceName}>
          {deviceName ?? "Appareil prêt"}
        </Text>

        {pendingOfflineCount > 0 ? (
          <View style={styles.offlinePendingWrap}>
            <MessageBox
              variant="warn"
              message={`${pendingOfflineCount} vérification(s) en attente de synchronisation.`}
            />
            <PrimaryButton
              label={syncingOffline ? "Synchronisation..." : "Synchroniser maintenant"}
              onPress={onSyncOffline}
              disabled={syncingOffline}
              loading={syncingOffline}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ModeCard({
  icon,
  iconSize,
  title,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconSize: number;
  title: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.modeCard,
        pressed && styles.modeCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.modeIconWrap}>
        <Ionicons name={icon} size={iconSize} color={colors.tealLight} />
      </View>
      <View style={{ width: '70%' }}>
        <Text style={styles.modeTitle}>{title}</Text>
        {sub ? <Text style={styles.modeSub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { marginTop: Spacing[2], marginBottom: Spacing[4] },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  formWrap: { flex: 1 },
  formContent: { paddingBottom: Spacing[2] },
  panel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: Spacing[5],
    gap: Spacing[2],
  },
  panelTitle: { color: colors.text, fontWeight: "700", fontSize: 18 },
  panelText: { color: colors.textSecondary, lineHeight: 21, fontSize: 14 },
  readyScreen: { position: "relative", flex: 1 },
  readyContent: {
    position: "relative",
    flex: 1,
    borderRadius: Radius.xl,
    backgroundColor: colors.scrimSoft,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[7],
    paddingBottom: Spacing[4],
  },
  readyCenterGradient: { position: "absolute", width: "100%", height: "100%" },
  readyTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  readySub: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: Spacing[2],
    lineHeight: 22,
  },
  readyFaceArea: {
    flex: 1,
    marginTop: Spacing[6],
    marginBottom: Spacing[4],
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
  readyGif: { width: "100%", height: "100%" },
  readyCorner: {
    position: "absolute",
    width: 46,
    height: 46,
    borderColor: colors.info,
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
  readyHero: {
    flexDirection: "column",
    gap: Spacing[3],
    marginTop: Spacing[5],
    marginBottom: Spacing[4],
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingVertical: Spacing[5],
    paddingHorizontal: Spacing[3],
  },
  modeCardPressed: { opacity: 0.85 },
  modeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: "rgba(13, 148, 136, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[3],
  },
  modeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  modeSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  pinFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[2],
  },
  pinFallbackText: {
    color: colors.tealLight,
    fontWeight: "600",
    fontSize: 14,
  },
  readyDeviceName: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  offlinePendingWrap: { marginBottom: Spacing[3], gap: Spacing[2] },
  block: { gap: Spacing[2] },
  groupLabel: {
    color: colors.textSecondary,
    marginTop: Spacing[1],
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
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
    paddingVertical: Spacing[3],
    fontSize: 15,
  },
  passwordRow: { position: "relative", justifyContent: "center" },
  eyeBtn: {
    position: "absolute",
    right: Spacing[3],
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
  },
  choiceSelected: {
    borderColor: colors.teal,
    backgroundColor: "rgba(13, 148, 136, 0.12)",
  },
  choicePressed: { opacity: 0.85 },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  setupChoiceTitle: { color: "#0f172a", fontWeight: "600", fontSize: 15 },
  setupChoiceMeta: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  choiceTitle: { color: colors.text, fontWeight: "600", fontSize: 15 },
  choiceMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  secondaryButton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  linkBtn: {
    marginTop: Spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[2],
  },
  linkText: { color: colors.tealLight, fontWeight: "600" },
});
