"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useTimeGateAuth } from "@/context/TimeGateAuthContext";
import Button from "@/components/ui/button/Button";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { TimeGateApiError, timegateFetch } from "@/lib/timegate-api";
import { useRouter } from "next/navigation";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { token, isReady } = useTimeGateAuth();
  const router = useRouter();
  const [checkingSubscription, setCheckingSubscription] = React.useState(true);
  const [subscriptionActive, setSubscriptionActive] = React.useState(true);
  const [activationKey, setActivationKey] = React.useState("");
  const [activationError, setActivationError] = React.useState<string | null>(null);
  const [activating, setActivating] = React.useState(false);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  React.useEffect(() => {
    if (!isReady) return;
    if (!token) {
      router.replace("/signin");
    }
  }, [isReady, token, router]);

  React.useEffect(() => {
    if (!isReady || !token) return;
    let cancelled = false;
    (async () => {
      setCheckingSubscription(true);
      try {
        const status = await timegateFetch<{ active: boolean }>("/auth/subscription-status");
        if (!cancelled) {
          setSubscriptionActive(Boolean(status.active));
        }
      } catch (error) {
        if (!cancelled) {
          setSubscriptionActive(true);
          setActivationError(
            error instanceof Error
              ? error.message
              : "Impossible de vérifier le statut d'abonnement",
          );
        }
      } finally {
        if (!cancelled) setCheckingSubscription(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, token]);

  async function handleActivateSubscription() {
    setActivationError(null);
    setActivating(true);
    try {
      await timegateFetch("/auth/activate", {
        method: "POST",
        body: JSON.stringify({ activationKey: activationKey.trim() }),
      });
      setSubscriptionActive(true);
      setActivationKey("");
      router.refresh();
    } catch (error) {
      if (error instanceof TimeGateApiError) {
        setActivationError(error.body || `Erreur ${error.status}`);
      } else {
        setActivationError(
          error instanceof Error ? error.message : "Activation impossible",
        );
      }
    } finally {
      setActivating(false);
    }
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Vérification de la session...
      </div>
    );
  }

  if (!token) {
    return null;
  }

  if (checkingSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Vérification de l'abonnement...
      </div>
    );
  }

  if (!subscriptionActive) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Activation de l&apos;abonnement requise
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Saisissez votre clé d&apos;activation pour débloquer le dashboard.
          </p>
          {activationError && (
            <div className="mt-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
              {activationError}
            </div>
          )}
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white"
              placeholder="TMGT-XXXXXXXXXXXX"
            />
            <Button
              className="w-full"
              size="sm"
              disabled={activating || activationKey.trim().length < 8}
              onClick={() => void handleActivateSubscription()}
            >
              {activating ? "Activation..." : "Activer l'abonnement"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
