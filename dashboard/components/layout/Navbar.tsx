// 'use client'

// import { useState, useEffect } from 'react'
// import Link from 'next/link'
// import { useRouter } from 'next/navigation'
// import {
//   Bell, Sun, Moon, Menu, ChevronDown,
//   User, Calendar, LogOut
// } from 'lucide-react'

// function getGreeting() {
//   const month = new Date().getMonth() + 1
//   if (month === 12) return '🎄 Bonne fête de noël'
//   if (month === 1)  return '🎊 Heureux nouvel an'
//   return '💼 Bon service'
// }

// export default function Navbar() {
//   const router = useRouter()
//   const [dark, setDark]           = useState(false)
//   const [profileOpen, setProfileOpen] = useState(false)
//   const [sidebarOpen, setSidebarOpen] = useState(false)
//   const [hasNotif, setHasNotif]   = useState(true)

//   useEffect(() => {
//     const saved = localStorage.getItem('hs_theme')
//     const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
//     const isDark = saved === 'dark' || (saved === 'auto' && prefersDark)
//     setDark(isDark)
//     document.documentElement.classList.toggle('dark', isDark)
//   }, [])

//   const toggleDark = () => {
//     const next = !dark
//     setDark(next)
//     document.documentElement.classList.toggle('dark', next)
//     localStorage.setItem('hs_theme', next ? 'dark' : 'light')
//   }

//   const toggleSidebar = () => {
//     setSidebarOpen(!sidebarOpen)
//     const aside = document.getElementById('sidebar')
//     if (aside) aside.classList.toggle('hidden')
//   }

//   const handleLogout = () => {
//     sessionStorage.clear()
//     router.push('/login')
//   }

//   return (
//     <header
//       className="
//     fixed top-0 z-[60]
//     w-full lg:w-[calc(100%-260px)]
//     lg:ms-[260px]
//     flex flex-wrap md:flex-nowrap
//     bg-white border-b border-gray-200 text-sm py-2.5
//     dark:bg-neutral-800 dark:border-neutral-700 shadow-xs
//   "
//     >
//       <nav className="px-4 sm:px-6 flex basis-full items-center w-full mx-auto gap-x-3">

//         {/* Mobile logo + hamburger */}
//         <div className="flex items-center gap-x-2 lg:hidden">
//           <button onClick={toggleSidebar} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-white dark:hover:bg-neutral-700">
//             <Menu className="w-5 h-5" />
//           </button>
//           <Link href="/">
//             <img src="/images/logos/logo.png" className="h-8 w-auto" alt="RIDE" />
//           </Link>
//         </div>

//         <div className="w-full flex items-center justify-end ms-auto md:justify-between gap-x-2">
//           {/* Greeting */}
//           <div className="hidden md:block">
//             <h1 className="tracking-wider text-gray-700 dark:text-neutral-200 text-sm">
//               {getGreeting()},{' '}
//               <span className="font-semibold uppercase">
//                 {/* TODO: insérer le rôle de l'admin connecté */}
//                 SUPER-ADMIN
//               </span>
//             </h1>
//           </div>

//           <div className="flex items-center gap-x-1.5">
//             {/* Dark mode toggle */}
//             <button
//               onClick={toggleDark}
//               className="inline-flex items-center gap-x-2 py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
//               title={dark ? 'Mode clair' : 'Mode sombre'}
//             >
//               {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
//             </button>

//             {/* Notifications */}
//             <button className="relative p-2 rounded-full bg-black/10 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-black/20 dark:hover:bg-white/20 transition-colors">
//               <Bell className="w-4 h-4" />
//               {hasNotif && (
//                 <span className="absolute top-0 right-0 block w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-neutral-800 badge-notification" />
//               )}
//             </button>

