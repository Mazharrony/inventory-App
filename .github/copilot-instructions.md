# JNK Nutrition Sales System - AI Agent Instructions

## Project Overview
JNK Nutrition Sales System is a React/TypeScript web application for sales and inventory management, built with Supabase backend, Vite build tool, and shadcn/ui components. The system supports role-based access control with admin, seller, and accounts roles.

**Key Stats**: ~987-line SaleEntryForm component (largest), multi-page routing, Supabase real-time integration, TailwindCSS + Radix UI styling.

## Architecture

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite (dev server on port 8080)
- **UI**: TailwindCSS + shadcn/ui (Radix UI primitives) + Lucide icons
- **State Management**: TanStack Query (@tanstack/react-query) for server state
- **Database**: Supabase with Row-Level Security (RLS) policies
- **Routing**: React Router DOM v6 with ProtectedRoute wrapper
- **Forms**: React Hook Form + Zod validation
- **Data**: CSV export/import via PapaParse, Excel via XLSX

### Critical Architecture Decisions

**1. Authentication Context Pattern** (`src/contexts/SimpleAuthContext.tsx`)
- Central `useAuth()` hook provides `user`, `userRole`, `isAdmin`, `isSeller`, `isAccountant` flags
- Admin detected by role='admin' in stored user data
- `hasSupabaseConfig` flag enables demo mode if env vars missing (falls back to DemoMode component)
- Session persisted to localStorage

**2. Route Protection**
- `ProtectedRoute` component wraps pages requiring authentication
- Pass `requireAdmin={true}` for admin-only routes (Settings, Sellers pages)
- Demo mode enables app to run without Supabase configuration

**3. Database Schema Patterns**
- `user_roles` table: (email, role, is_active) - enforces role-based access
- `sales` table: tracks transactions with product_id, seller_name, payment_method, status, customer info
- `products` table: (id, name, upc, price, stock)
- Supabase migrations in `supabase/migrations/` - run via `npm run setup:db`

**4. Component Organization**
- `src/components/ui/` - shadcn/ui wrapper components (Button, Card, Select, etc.)
- Page components in `src/pages/` handle data fetching
- Feature components like SaleEntryForm manage their own state with supabase queries
- Export/import via CSV handled with PapaParse + Toast notifications

## Developer Workflows

### Initial Setup
```bash
npm install
npm run setup:db  # Runs migrations, sets up hello@meetmazhar.site as admin
# Create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_KEY
npm run dev        # Starts Vite on http://localhost:8080
```

### Build & Lint
```bash
npm run lint       # ESLint (tsx/ts files) - strict unused vars OFF
npm run build      # Vite production build with gzip/brotli compression
npm run preview    # Test production build locally
```

### Key Commands
- `npm run dev:open` - Opens browser automatically
- `npm run deploy` - Builds and deploys to GitHub Pages (basename: '/JNK-INVENTORY')
- `npm run serve` - Runs preview on all interfaces (port 3000)

### Debugging
- Check `supabase/config.toml` for RLS policy issues
- Browser dev tools: Enable React DevTools extension (`npm run help:devtools`)
- Demo mode (no Supabase config) shows feature without persistence
- Use `console.log` - Terser drops them in production builds

## Code Patterns & Conventions

### Component Pattern (e.g., SaleEntryForm.tsx)
```tsx
const SaleEntryForm = ({ onSaleAdded }: Props) => {
  const [state, setState] = useState(...);
  const { toast } = useToast();
  
  // Fetch with Supabase
  useEffect(() => {
    const { data, error } = await supabase.from('table').select();
  }, [dependencies]);
  
  // Handle with error toast feedback
  const handleSubmit = async () => {
    const { error } = await supabase.from('table').insert({...});
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Success' }); onSaleAdded(); }
  };
  
  return <form><Input/><Button onClick={handleSubmit}/></form>;
};
```

