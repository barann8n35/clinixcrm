# Memory: index.md
Updated: now

# Project Memory

## Core
- Brand "Clinix": Navy sidebar #0F172A, off-white bg #F8FAFC. Plus Jakarta Sans (headers), Inter (body).
- Build: Use `@vitejs/plugin-react` (Babel), NEVER SWC.
- Data safety: Always coerce arrays before mapping (`Array.isArray(data) ? data : []`).
- UI: Rounded-2xl, tactile (hover:scale-105, active:scale-95), transition-all 200.
- Mobile (<768px): Hide sidebar, transform centered Dialogs to Bottom Sheets (Drawers).
- Date format: TR standard (DD.MM.YYYY HH:mm). Default language: TR.
- Auth: All new users get "pending" role; admin must approve. Roles: admin/staff/doctor/premium/pending.

## Memories
- [Video Studio](mem://features/video-studio) — Premium multi-language video translation module with ElevenLabs TTS dubbing
- [Dashboard Layout](mem://layout/dashboard-structure) — 4-column layout, WhatsApp Web aesthetic
- [Appointment Management](mem://features/appointment-management) — Workflow (Confirm/Cancel/Reschedule/Arrived) & green theme for Arrived
- [Database Schema](mem://tech/database-schema) — Core tables, text IDs, statuses, and RLS role management
- [Authentication System](mem://auth/authentication-system) — Supabase Auth, Registration form, PendingApproval screen
- [Responsive Design](mem://layout/responsive-design) — Breakpoints, mobile safe areas, Dialog to Bottom Sheet transitions
- [Appointment Creation](mem://features/appointment-creation) — PatientSearch autocomplete, phone mask, default Dr. İlhan Elmacı
- [Notification System](mem://features/notification-system) — Quick Reminder 06:00-23:00, 15m blocks, Personal vs Global tabs
- [Settings & Integrations](mem://features/settings-and-integrations) — Profile, Clinic, Integrations, Quick Replies, Mobile & Notifications
- [Visual Identity](mem://style/visual-identity) — Deep navy/off-white palette, elevation system, Framer Motion
- [Routing](mem://layout/routing) — Nested DashboardLayout, URL structure
- [Internationalization](mem://features/internationalization) — react-i18next setup, TR default, TR date formats
- [Pipeline Kanban](mem://features/pipeline-kanban) — Drag & drop stages, auto-move Arrived patients to Waiting Room
- [Chat System](mem://features/chat-system) — Omnichannel chat, sender labeling, AI toggle, Quick Replies
- [Iconography](mem://style/iconography) — Channel icons (WA, IG, TG, Web) with exact brand colors
- [Operational Dashboard](mem://features/operational-dashboard) — Summary cards, Critical Candidates, interactive lists
- [Supabase Project Config](mem://tech/supabase/project-config) — 'Kokpit' project, realtime publications for patients/messages
- [Real-time Pipeline](mem://tech/supabase/real-time-pipeline) — Supabase INSERT listeners per patient channel
- [Security Policies](mem://tech/supabase/security-policies) — RLS rules for profiles, subscriptions, notifications
- [AI Auto Muting](mem://features/ai-auto-muting) — Admin messages automatically disable AI for that patient
- [Knowledge Base](mem://features/knowledge-base) — learning_logs management for unanswered AI queries
- [Campaign Management](mem://features/campaign-management) — Bulk WhatsApp messaging, audience filtering
- [Navigation Logic](mem://features/navigation-logic) — URL search parameters for deep linking to modals/chats
- [Patient Reminders](mem://features/patient-reminders) — Form logic, n8n ISO formatting, TimePicker specifics
- [PWA & Push Config](mem://tech/pwa-and-push-notifications) — OneSignal PWA integration, service worker setup
- [Appointments List](mem://features/appointments-list-view) — Upcoming/Past views, horizontal scroll filters on mobile
- [Stock Tracking](mem://features/stock-tracking) — Inventory logs, red alerts for critical stock levels
- [Team Management](mem://features/team-management) — RBAC administration, baran@clinix.com as primary admin
- [Clinical Calendar](mem://features/clinical-calendar) — FullCalendar setup, 30m slots, appointment type colors
- [Patient Management](mem://features/patient-management) — PatientDetailModal tabs, real-time edit capabilities
- [Push Interactions](mem://tech/push-notification-interactions) — OneSignal click handling, deep link routing
- [Tactile UI Design](mem://style/tactile-ui-design) — Hover/active scaling factors, soft transitions
- [Real-time Sync Strategy](mem://tech/real-time-sync-strategy) — TanStack query invalidation, optimistic updates
- [Reminder Automation](mem://tech/reminder-automation-logic) — pg_cron Edge Function for processing reminders
