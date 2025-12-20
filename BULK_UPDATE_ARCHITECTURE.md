# Bulk Update System - Technical Architecture

## Overview
A safe, transaction-aware bulk update system for inventory management that prevents duplicates, validates data, and provides detailed error reporting.

---

## System Architecture

### 1. Core Module: `bulkUpdateProducts.ts`

Located: `src/utils/bulkUpdateProducts.ts`

**Purpose:** Standalone utility for safe bulk product updates

**Key Functions:**

#### `bulkUpdateProducts(rows, config)`
Main entry point for bulk updates.

**Process Flow:**
```
1. Validation Phase
   ├─ Validate identifier field exists
   ├─ Validate updatable fields
   ├─ Apply business rules (price ≥ 0, stock integer, etc.)
   └─ Build validated update objects

2. Matching Phase
   ├─ Extract identifiers from validated rows
   ├─ Fetch existing products from database
   ├─ Create identifier → product map
   └─ Separate matched vs not-found

3. Update Phase
   ├─ Build update operations (id + fields to change)
   ├─ Execute updates individually (no true transaction in Supabase client)
   ├─ Track successes and failures
   └─ Return detailed result summary

4. Reporting Phase
   └─ Return BulkUpdateResult with counts, errors, skipped rows
```

**Safety Guarantees:**
-  Never inserts new products
-  Only updates products that exist (matched by identifier)
-  Validates all data before any database operation
-  Skips invalid rows without failing entire operation
-  Preserves protected fields (id, created_at)
-  Updates only specified fields (partial updates)

---

### 2. Integration: `Products.tsx`

**Import Mode Detection:**
```typescript
const hasIdColumn = rows.some(row => row.id);
const hasUpcColumn = rows.some(row => row.upc);
const isUpdateMode = hasIdColumn || (hasUpcColumn && allRowsHaveUpc);

if (isUpdateMode) {
  // Call bulkUpdateProducts()
} else {
  // Legacy INSERT mode
}
```

**Column Normalization:**
Handles various CSV column naming conventions:
- `id`, `product_id` → `id`
- `name`, `product_name`, `Product Name` → `name`
- `upc`, `barcode`, `sku` → `upc`
- `price` → `price`
- `stock`, `quantity`, `qty` → `stock`

**User Feedback:**
- Toast notifications with summary
- Detailed console logging
- Progress indicators during import

---

## Data Flow Diagram

```
┌─────────────────┐
│  User Exports   │
│   Inventory     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Excel/CSV      │
│  with 'id'      │
│  column         │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  User Edits     │
│  (price, stock, │
│   name, upc)    │
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│  Upload File            │
│  (Products.tsx)         │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  Parse CSV/Excel        │
│  (Papa/XLSX)            │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  Normalize Columns      │
│  (handle variations)    │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  Detect Mode            │
│  (UPDATE vs INSERT)     │
└────────┬────────────────┘
         │
         v
     ┌───┴───┐
     │UPDATE │
     └───┬───┘
         │
         v
┌──────────────────────────────┐
│  bulkUpdateProducts()        │
│  ┌────────────────────────┐  │
│  │ 1. Validate Rows       │  │
│  │    - Check identifier  │  │
│  │    - Validate fields   │  │
│  │    - Business rules    │  │
│  └────────┬───────────────┘  │
│           v                  │
│  ┌────────────────────────┐  │
│  │ 2. Fetch Existing      │  │
│  │    Products (Supabase) │  │
│  └────────┬───────────────┘  │
│           v                  │
│  ┌────────────────────────┐  │
│  │ 3. Match Identifiers   │  │
│  │    - Build id→product  │  │
│  │    - Track not-found   │  │
│  └────────┬───────────────┘  │
│           v                  │
│  ┌────────────────────────┐  │
│  │ 4. Execute Updates     │  │
│  │    (One by one)        │  │
│  │    - Track successes   │  │
│  │    - Track failures    │  │
│  └────────┬───────────────┘  │
│           v                  │
│  ┌────────────────────────┐  │
│  │ 5. Return Result       │  │
│  │    Summary             │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
         │
         v
┌─────────────────────────┐
│  Display Results        │
│  - Toast notification   │
│  - Console logs         │
│  - Refresh product list │
└─────────────────────────┘
```

---

## Key Design Decisions

### 1. Identifier Field Strategy
- **Primary:** `id` (UUID from database)
- **Fallback:** `upc` (if all rows have UPC and no ID)
- **Rationale:** ID is immutable and guaranteed unique; UPC can change