### Supabase Queries Pattern
- Always check for both `data` and `error` in destructuring
- Use `.select('*')` or specific columns to avoid pulling unnecessary data
- Order results with `.order('field')` 
- Filter with `.eq()`, `.in()`, etc. before `.single()` or `.limit()`
- Use `upsert()` for insert-or-update operations (see user_roles setup in databaseUtils.ts)

### Styling Convention
- TailwindCSS utility-first: use `className="bg-primary text-white p-4 rounded-lg"`
- Responsive: `md:`, `lg:` prefixes for breakpoints
- Component variants via `clsx` for conditional classes
- Radix UI color tokens: `bg-primary`, `bg-secondary`, `text-muted-foreground`

### Form Validation
- Use Zod schemas with React Hook Form resolver (`@hookform/resolvers`)
- Validate on change/blur for better UX (see real-time input checks in forms)
- Display field errors inline near inputs

### Error Handling
- Use `useToast()` for user-facing errors (avoid console only)
- Check `error.message` from Supabase for specific error text
- ErrorBoundary component wraps pages for React runtime errors
- RLS errors appear as "row level security policy violation" - check supabase/config.toml

## Critical File Locations

| Purpose | File |
|---------|------|
| Main app routing & providers | `src/App.tsx` |
| Auth logic & role detection | `src/contexts/SimpleAuthContext.tsx` |
| Supabase client initialization | `src/integrations/client.ts` |
| Database type definitions | `src/integrations/types.ts` |
| Form component (largest, 987 lines) | `src/components/SaleEntryForm.tsx` |
| Database utilities (admin setup) | `src/utils/databaseUtils.ts` |
| Page components | `src/pages/{Index,Analytics,Products,Profile,Settings}.tsx` |
| UI component library | `src/components/ui/` |
| Vite + build config | `vite.config.ts` |
| ESLint rules | `eslint.config.js` |

## Specific Conventions This Project Uses

1. **Admin Email**: `hello@meetmazhar.site` is hardcoded as fallback admin check in AuthContext
2. **Payment Methods**: Enum values: "cash" (default), others added via ADD_PAYMENT_METHOD_COLUMN.sql
3. **Transaction IDs**: UUID format, grouped sales into transactions for invoicing
4. **Customer TRN**: Optional tax registration number field in sales table
5. **Invoice Numbers**: Auto-generated, stored per sale record
6. **Port Numbers**: Dev=8080, preview=3000 (see vite.config.ts and serve script)
7. **GitHub Pages**: Base path is `/JNK-INVENTORY/` in production (conditional in vite.config.ts)
8. **Demo Mode**: UI-only features when Supabase env vars not configured - enables offline demo

## Common Tasks

**Add a New Page**: Create file in `src/pages/`, add Route in App.tsx, import component
**Add a New Table**: Create SQL migration in `supabase/migrations/`, add types to `types.ts`, run `npm run setup:db`
**Modify Styling**: Edit TailwindCSS classes directly (no separate CSS files for components)
**Fix RLS Issues**: Review migration files for `CREATE POLICY` statements, check user_roles table populated
**Debug Supabase Queries**: Log `data` and `error` in console, check Network tab in dev tools
**Update User Role**: Insert/upsert into `user_roles` table with (email, role, is_active)

## Testing & Quality

- **Linting**: `npm run lint` - runs ESLint on all tsx/ts files
- **No unit tests configured** - focus on manual testing in browser
- **React DevTools**: Recommended for component state inspection
- **Supabase Client Library**: Auto-handles auth token refresh and session persistence

## Important Notes

- **Console Logs Dropped**: Terser removes `console.log()` in production - use toast for user-facing messages
- **RLS is Strict**: Demo mode works without Supabase, but production requires proper RLS policies
- **Email Verification**: Disabled by `confirmEmail: false` in supabase client config
- **CSV Imports**: Handled by PapaParse in SaleEntryForm component
- **Invoice PDFs**: Generated client-side in InvoiceModal component
