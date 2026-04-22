"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useTimeGateAuth } from "@/context/TimeGateAuthContext";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { TimeGateApiError } from "@/lib/timegate-api";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function TimeGateSignInForm() {
  const { login, token, isReady } = useTimeGateAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sku, setSku] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isReady) return;
    if (token) {
      router.replace("/timegate");
    }
  }, [isReady, token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password, sku.trim());
      router.push("/timegate");
      router.refresh();
    } catch (err) {
      if (err instanceof TimeGateApiError) {
        let msg = err.body;
        try {
          const parsed = JSON.parse(err.body) as { message?: string | string[] };
          if (Array.isArray(parsed.message)) {
            msg = parsed.message.join(", ");
          } else if (typeof parsed.message === "string") {
            msg = parsed.message;
          }
        } catch {
          /* keep body */
        }
        setError(msg || `Erreur ${err.status}`);
      } else {
        setError(
          err instanceof Error ? err.message : "Connexion impossible",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Connexion TimeGate
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connectez-vous avec vos identifiants TimeGate. Le SKU est requis pour les comptes organisation, optionnel pour le super admin.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder="admin@timegate.local"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label>
                  Mot de passe <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ke) => {
                      if (ke.key === "Enter" || ke.key === " ") {
                        ke.preventDefault();
                        setShowPassword(!showPassword);
                      }
                    }}
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>
              <div>
                <Label>
                  SKU organisation
                </Label>
                <Input
                  placeholder="TMGT"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Button className="w-full" size="sm" disabled={submitting}>
                  {submitting ? "Connexion…" : "Se connecter"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
