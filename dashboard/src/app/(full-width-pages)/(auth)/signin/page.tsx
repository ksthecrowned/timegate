import TimeGateSignInForm from "@/components/auth/TimeGateSignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion TimeGate | Admin",
  description: "Connexion à l’API TimeGate pour le tableau de bord admin",
};

export default function SignIn() {
  return <TimeGateSignInForm />;
}
