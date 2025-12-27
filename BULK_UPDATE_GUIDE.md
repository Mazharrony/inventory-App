# Bulk Update Inventory Guide

## Overview

The JNK Nutrition inventory system supports **safe bulk updates** via CSV/Excel file uploads. This allows you to export your inventory, make changes in Excel, and upload the changes back — without creating duplicates or losing data.

---

## Two Import Modes

### 1. **INSERT Mode** (Create New Products)
- Used when CSV has **no `id` column** or `id` is empty
- Creates brand new products in the database
- Requires: `name`, `price`, `stock` (UPC is optional)

### 2. **UPDATE Mode** (Modify Existing Products)
- Used when CSV **includes `id`** or **all rows have `upc`**
- Only updates existing products — **never creates new ones**
- Skips rows that don't match an existing product
- Updates only the fields present in the CSV

---

## How to Bulk Update Products

### Step 1: Export Current Inventory

Click the **"Export"** button on the Products page to download `inventory_export_YYYY-MM-DD.xlsx`

The exported file includes:
- `id` - Unique product identifier (required for updates)
- `name` - Product name
- `upc` - UPC/barcode
- `price` - Product price in AED
- `stock` - Stock quantity

### Step 2: Edit in Excel

Open the exported file in Excel and make your changes:

 **You CAN update:**
- Product names
- Prices
- Stock quantities
- UPC codes

**Do NOT modify:**
- The `id` column (this identifies which product to update)
- The `created_at` column (if present, will be ignored)

**Important:** 
- Keep the `id` column intact for all rows you want to update
- Delete entire rows for products you don't want to change (optional)
- Do NOT add new rows with empty `id` — they will be skipped

### Step 3: Upload the Updated File

1. Click **"Choose File"** in the Import Inventory section
2. Select your edited Excel/CSV file
3. Click **"Import"**

The system will:
- Detect UPDATE mode (because `id` column is present)
- Validate all data
- Match each row to an existing product by `id`
- Update only the fields you provided
- Skip rows where the product is not found
- Show a detailed summary

### Step 4: Review Results

After import, you'll see a summary:
-  **Updated:** Number of successfully updated products
- **Skipped:** Rows with validation errors or missing identifiers
- **Not Found:** Product IDs that don't exist in the database

Check the browser console (F12) for detailed logs.

---

## Safety Features

###  No Duplicates
- UPDATE mode **never creates new products**
- Only products with matching IDs are modified

###  Validation
- **Price:** Must be a number ≥ 0
- **Stock:** Must be a whole number ≥ 0
- **Name:** Cannot be empty, max 255 characters
- **UPC:** Cannot be empty if provided

###  Transactional Safety
- Each product is updated individually
- Failures are tracked and reported
- The database remains consistent even if some updates fail

###  No Data Loss
- Protected fields (`id`, `created_at`) are never modified
- Fields not in the CSV are left unchanged
- Original data is preserved if validation fails

---

## Examples

### Example 1: Update Prices and Stock

**Exported CSV:**
```csv
id,name,upc,price,stock
abc-123,Protein Powder,111111,50,100
def-456,Pre-Workout,222222,45,75
```

**Edited CSV (price increase, stock adjustment):**
```csv
id,name,upc,price,stock
abc-123,Protein Powder,111111,55,80
def-456,Pre-Workout,222222,48,60
```

**Result:**
-  Updated 2 products
- Protein Powder: price 50→55, stock 100→80
- Pre-Workout: price 45→48, stock 75→60

---

### Example 2: Update Only Prices (Partial Update)

**Edited CSV:**
```csv
id,price
abc-123,52
def-456,46
```

**Result:**
-  Updated 2 products
- Only `price` field changed
- `name`, `upc`, `stock` remain unchanged

---

### Example 3: Handling Missing Products

**Edited CSV:**
```csv
id,name,price,stock
abc-123,Protein Powder,55,80
xyz-999,Non-Existent Product,99,100
```

**Result:**
-  Updated 1 product (abc-123)
- Skipped 1 row (xyz-999 not found)
- Console shows: "Product not found with id: xyz-999"

