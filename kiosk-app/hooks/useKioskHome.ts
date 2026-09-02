import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import type { SetupFeedback, SetupStep } from "../components/setup/KioskProvisionForm";
import { KIOSK_ACCESS_REVOKED } from "../lib/kiosk-sse";
import { getPendingVerifyCount, syncOfflineVerifications } from "../lib/offline-verify-queue";
import {
  bootstrapOperator,
  fetchKioskConfig,
  fetchKiosksForBranch,
  getKioskFeatures,
  getProvisionState,
  getTimeGateApiBase,
  provisionKiosk,
  type KioskFeatures,
  type TimeGateBranch,
  type TimeGateKiosk,
} from "../lib/timegate";

export function useKioskHome() {
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
  const [selectedBranch, setSelectedBranch] = useState<TimeGateBranch | null>(
    null,
  );
  const [kiosks, setKiosks] = useState<TimeGateKiosk[]>([]);
  const [selectedKioskId, setSelectedKioskId] = useState("");
  const [creatingNewKiosk, setCreatingNewKiosk] = useState(false);
  const [inputKioskName, setInputKioskName] = useState("Borne principale");
  const [location, setLocation] = useState("Accueil");
  const [feedback, setFeedback] = useState<SetupFeedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [features, setFeatures] = useState<KioskFeatures | null>(null);

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

  const handleOfflineSync = useCallback(async () => {
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
  }, []);

  const handleChooseBranch = useCallback(
    async (site: TimeGateBranch, tokenFromArg?: string) => {
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
    },
    [operatorToken],
  );

  const handleLoginStep = useCallback(async () => {
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
  }, [email, password, sku, handleChooseBranch]);

  const handleProvision = useCallback(async () => {
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
  }, [
    operatorToken,
    selectedBranch,
    creatingNewKiosk,
    selectedKioskId,
    inputKioskName,
    location,
  ]);

  const setupSubtitle =
    step === "login"
      ? "Configuration du kiosque"
      : step === "site"
        ? "Choix du site"
        : "Association de l'appareil";

  return {
    loading,
    configured,
    deviceName,
    step,
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
    feedback,
    submitting,
    pendingOfflineCount,
    syncingOffline,
    features,
    setupSubtitle,
    setEmail,
    setPassword,
    setSku,
    setShowPassword,
    setSelectedKioskId,
    setCreatingNewKiosk,
    setInputKioskName,
    setLocation,
    handleOfflineSync,
    handleLoginStep,
    handleChooseBranch,
    handleProvision,
  };
}
