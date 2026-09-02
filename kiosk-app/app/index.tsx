import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReadyScreen } from "../components/home/ReadyScreen";
import { KioskProvisionForm } from "../components/setup/KioskProvisionForm";
import { KioskSetupShell } from "../components/setup/KioskSetupShell";
import { useKioskHome } from "../hooks/useKioskHome";
import { colors } from "../theme/colors";

export default function HomeScreen() {
  const router = useRouter();
  const home = useKioskHome();

  return (
    <>
      {home.configured ? (
        <LinearGradient
          colors={[colors.bgTop, colors.bgBottom]}
          style={styles.root}
        >
          <SafeAreaView style={styles.safe}>
            {home.loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={colors.text} />
              </View>
            ) : home.features !== null ? (
              <ReadyScreen
                pendingOfflineCount={home.pendingOfflineCount}
                syncingOffline={home.syncingOffline}
                nfcEnabled={home.features.nfcEnabled}
                faceEnabled={home.features.faceEnabled}
                qrEnabled={home.features.qrEnabled}
                onStartFace={() => router.push("/scan")}
                onStartNfc={() => router.push("/nfc")}
                onStartQr={() => router.push("/qr")}
                onSyncOffline={() => void home.handleOfflineSync()}
              />
            ) : null}
          </SafeAreaView>
        </LinearGradient>
      ) : (
        <KioskSetupShell subtitle={home.setupSubtitle}>
          <KioskProvisionForm
            loading={home.loading}
            step={home.step}
            feedback={home.feedback}
            submitting={home.submitting}
            email={home.email}
            password={home.password}
            sku={home.sku}
            showPassword={home.showPassword}
            branches={home.branches}
            selectedBranch={home.selectedBranch}
            kiosks={home.kiosks}
            selectedKioskId={home.selectedKioskId}
            creatingNewKiosk={home.creatingNewKiosk}
            inputKioskName={home.inputKioskName}
            location={home.location}
            onEmailChange={home.setEmail}
            onPasswordChange={home.setPassword}
            onSkuChange={home.setSku}
            onTogglePassword={() => home.setShowPassword((value) => !value)}
            onLogin={() => void home.handleLoginStep()}
            onChooseBranch={(site) => void home.handleChooseBranch(site)}
            onSelectKiosk={(kioskId) => {
              home.setSelectedKioskId(kioskId);
              home.setCreatingNewKiosk(false);
            }}
            onStartCreateKiosk={() => {
              home.setCreatingNewKiosk(true);
              home.setSelectedKioskId("");
            }}
            onInputKioskNameChange={home.setInputKioskName}
            onLocationChange={home.setLocation}
            onProvision={() => void home.handleProvision()}
          />
        </KioskSetupShell>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
});
