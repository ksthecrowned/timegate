import type { Ionicons } from "@expo/vector-icons";

export type PunchMode = {
  id: "face" | "nfc" | "qr";
  title: string;
  subtitle: string;
  buttonLabel: string;
  trailingIcon: keyof typeof Ionicons.glyphMap;
  hero: "face-gif" | { icon: keyof typeof Ionicons.glyphMap; size: number };
  onStart: () => void;
};

export function buildPunchModes({
  faceEnabled,
  nfcEnabled,
  qrEnabled,
  onStartFace,
  onStartNfc,
  onStartQr,
}: {
  faceEnabled: boolean;
  nfcEnabled: boolean;
  qrEnabled: boolean;
  onStartFace: () => void;
  onStartNfc: () => void;
  onStartQr: () => void;
}): PunchMode[] {
  const modes: PunchMode[] = [];
  if (faceEnabled) {
    modes.push({
      id: "face",
      title: "Vérification faciale",
      subtitle:
        "Assurez-vous d'être bien en face de la caméra, dans un endroit bien éclairé.",
      buttonLabel: "Commencer le scan",
      trailingIcon: "scan-outline",
      hero: "face-gif",
      onStart: onStartFace,
    });
  }
  if (nfcEnabled) {
    modes.push({
      id: "nfc",
      title: "Badge NFC",
      subtitle: "Approchez votre badge NFC devant le lecteur pour pointer.",
      buttonLabel: "Badge NFC",
      trailingIcon: "card-outline",
      hero: { icon: "card-outline", size: 96 },
      onStart: onStartNfc,
    });
  }
  if (qrEnabled) {
    modes.push({
      id: "qr",
      title: "QR-code",
      subtitle: "Scannez le QR-code affiché avec l'application employé.",
      buttonLabel: "Afficher le QR-code",
      trailingIcon: "qr-code-outline",
      hero: { icon: "qr-code-outline", size: 88 },
      onStart: onStartQr,
    });
  }
  return modes;
}

export function formatEnabledModes({
  faceEnabled,
  nfcEnabled,
  qrEnabled,
}: {
  faceEnabled: boolean;
  nfcEnabled: boolean;
  qrEnabled: boolean;
}) {
  const modes: string[] = [];
  if (faceEnabled) modes.push("Visage");
  if (nfcEnabled) modes.push("NFC");
  if (qrEnabled) modes.push("QR-code");
  return modes.length > 0 ? modes.join(", ") : "Aucun";
}