//             {/* Profile dropdown */}
//             <div className="relative">
//               <button
//                 onClick={() => setProfileOpen(!profileOpen)}
//                 className="inline-flex items-center gap-x-2 py-1 ps-1 pe-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
//               >
//                 <img
//                   className="w-8 h-8 rounded-full object-cover"
//                   src="/images/users/avatar-man.jpg"
//                   alt="Avatar"
//                   onError={e => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Admin&background=f97316&color=fff' }}
//                 />
//                 <span className="font-medium hidden sm:block max-w-[7.5rem] truncate">Admin</span>
//                 <ChevronDown className={`w-4 h-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
//               </button>

//               {profileOpen && (
//                 <>
//                   <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
//                   <div className="absolute right-0 top-full mt-2 z-20 w-60 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden">
//                     {/* User info */}
//                     <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-700">
//                       <p className="text-xs text-gray-500 dark:text-neutral-400">Connecté en tant que</p>
//                       {/* TODO: afficher prénom/nom/email de l'admin connecté */}
//                       <p className="text-sm font-semibold text-gray-800 dark:text-white">Administrateur</p>
//                       <p className="text-xs text-gray-500 dark:text-neutral-400">admin@ride.com</p>
//                     </div>
//                     <div className="p-1">
//                       <p className="text-xs font-semibold uppercase text-gray-400 dark:text-neutral-500 px-3 pt-2 pb-1">
//                         Informations
//                       </p>
//                       <Link
//                         href="/profile"
//                         onClick={() => setProfileOpen(false)}
//                         className="flex items-center gap-x-3 py-2 px-3 text-sm text-gray-700 dark:text-neutral-300 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
//                       >
//                         <User className="w-4 h-4" /> Profil
//                       </Link>
//                       <Link
//                         href="/historic"
//                         onClick={() => setProfileOpen(false)}
//                         className="flex items-center gap-x-3 py-2 px-3 text-sm text-gray-700 dark:text-neutral-300 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
//                       >
//                         <Calendar className="w-4 h-4" /> Historique
//                       </Link>
//                     </div>
//                     <div className="p-1 border-t border-gray-100 dark:border-neutral-700">
//                       <button
//                         onClick={handleLogout}
//                         className="w-full flex items-center gap-x-3 py-2 px-3 text-sm text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
//                       >
//                         <LogOut className="w-4 h-4" /> Déconnexion
//                       </button>
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       </nav>
//     </header>
//   )
// }



// 'use client'

// import { useState, useEffect } from 'react'
// import Link from 'next/link'
// import { useRouter } from 'next/navigation'
// import { Bell, Calendar, LogOut, User } from 'lucide-react'

// function getGreeting() {
//   const month = new Date().getMonth() + 1
//   if (month === 12) return '🎄 Bonne fête de noël'
//   if (month === 1) return '🎊 Heureux nouvel an'
//   return '💼 Bon service'
// }

// export default function Navbar() {
//   const router = useRouter()
//   const [profileOpen, setProfileOpen] = useState(false)

//   const handleLogout = () => {
//     sessionStorage.clear()
//     router.push('/login')
//   }

//   return (
//     <header
//       className="
//      fixed top-0 z-[60]
//      lg:w-[calc(100%-260px)]
//      lg:ml-[260px]
//      flex flex-wrap md:flex-nowrap
//      bg-white border-b border-gray-200 text-sm py-2.5
//      dark:bg-neutral-800 dark:border-neutral-700 shadow-xs
//    "
//     >
//       <nav className="px-4 sm:px-6 flex basis-full items-center w-full mx-auto">

//         {/* Logo mobile */}
//         <div className="me-5 lg:me-0 lg:hidden">
//           <Link href="#" className="flex-none inline-block font-semibold">
//             <img
//               src="/images/logos/logo.png"
//               className="w-28 h-auto"
//               alt="RIDE"
//             />
//           </Link>
//         </div>

//         {/* Right section */}
//         <div className="w-full flex items-center justify-between gap-3">

