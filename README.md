# Channel Management & FSS System

A comprehensive channel partner management system for MultiChoice Tanzania, enabling efficient management of sales channel partners and Field Sales Support (FSS) users.

## Features

### Public Dashboard
- Real-time application statistics (Total, Approved, Rejected, Pending)
- FSS user tracking (Total, Active, Inactive)
- Zone and Territory performance overview
- Interactive charts and leaderboards

### Application Management
- Online application form for channel partners
- Document upload support (ID, TIN, Business License, etc.)
- Multi-step approval workflow
- PDF export with company branding

### Admin Panel
- **Dashboard**: Year Target, MTD Target, MTD Actual, Gap analysis
- **Applications**: Search, filter by status/zone, bulk approve/reject
- **FSS Users**: Manage FSS status with bulk enable/disable
- **Zones & Territories**: CRUD operations with Year Target management
- **Status Page**: View all applications with FSS column

### DE (Data Entry) Panel
- Application entry and management
- Territory-based filtering

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage)
- **State Management**: @tanstack/react-query
- **PDF Generation**: jsPDF + jspdf-autotable

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. Add environment variables
3. Deploy

The project includes `vercel.json` for SPA routing configuration.

## Database Migrations

Run Supabase migrations for:
- `fss_user` field on applications table
- `year_target` field on territories table

## License

Proprietary - MultiChoice Tanzania