---

## Advanced: Update by UPC Instead of ID

If your CSV **does not have an `id` column** but **all rows have UPC**, the system will match products by UPC instead:

**CSV Example:**
```csv
upc,name,price,stock
111111,Protein Powder,55,80
222222,Pre-Workout,48,60
```

**Result:**
- System detects UPDATE mode (all rows have UPC)
- Matches products by UPC
- Updates matched products

---

## Troubleshooting

### "No valid rows to update"
- **Cause:** CSV is missing the `id` column or all `id` values are empty
- **Fix:** Export from the system first, then edit the exported file

### "Product not found with id: xxx"
- **Cause:** The product was deleted or the ID is incorrect
- **Fix:** Remove that row from the CSV or verify the ID exists

### "Invalid price: xxx"
- **Cause:** Price is not a number or is negative
- **Fix:** Use numeric values only (e.g., `25.99`, not `$25.99`)

### "Name cannot be empty"
- **Cause:** A row has an empty name field
- **Fix:** Provide a valid product name

### "Stock must be an integer"
- **Cause:** Stock has decimal places (e.g., `10.5`)
- **Fix:** Use whole numbers only (e.g., `10`)

---

## Technical Details

### File Formats Supported
-  CSV (.csv)
-  Excel (.xlsx, .xls)

### Column Name Variations
The system recognizes these column names:
- **ID:** `id`, `product_id`
- **Name:** `name`, `product_name`, `product name`
- **UPC:** `upc`, `barcode`, `sku`
- **Price:** `price`
- **Stock:** `stock`, `quantity`, `qty`

### Mode Detection Logic
```
IF CSV has 'id' column with values:
  → UPDATE Mode (match by ID)
ELSE IF CSV has 'upc' in all rows:
  → UPDATE Mode (match by UPC)
ELSE:
  → INSERT Mode (create new products)
```

### Update Process
1. Parse CSV/Excel file
2. Normalize column names
3. Detect mode (UPDATE vs INSERT)
4. **UPDATE Mode:**
   - Validate each row
   - Fetch existing products by ID/UPC
   - Match rows to products
   - Update matched products individually
   - Track successes, failures, skips
   - Return detailed summary
5. **INSERT Mode:**
   - Validate required fields
   - Insert new products
   - Return count

---

## Best Practices

###  Always Export First
- Don't create the CSV from scratch
- Export → Edit → Import ensures correct format

###  Test with Small Batches
- Try updating 2-3 products first
- Verify the results before bulk updating hundreds

###  Backup Important Data
- Export a copy before bulk updates
- Keep the original file in case you need to revert

###  Review Console Logs
- Open browser console (F12) during import
- Check for detailed validation errors

###  Use Excel Formulas Carefully
- Ensure formulas are evaluated before upload
- Copy-paste-values if using calculations

---

## API Reference

### `bulkUpdateProducts(rows, config)`

**Parameters:**
- `rows: ProductUpdateRow[]` - Array of product data from CSV
- `config: BulkUpdateConfig` - Configuration object

**Config Options:**
- `identifierField: 'id' | 'upc'` - Field to match products (default: 'id')
- `updatableFields: string[]` - Allowed fields to update (default: all)
- `validateConstraints: boolean` - Validate business rules (default: true)
- `skipMissingIdentifier: boolean` - Skip rows without ID (default: true)

**Returns:** `Promise<BulkUpdateResult>`

**Result Object:**
```typescript
{
  success: boolean;
  totalRows: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  skippedRows: Array<{ rowIndex, identifier, reason }>;
  notFoundIds: string[];
  validationErrors: Array<{ rowIndex, field, value, message }>;
  message: string;
}
```

---

## Summary

 **Safe:** No duplicates, no data loss, thorough validation  
 **Flexible:** Update any field, partial updates supported  
 **Transparent:** Detailed logging and error reporting  
 **Fast:** Bulk operations process hundreds of products quickly  
 **User-Friendly:** Automatic mode detection, clear error messages  

For questions or issues, check the browser console or contact support.

