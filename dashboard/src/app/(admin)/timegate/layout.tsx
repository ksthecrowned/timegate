import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TimeGate | Admin",
  description: "Gestion TimeGate — sites, employés, pointage",
};

export default function TimeGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