//           {/* Greeting */}
//           <div className="hidden md:block">
//             <h1 className="tracking-wider text-gray-700 dark:text-neutral-200">
//               {getGreeting()},{' '}
//               <span className="font-semibold uppercase">
//                 SUPER-ADMIN
//               </span>
//             </h1>
//           </div>

//           {/* Actions */}
//           <div className="flex flex-row items-center justify-end gap-1 gap-x-2">

//             <button type="button" className="hs-dark-mode hs-dark-mode-active:hidden inline-flex items-center gap-x-2 py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 focus:outline-none focus:bg-black/20 dark:focus:bg-white/20" data-hs-theme-click-value="dark">
//              <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
//               <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
//               </svg>
//             </button>
//             <button type="button" className="hs-dark-mode hs-dark-mode-active:inline-flex hidden items-center gap-x-2 py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 focus:outline-none focus:bg-black/20 dark:focus:bg-white/20" data-hs-theme-click-value="light">
//             <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
//             <circle cx="12" cy="12" r="4"></circle>
//             <path d="M12 2v2"></path>
//              <path d="M12 20v2"></path>
//              <path d="m4.93 4.93 1.41 1.41"></path>
//               <path d="m17.66 17.66 1.41 1.41"></path>
//               <path d="M2 12h2"></path>
//                <path d="M20 12h2"></path>
//                 <path d="m6.34 17.66-1.41 1.41"></path>
//                  <path d="m19.07 4.93-1.41 1.41"></path>
//                   </svg> </button> <button type="button" className="m-1 ms-0 relative inline-flex items-center py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 focus:outline-none focus:bg-black/20 dark:focus:bg-white/20" aria-haspopup="dialog" aria-expanded="false" aria-controls="hs-offcanvas-right" data-hs-overlay="#hs-offcanvas-right"> <i className="fa-regular fa-bell  shrink-0 size-4"></i>
//                    <span className="hidden absolute top-0 end-0 size-3 -mt-1.5 -me-1.5 marker-notification">
//                     <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75 dark:bg-red-600"></span>
//                     <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
//                     </span>
//                      </button>

//             {/* Dropdown profile */}
//             <div className="relative hs-dropdown">
//               <button
//                 onClick={() => setProfileOpen(!profileOpen)}
//                 className="
//                   hs-dropdown-toggle
//                   inline-flex items-center gap-x-2
//                   py-1 ps-1 pe-3
//                   bg-black/10 dark:bg-white/10
//                   rounded-full text-sm
//                   text-black dark:text-white
//                 "
//               >
//                 <img
//                   className="size-9 object-cover rounded-full"
//                   src="/images/users/avatar-man.jpg"
//                   alt="Avatar"
//                 />

//                 <span className="font-medium truncate max-w-[7.5rem]">
//                   Admin
//                 </span>

//                 <svg
//                   className={`size-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
//                   xmlns="http://www.w3.org/2000/svg"
//                   width="24"
//                   height="24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                 >
//                   <path d="m6 9 6 6 6-6" />
//                 </svg>
//               </button>

//               {profileOpen && (
//                 <div
//                   className="
//                     absolute right-0 mt-2 z-50
//                     min-w-60 bg-white
//                     shadow-md rounded-lg
//                     dark:bg-neutral-800
//                     border dark:border-neutral-700
//                     overflow-hidden
//                   "
//                 >
//                   {/* Header user */}
//                   <div className="py-3 px-4 border-b border-gray-200 dark:border-neutral-700">
//                     <p className="text-sm text-gray-500 dark:text-neutral-400">
//                       Administrateur
//                     </p>
//                     <p className="text-sm font-medium text-gray-800 dark:text-white">
//                       admin@ride.com
//                     </p>
//                   </div>

//                   {/* Informations */}
//                   <div className="p-1">
//                     <span className="block pt-2 pb-1 px-3 text-xs font-medium uppercase text-gray-400 dark:text-neutral-500">
//                       Informations
//                     </span>