### 2. No True Transactions
- **Limitation:** Supabase JS client doesn't support transactions
- **Mitigation:** 
  - Validate everything before starting updates
  - Update one-by-one with individual error tracking
  - Return detailed failure report
- **Trade-off:** Partial failures possible but fully logged

### 3. Partial Updates
- **Feature:** Only update fields present in CSV
- **Implementation:** Build update object with only provided fields
- **Example:** CSV with only `id,price` will update price only

### 4. Validation Strategy
```typescript
validateField(field, value, config) {
  switch (field) {
    case 'price':
      return isNumber && >= 0;
    case 'stock':
      return isInteger && >= 0;
    case 'name':
      return notEmpty && <= 255 chars;
    case 'upc':
      return notEmpty;
  }
}
```

### 5. Error Granularity
Three levels of tracking:
1. **Validation Errors:** Failed before database (bad data)
2. **Not Found:** Valid data but product doesn't exist
3. **Update Failures:** Database errors during update operation

---

## Type Definitions

### `ProductUpdateRow`
```typescript
interface ProductUpdateRow {
  id?: string;           // Identifier
  upc?: string;          // Alternative identifier
  name?: string;         // Updatable
  price?: number | string; // Updatable
  stock?: number | string; // Updatable
  [key: string]: unknown; // Allow extra columns (ignored)
}
```

### `BulkUpdateConfig`
```typescript
interface BulkUpdateConfig {
  identifierField: 'id' | 'upc';
  updatableFields: Array<'name' | 'upc' | 'price' | 'stock'>;
  validateConstraints?: boolean;
  skipMissingIdentifier?: boolean;
}
```

### `BulkUpdateResult`
```typescript
interface BulkUpdateResult {
  success: boolean;
  totalRows: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  skippedRows: Array<{
    rowIndex: number;
    identifier: string | null;
    reason: string;
  }>;
  notFoundIds: string[];
  validationErrors: Array<{
    rowIndex: number;
    field: string;
    value: unknown;
    message: string;
  }>;
  message: string;
}
```

---

## Database Schema

### Products Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  upc VARCHAR(255) UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Protected Fields:** `id`, `created_at`  
**Updatable Fields:** `name`, `upc`, `price`, `stock`, `updated_at`

---

## Performance Characteristics

### Time Complexity
- **Validation:** O(n) - linear scan of rows
- **Fetch Existing:** O(1) - single database query with IN clause
- **Matching:** O(n) - build map + iterate rows
- **Updates:** O(n) - one query per row (parallelized with Promise.all)

### Space Complexity
- **Memory:** O(n) for validated rows + existing products map
- **Network:** One SELECT query + n UPDATE queries

### Scalability
-  Handles hundreds of products efficiently
- ⚠️ For thousands, consider batching (not implemented)
-  Parallel updates via Promise.all

---

## Error Handling Strategy

### User-Facing Errors
- Toast notifications with summary
- Actionable error messages
- Links to console for details

### Developer Errors
- Detailed console logging
- Row numbers for validation errors
- Full error objects in result

### Recovery
- Partial failures don't corrupt database
- User can fix errors and re-upload
- Skipped rows are clearly identified

---

## Testing Recommendations

### Unit Tests
```typescript
describe('validateField', () => {
  it('rejects negative prices');
  it('rejects non-integer stock');
  it('rejects empty names');
  it('accepts valid data');
});

describe('bulkUpdateProducts', () => {
  it('updates matched products');
  it('skips non-existent products');
  it('reports validation errors');
  it('handles partial updates');
});
```

### Integration Tests
1. Export → Edit → Import workflow
2. Update by ID
3. Update by UPC
4. Mixed valid/invalid rows
5. All rows not found
6. Partial field updates

---

## Future Enhancements

### Possible Improvements
1. **Batch Updates:** Group updates into transactions (if Supabase adds support)
2. **Dry Run Mode:** Preview changes without executing
3. **Undo Feature:** Store previous values for rollback
4. **Audit Trail:** Log all bulk updates in a separate table
5. **Progress Indicator:** Real-time update progress for large batches
6. **Conflict Resolution:** Handle concurrent updates with optimistic locking

---

## Summary

 **Safe:** Comprehensive validation, no duplicates, no data loss  
 **Flexible:** Partial updates, multiple identifier strategies  
 **Transparent:** Detailed logging and error reporting  
 **Maintainable:** Standalone module, clear separation of concerns  
 **User-Friendly:** Automatic mode detection, clear feedback  

The bulk update system provides a production-ready solution for safely updating hundreds of products while maintaining data integrity and providing clear feedback on any issues.

