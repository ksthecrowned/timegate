import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { REFRESH_TOKEN_ERROR } from "@/lib/auth/constants";
import { getAccessTokenExpiry } from "@/lib/auth/jwt-utils";
import {
  refreshAccessToken,
  shouldRefreshAccessToken,
} from "@/lib/auth/refresh-access-token";
import { isRefreshEnabled } from "@/lib/auth/env";
import {
  fetchSubscriptionStatus,
  fetchTimeGateMe,
  loginTimeGate,
} from "@/lib/auth/timegate-auth";
import { mapSubscriptionSessionFields } from "@/lib/auth/subscription-session";
import { isDashboardRole } from "@/lib/timegate/roles";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email et mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        sku: { label: "Organisation (SKU)", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        const sku = credentials?.sku;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        try {
          const login = await loginTimeGate({
            email: email.trim(),
            password,
            sku: typeof sku === "string" && sku.trim() ? sku.trim() : undefined,
          });

          const accessToken = login.access_token;
          const [me, subscription] = await Promise.all([
            fetchTimeGateMe(accessToken),
            fetchSubscriptionStatus(accessToken),
          ]);

          if (!isDashboardRole(me.role)) {
            return null;
          }

          return {
            id: me.id,
            email: me.email,
            firstName: me.firstName,
            lastName: me.lastName,
            role: me.role,
            companyId: me.companyId,
            ...mapSubscriptionSessionFields(subscription),
            accessToken,
            accessTokenExpires: getAccessTokenExpiry(accessToken),
          };
        } catch (error) {
          console.error("[auth] login failed:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        return {
          ...token,
          ...session,
          user: session.user ? { ...token.user, ...session.user } : token.user,
        };
      }

      if (user) {
        return {
          ...token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyId: user.companyId,
            subscriptionActive: user.subscriptionActive,
            subscriptionReadOnly: user.subscriptionReadOnly,
            subscriptionBlocked: user.subscriptionBlocked,
            subscriptionStatus: user.subscriptionStatus,
          },
          accessToken: user.accessToken,
          accessTokenExpires: user.accessTokenExpires,
        };
      }

      if (
        token.accessTokenExpires &&
        !shouldRefreshAccessToken(token.accessTokenExpires)
      ) {
        return token;
      }

      if (isRefreshEnabled() && token.accessToken) {
        return refreshAccessToken(token);
      }

      if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        return { ...token, error: REFRESH_TOKEN_ERROR };
      }

      return token;
    },
  },
  events: {
    async signOut() {
      // TimeGate : pas de révocation serveur pour l'instant.
    },
  },
});
