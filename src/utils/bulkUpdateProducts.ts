import { supabase } from '@/integrations/client';
import { recordStockMovementSafe } from './stockMovementTracker';

/**
 * Result summary for bulk update operations
 */
export interface BulkUpdateResult {
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

/**
 * Configuration for bulk update operations
 */
export interface BulkUpdateConfig {
  /** The field used to identify existing products (default: 'name') */
  identifierField: 'id' | 'upc' | 'name';
  
  /** Fields that are allowed to be updated */
  updatableFields: Array<'name' | 'upc' | 'price' | 'stock'>;
  
  /** Whether to validate numeric constraints (default: true) */
  validateConstraints?: boolean;
  
  /** Whether to skip rows with missing identifier (default: true) */
  skipMissingIdentifier?: boolean;
  
  /** Current user performing the update (for stock movement tracking) */
  currentUser?: string;
}

/**
 * Represents a row from the CSV with possible update data
 */
export interface ProductUpdateRow {
  // Identifier fields
  id?: string;
  upc?: string;
  
  // Updatable fields
  name?: string;
  price?: number | string;
  stock?: number | string;
  
  // Allow any other fields (will be ignored)
  [key: string]: unknown;
}

/**
 * Validated and sanitized product update data
 */
interface ValidatedUpdate {
  identifier: string;
  updates: {
    name?: string;
    upc?: string;
    price?: number;
    stock?: number;
  };
}

/**
 * Default configuration for bulk updates
 */
const DEFAULT_CONFIG: BulkUpdateConfig = {
  identifierField: 'name',
  updatableFields: ['upc', 'price', 'stock'],
  validateConstraints: true,
  skipMissingIdentifier: true,
};

/**
 * Normalizes a product name for consistent matching
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Validates a single field value against business rules
 */
function validateField(
  field: string,
  value: unknown,
  rowIndex: number,
  config: BulkUpdateConfig
): { valid: boolean; sanitizedValue?: unknown; error?: string } {
  if (!config.validateConstraints) {
    return { valid: true, sanitizedValue: value };
  }

  switch (field) {
    case 'price': {
      const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
      if (isNaN(numValue)) {
        return { valid: false, error: `Invalid price value: "${value}"` };
      }
      if (numValue < 0) {
        return { valid: false, error: `Price cannot be negative: ${numValue}` };
      }
      return { valid: true, sanitizedValue: numValue };
    }

    case 'stock': {
      const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
      if (isNaN(numValue)) {
        return { valid: false, error: `Invalid stock value: "${value}"` };
      }
      if (!Number.isInteger(numValue)) {
        return { valid: false, error: `Stock must be an integer: ${numValue}` };
      }
      return { valid: true, sanitizedValue: numValue };
    }

    case 'name': {
      const strValue = String(value).trim();
      if (strValue.length === 0) {
        return { valid: false, error: 'Name cannot be empty' };
      }
      if (strValue.length > 255) {
        return { valid: false, error: `Name too long (max 255 characters): ${strValue.length}` };
      }
      return { valid: true, sanitizedValue: strValue };
    }

    case 'upc': {
      const strValue = String(value).trim();
      if (strValue.length === 0) {
        return { valid: false, error: 'UPC cannot be empty' };
      }
      return { valid: true, sanitizedValue: strValue };
    }

    default:
      return { valid: true, sanitizedValue: value };
  }
}

/**
 * Validates and sanitizes a single row of update data
 */
function validateRow(
  row: ProductUpdateRow,
  rowIndex: number,
  config: BulkUpdateConfig,
  result: BulkUpdateResult
): ValidatedUpdate | null {
  // Extract identifier based on config
  let identifier: string | undefined;
  if (config.identifierField === 'id') {
    identifier = row.id;
  } else if (config.identifierField === 'upc') {
    identifier = row.upc;
  } else if (config.identifierField === 'name') {
    identifier = row.name;
  }

  if (!identifier) {
    if (config.skipMissingIdentifier) {
      result.skippedRows.push({
        rowIndex,
        identifier: null,
        reason: `Missing identifier field: ${config.identifierField}`,
      });
      result.skippedCount++;
      return null;
    } else {
      result.validationErrors.push({
        rowIndex,
        field: config.identifierField,
        value: identifier,
        message: `Missing required identifier field: ${config.identifierField}`,
      });
      result.errorCount++;
      return null;
    }
  }

  // Build updates object with only allowed fields
  const updates: ValidatedUpdate['updates'] = {};
  let hasValidUpdates = false;

  for (const field of config.updatableFields) {
    // Skip the identifier field itself
    if (field === config.identifierField) {
      continue;
    }

    // Check if this field exists in the row
    if (!(field in row) || row[field] === undefined || row[field] === null) {
      continue; // Field not present in CSV, skip it
    }

    const value = row[field];
    const validation = validateField(field, value, rowIndex, config);

    if (!validation.valid) {
      result.validationErrors.push({
        rowIndex,
        field,
        value,
        message: validation.error || 'Validation failed',
      });
      result.errorCount++;
      return null; // Skip this row entirely if any field is invalid
    }

    // Add sanitized value to updates
    updates[field as keyof typeof updates] = validation.sanitizedValue as never;
    hasValidUpdates = true;
  }

  // If no updates found, skip this row
  if (!hasValidUpdates) {
    result.skippedRows.push({
      rowIndex,
      identifier: String(identifier),
      reason: 'No updatable fields found in row',
    });
    result.skippedCount++;
    return null;
  }

  return {
    identifier: String(identifier),
    updates,
  };
}

/**
 * Performs a safe bulk update of products based on CSV data
 * 
 * @param rows - Array of product data from CSV (parsed objects)
 * @param config - Configuration for the bulk update operation
 * @returns Promise<BulkUpdateResult> - Detailed summary of the operation
 * 
 * @example
 * ```typescript
 * const csvData = [
 *   { id: 'abc-123', price: 29.99, stock: 50 },
 *   { id: 'def-456', name: 'Updated Product', stock: 100 }
 * ];
 * 
 * const result = await bulkUpdateProducts(csvData, {
 *   identifierField: 'id',
 *   updatableFields: ['name', 'price', 'stock']
 * });
 * 
 * console.log(`Updated ${result.updatedCount} products`);
 * ```
 */
export async function bulkUpdateProducts(
  rows: ProductUpdateRow[],
  config: Partial<BulkUpdateConfig> = {}
): Promise<BulkUpdateResult> {
  // Merge with default config
  const finalConfig: BulkUpdateConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize result object
  const result: BulkUpdateResult = {
    success: false,
    totalRows: rows.length,
    updatedCount: 0,
    createdCount: 0, // NEW: track created
    skippedCount: 0,
    errorCount: 0,
    skippedRows: [],
    notFoundIds: [],
    validationErrors: [],
    message: '',
  };

  if (rows.length === 0) {
    result.success = true;
    result.message = 'No rows to process';
    return result;
  }

  console.log('Starting bulk update process...');
  console.log('Total rows to process:', rows.length);
  console.log('Configuration:', finalConfig);

  // Phase 1: Validate all rows
  const validatedUpdates: ValidatedUpdate[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validated = validateRow(row, i + 1, finalConfig, result);
    
    if (validated) {
      validatedUpdates.push(validated);
    }
  }

  console.log(`Validation complete: ${validatedUpdates.length} valid rows, ${result.skippedCount} skipped, ${result.errorCount} errors`);

  if (validatedUpdates.length === 0) {
    result.success = false;
    result.message = 'No valid rows to update';
    return result;
  }

  // Phase 2: Fetch all existing products for matching
  console.log(`Fetching all products for upsert matching...`);
  const { data: existingProducts, error: fetchError } = await supabase.from('products').select('id, name, upc, stock');
  if (fetchError) {
    console.error('Error fetching existing products:', fetchError);
    result.success = false;
    result.message = `Database error: ${fetchError.message}`;
    return result;
  }

  // Build lookup maps for fast matching
  const byId = new Map();
  const byUpc = new Map();
  const byName = new Map();
  for (const product of existingProducts || []) {
    if (product.id) byId.set(product.id, product);
    if (product.upc) byUpc.set(product.upc, product);
    if (product.name) byName.set(normalizeName(product.name), product);
  }

  // Phase 3: Upsert logic
  const upsertResults = await Promise.all(validatedUpdates.map(async (validated, idx) => {
    let matches = [];
    // Find matches by identifier
    if (finalConfig.identifierField === 'id') {
      if (byId.has(validated.identifier)) matches.push(byId.get(validated.identifier));
    } else if (finalConfig.identifierField === 'upc') {
      if (byUpc.has(validated.identifier)) matches.push(byUpc.get(validated.identifier));
    } else if (finalConfig.identifierField === 'name') {
      const norm = normalizeName(validated.identifier);
      if (byName.has(norm)) matches.push(byName.get(norm));
    }

    if (matches.length > 1) {
      // Ambiguous match
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex: idx + 1,
        identifier: validated.identifier,
        reason: `Ambiguous match for identifier: ${validated.identifier}`,
      });
      return { type: 'skipped' };
    }
    if (matches.length === 1) {
      // Update existing
      const existing = matches[0];
      try {
        const fullUpdate = {
          ...validated.updates,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from('products')
          .update(fullUpdate as any)
          .eq('id', existing.id);
        if (error) {
          result.errorCount++;
          result.skippedRows.push({
            rowIndex: idx + 1,
            identifier: validated.identifier,
            reason: `Update failed: ${error.message}`,
          });
          return { type: 'skipped' };
        }
        // Track stock movement if stock increased
        if (
          validated.updates.stock !== undefined &&
          validated.updates.stock > existing.stock &&
          finalConfig.currentUser
        ) {
          await recordStockMovementSafe({
            productId: existing.id,
            productName: existing.name,
            previousStock: existing.stock,
            newStock: validated.updates.stock,
            movementType: 'csv_import',
            createdBy: finalConfig.currentUser,
            notes: 'Stock updated via CSV/Excel bulk import',
          });
        }
        result.updatedCount++;
        return { type: 'updated' };
      } catch (err) {
        result.errorCount++;
        result.skippedRows.push({
          rowIndex: idx + 1,
          identifier: validated.identifier,
          reason: `Update exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
        return { type: 'skipped' };
      }
    }
    // No match: create new product
    try {
      // Ensure required fields for creation
      const newProduct = {
        name: validated.updates.name || validated.identifier,
        upc: validated.updates.upc || '',
        price: validated.updates.price ?? 0,
        stock: validated.updates.stock ?? 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('products').insert([newProduct]);
      if (error) {
        result.errorCount++;
        result.skippedRows.push({
          rowIndex: idx + 1,
          identifier: validated.identifier,
          reason: `Create failed: ${error.message}`,
        });
        return { type: 'skipped' };
      }
      result.createdCount++;
      return { type: 'created' };
    } catch (err) {
      result.errorCount++;
      result.skippedRows.push({
        rowIndex: idx + 1,
        identifier: validated.identifier,
        reason: `Create exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return { type: 'skipped' };
    }
  }));

  // Final summary
  result.success = result.errorCount === 0;
  result.message =
    `Updated ${result.updatedCount} products, created ${result.createdCount}, skipped ${result.skippedCount}` +
    (result.errorCount > 0 ? ` (${result.errorCount} errors)` : '');

  console.log('Final summary:', {
    success: result.success,
    updated: result.updatedCount,
    created: result.createdCount,
    skipped: result.skippedCount,
    errors: result.errorCount,
  });

  return result;
}

/**
 * Helper function to export products to CSV format for editing
 * 
 * @returns Promise with array of product objects suitable for CSV export
 */
export async function exportProductsForUpdate(): Promise<ProductUpdateRow[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, upc, price, stock')
    .order('name');

  if (error) {
    throw new Error(`Failed to export products: ${error.message}`);
  }

  return (products || []) as ProductUpdateRow[];
}
