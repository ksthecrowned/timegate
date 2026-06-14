import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'TimeGate Admin',
  description: 'Tableau de bord administrateur TimeGate — HR Software & Time & Attendance',
  icons: {
    icon: '/images/logos/timegate-icon-color.png',
    apple: '/images/logos/timegate-icon-color.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var storageKey = 'hs_theme';
                var root = document.documentElement;
                var savedTheme = localStorage.getItem(storageKey);
                var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var resolvedTheme = savedTheme || 'auto';

                var shouldUseDark = resolvedTheme === 'dark' || (resolvedTheme === 'auto' && systemPrefersDark);
                root.classList.toggle('dark', shouldUseDark);

                document.addEventListener('click', function(event) {
                  var target = event.target;
                  if (!(target instanceof Element)) return;

                  var trigger = target.closest('[data-hs-theme-click-value]');
                  if (!trigger) return;

                  var nextTheme = trigger.getAttribute('data-hs-theme-click-value');
                  if (!nextTheme) return;

                  localStorage.setItem(storageKey, nextTheme);
                  root.classList.toggle('dark', nextTheme === 'dark');
                });
              })();
            `,
          }}
        />
        {/* FontAwesome — exact as original */}
        {/* <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
        /> */}
        <link rel="stylesheet" href="/plugins/fontawesome-free-6.6.0-web/css/all.min.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/preline/dist/preline.min.css"
        />
      </head>
      <body className="overflow-x-hidden">
        {children}
        {/* Preline JS — for hs-dropdown, hs-accordion, hs-datatable */}
        <Script
          src="https://cdn.jsdelivr.net/npm/preline/dist/preline.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
