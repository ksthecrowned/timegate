# Glossaire TimeGate

| Terme | Sens |
|-------|------|
| **Company** | Tenant SaaS (= organisation). Table `tabCompany`. Param path `organizationId` côté super-admin = `companyId`. |
| **Branch** | Site / établissement d’une company. Table `tabBranch`. Pas de modèle « Site » séparé. |
| **PLATFORM_ADMIN** | Super-admin plateforme (`Admin`). Console SaaS. Routes `/auth/super-admin/*`. (Docs historiques : « SUPER_ADMIN ».) |
| **ADMIN / MANAGER / EMPLOYEE** | Rôles `User.timeGateRole` au sein d’une company. |
| **SKU** | Code court company (ex. `SOTR`) — login dashboard / bootstrap kiosk. |
| **Kiosk** | Appareil de pointage (`TimeGateKiosk`) + JWT lifetime provisionné. |
| **Enroll** | Enregistrement du visage employé (`POST /face/enroll`) → embedding. |
| **Verify** | Matching facial au kiosk (`POST /auth/kiosk/verify`). |
| **Attendance event** | Événement de présence (check-in/out, online/offline). |
| **Punch claim** | Réclamation / correction de pointage. |
| **Trusted device** | Appareil employé de confiance (QR punch employee → kiosk). |
| **QR punch** | Employé scanne un challenge QR affiché sur le kiosk. |
| **Pay group / payroll run** | Groupe de paie / cycle de paie. |
| **Compensation grid** | Grille de rémunération. |
| **Face engine** | Script Python `api/python/face_engine.py` (embeddings / match). |
| **Envelope liste** | `{ data, meta: { page, limit, total, totalPages } }`. |
| **employee-app** | App Expo employé (remplace l’ancien `employee-web` Next.js). |