//                     <Link
//                       href="/profile"
//                       onClick={() => setProfileOpen(false)}
//                       className="
//                       flex items-center gap-x-3.5
//                       py-2 px-3 rounded-lg text-sm
//                       text-gray-800 dark:text-neutral-300
//                       hover:bg-black/10 dark:hover:bg-white/10
//                     "
//                                 >
//                       <i className="fa-solid fa-id-card-clip shrink-0 size-4"></i>
//                       Profil
//                     </Link>

//                     <Link
//                       href="/historic"
//                       onClick={() => setProfileOpen(false)}
//                       className="
//                       flex items-center gap-x-3.5
//                       py-2 px-3 rounded-lg text-sm
//                       text-gray-800 dark:text-neutral-300
//                       hover:bg-black/10 dark:hover:bg-white/10
//                     "
//                     >
//                       <i className="fa-solid fa-calendar-days shrink-0 size-4"></i>

//                       Historique
//                     </Link>
//                   </div>

//                   {/* Compte */}
//                   <div className="p-1 border-t border-gray-200 dark:border-neutral-700">
//                     <span className="block pt-2 pb-1 px-3 text-xs font-medium uppercase text-gray-400 dark:text-neutral-500">
//                       Compte
//                     </span>

//                     <button
//                       onClick={handleLogout}
//                       className="
//           w-full flex items-center gap-x-3.5
//           py-2 px-3 rounded-lg text-sm
//           text-red-600 dark:text-red-400
//           hover:bg-red-50 dark:hover:bg-red-900/20
//         "
//                     >
//                       <i className="fa-solid fa-power-off shrink-0 size-4"></i>

//                       Déconnexion
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>

//           </div>
//         </div>
//       </nav>
//     </header>
//   )
// }



'use client'

