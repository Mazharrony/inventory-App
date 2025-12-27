# JNK Nutrition Sales System - React Web App

A professional sales and inventory management system built with React, TypeScript, and Supabase

## Features

- Real-time sales tracking and analytics
- Inventory management
- Multi-seller support
- Responsive design with mobile support
- Secure authentication
- Advanced reporting and charts
- Data export/import capabilities
- Undo/Redo functionality

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mazharrony/JNK-INVENTORY.git
   cd JNK-INVENTORY
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:8080
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── AppHeader.tsx   # Application header
│   ├── SaleEntryForm.tsx
│   └── ...
├── pages/              # Page components
│   ├── Index.tsx       # Dashboard
│   ├── Analytics.tsx   # Analytics page
│   ├── Products.tsx    # Inventory management
│   └── ...
├── integrations/       # External service integrations
│   ├── client.ts       # Supabase client
│   └── types.ts        # Type definitions
├── lib/                # Utility libraries
├── hooks/              # Custom React hooks
└── utils/              # Helper functions
```

## Technology Stack

- **Frontend:** React 18, TypeScript
- **UI:** Tailwind CSS, shadcn/ui, Radix UI
- **State:** TanStack Query
- **Database:** Supabase
- **Build Tool:** Vite
- **Routing:** React Router DOM

## Deployment

### GitHub Pages
```bash
npm run deploy
```

### Manual Build
```bash
npm run build
# Deploy the `dist` folder to your hosting service
```

## Features Overview

### Dashboard
- Sales overview and key metrics
- Recent transactions
- Quick actions for common tasks

### Analytics
- Revenue trends and forecasts
- Product performance analytics
- Seller performance metrics
- Interactive charts and graphs

### Inventory Management
- Product catalog management
- Stock level tracking
- Barcode scanning support
- Bulk import/export

### Multi-Seller Support
- Individual seller accounts
- Performance tracking per seller
- Commission calculations

## Configuration

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup
1. Set up a Supabase project
2. Run the migration scripts in `supabase/migrations/`
3. Configure Row Level Security (RLS) policies

## License

This project is proprietary software developed for JNK GENERAL TRADING LLC.

## Developer

**Mazhar Rony**
- Email: hello@meetmazhar.site
- Portfolio: [www.meetmazhar.site](https://www.meetmazhar.site)

## Support

For technical support or feature requests, please contact the development team.

---

*"Building tomorrow's business solutions today"*