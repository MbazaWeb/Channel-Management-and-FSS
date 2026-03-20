Sales Channel Partner recruitment & performance tracking app (MultiChoice Africa inspired)

## Design System
- Colors: Blue primary (210 100% 45%), Teal secondary (170 60% 45%), Amber accent (35 95% 55%)
- Fonts: Space Grotesk (display), Inter (body)
- Mobile-first, card-based layout with shadow-card utility

## Architecture
- Auth: email/password via Lovable Cloud, roles in user_roles table (admin/de enum)
- Tables: profiles, territories, de_territories, applications, user_roles, zones, application_attachments
- Storage: application-attachments bucket (public)
- Routes: / (public dashboard), /apply (form), /admin, /de, /login
- RLS: applications publicly readable, insert requires auth, admin can update all

## Key Decisions
- Applications table stores all form fields including arrays for channel_types and responsibilities
- Zones are parent of territories (zone_id FK on territories)
- Applications have zone_id and territory_id for location assignment
- Form uses stepper/book view with 5 steps and progress bar
- Admin panel has 3 tabs: Dashboard, Applications (with detail dialog), Zones & Territories
- PDF export via jspdf + jspdf-autotable (single app and bulk list)
- File uploads stored in application-attachments storage bucket
- Admin user: admin@multichoice.go.tz (4c0b4cd8-9a4a-4728-a55a-b9cecfeb1311)
- has_role() security definer function for RLS role checks