import OrgLogo from '@/components/brand/OrgLogo'
import CopilotNavButton from '@/components/ai/CopilotNavButton'
import StartTourButton from '@/components/tour/StartTourButton'
import GlobalSearchBox from '@/components/layout/GlobalSearchBox'
import NotificationBell from '@/components/layout/NotificationBell'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import { getRoleLabel } from '@/lib/timegate/roles'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const profileRef = useRef<HTMLDivElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  useClickOutside(profileRef, profileOpen, closeProfile)

  const adminEmail = session?.user?.email ?? 'admin@timegate.com'
  const displayName =
    [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ') ||
    adminEmail.split('@')[0]
  const roleLabel = getRoleLabel(session?.user?.role)

  const handleLogout = () => {
    void signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      {/* ========== HEADER ========== */}
      <header className="fixed top-0 inset-x-0 flex flex-wrap md:justify-start md:flex-nowrap z-6 w-full bg-surface-card/95 backdrop-blur-sm border-b border-slate-200/80 text-sm py-2.5 lg:ps-[260px] dark:bg-surface-card-dark/95 dark:border-border-dark">
        <nav className="px-4 sm:px-6 flex basis-full items-center w-full mx-auto">

          {/* Logo mobile */}
          <div className="me-5 lg:me-0 lg:hidden">
            <Link
              href="/"
              className="flex items-center focus:outline-none focus:opacity-90"
              aria-label="TimeGate"
            >
              <OrgLogo variant="icon" tone="on-light" className="h-9 w-9" />
            </Link>
          </div>

          {/* Global search */}
          <GlobalSearchBox />

          {/* Right section */}
          <div className="w-full flex items-center justify-end ms-auto md:justify-between gap-x-1 md:gap-x-3">

            {/* Greeting */}
            <div className="hidden md:block">
              {/* <h1 className="tracking-wider">
                {getGreeting()},{' '}
                <span className="font-semibold uppercase">
                  {roleLabel}
                </span>
              </h1> */}
            </div>

            {/* Actions */}
            <div className="flex flex-row items-center justify-end gap-1 gap-x-2">

              <StartTourButton variant="navbar" />

              <CopilotNavButton />

              <NotificationBell />

              {/* Dark mode — mode sombre */}
              <button
                type="button"
                className="hs-dark-mode hs-dark-mode-active:hidden inline-flex items-center gap-x-2 py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 focus:outline-none focus:bg-black/20 dark:focus:bg-white/20"
                data-hs-theme-click-value="dark"
              >
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              </button>

              {/* Dark mode — mode clair */}
              <button
                type="button"
                className="hs-dark-mode hs-dark-mode-active:inline-flex hidden items-center gap-x-2 py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 focus:outline-none focus:bg-black/20 dark:focus:bg-white/20"
                data-hs-theme-click-value="light"
              >
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              </button>

              {/* Dropdown profile */}
              <div className="hs-dropdown relative inline-flex" ref={profileRef}>
                <button
                  id="hs-dropdown-custom-trigger"
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="hs-dropdown-toggle inline-flex items-center gap-x-2 py-1 ps-1 pe-3 bg-black/10 dark:bg-white/10 rounded-full text-sm text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 focus:outline-none focus:bg-black/20 dark:focus:bg-white/20"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Menu profil"
                >
                  <img
                    className="size-9 object-cover object-center rounded-full"
                    src="/images/users/avatar-man.jpg"
                    alt="Avatar"
                  />
                  <span className="font-medium truncate max-w-30">
                    {displayName}
                  </span>
                  <svg
                    className={`size-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {profileOpen ? (
                  <div
                    className="absolute right-0 top-full mt-2 z-20 min-w-60 tg-card shadow-2xs rounded-lg"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="hs-dropdown-custom-trigger"
                  >
                    <div className="py-3 px-4 border-b border-slate-200/80 dark:border-border-dark">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {roleLabel}
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {adminEmail}
                      </p>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <span className="block pt-2 pb-1 px-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Informations
                      </span>
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-primary/10 hover:text-primary focus:outline-none focus:bg-primary/10 focus:text-primary dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-accent"
                      >
                        <i className="fa-solid fa-id-card-clip shrink-0 size-4" />
                        Profil
                      </Link>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <span className="block pt-2 pb-1 px-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Compte
                      </span>
                      <button
                        type="button"
                        onClick={() => { setProfileOpen(false); handleLogout() }}
                        className="w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                      >
                        <i className="fa-solid fa-power-off shrink-0 size-4" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              {/* End Dropdown */}

            </div>
          </div>
        </nav>
      </header>
      {/* ========== END HEADER ========== */}

      {/* ========== BREADCRUMB MOBILE ========== */}
      <div className="-mt-px">
        <div className="fixed top-[61px] md:top-[65px] inset-x-0 z-20 bg-surface border-y px-4 sm:px-6 lg:px-8 lg:hidden dark:bg-surface-card-dark  dark:border-border-dark  border-slate-200/80">
          <div className="flex items-center py-2">

            {/* Navigation Toggle */}
            <button
              type="button"
              className="size-8 flex justify-center items-center gap-x-2 text-gray-800 hover:text-gray-500 rounded-lg focus:outline-none focus:text-gray-500 disabled:opacity-50 disabled:pointer-events-none dark:text-neutral-200 dark:hover:text-neutral-500 dark:focus:text-neutral-500"
              aria-haspopup="dialog"
              aria-expanded="false"
              aria-controls="hs-application-sidebar"
              aria-label="Toggle navigation"
              data-hs-overlay="#hs-application-sidebar"
            >
              <span className="sr-only">Toggle Navigation</span>
              <svg className="shrink-0 size-6" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H14M4 18H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* End Navigation Toggle */}

            {/* Breadcrumb */}
            <ol className="ms-3 flex items-center whitespace-nowrap">
              <li className="text-sm font-semibold text-gray-800 truncate dark:text-neutral-400" aria-current="page">
                Dashboard
              </li>
            </ol>
            {/* End Breadcrumb */}

          </div>
        </div>
      </div>
      {/* ========== END BREADCRUMB MOBILE ========== */}
    </>
  )
}
