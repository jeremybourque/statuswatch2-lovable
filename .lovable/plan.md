

## StatusWatch2 — Status Page App (Demo Mode)

A dark-themed, modern status page application with a public-facing status page and an admin dashboard, powered by Lovable Cloud (Supabase). No authentication — admin is open access for demo purposes.

### Pages

1. **Public Status Page** (`/`)
   - Dark background, overall system status banner (operational/degraded/outage), auto-calculated from services
   - Services listed by category with colored status dots (green/yellow/orange/red)
   - Recent incidents timeline with collapsible updates

2. **Admin Dashboard** (`/admin`)
   - Sidebar navigation: Services, Incidents, Settings
   - **Services**: CRUD — name, description, category, status (operational/degraded/partial_outage/major_outage), display order
   - **Incidents**: Create/manage incidents, select affected services, add timeline updates (investigating → identified → monitoring → resolved), set impact level
   - **Settings**: Page title, description, logo URL

3. **Not Found** (`*`) — 404 page

### Database (Lovable Cloud / Supabase)

- **services** — id, name, description, category, status, display_order, created_at
- **incidents** — id, title, status, impact, created_at, resolved_at
- **incident_updates** — id, incident_id (FK), status, message, created_at
- **incident_services** — incident_id, service_id (junction table)
- **site_settings** — key, value (page title, description, logo)
- RLS disabled (demo mode — open access)

### Design

- Dark theme: background `#0a0a0b`, card surfaces `#111113`, borders `#1e1e21`
- Status colors: green (operational), yellow (degraded), orange (partial outage), red (major outage)
- Clean sans-serif typography, card-based service layout, colored severity badges
- Responsive for mobile and desktop

### Implementation Steps

1. Set up Lovable Cloud and create all database tables with seed data
2. Build public status page with service list and incident timeline
3. Build admin layout with sidebar navigation
4. Build admin services page (CRUD)
5. Build admin incidents page (create, update, add timeline entries)
6. Build admin settings page
7. Add dark theme styling throughout

