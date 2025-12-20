/**
 * Stock Movement Tracking Utility
 * 
 * Purpose: Records all stock increases for inventory auditing and analytics
 * Safety: Does NOT modify product stock - only creates audit trail
 * 
 * @module stockMovementTracker
 */

import { supabase } from '@/integrations/client';
import { TablesInsert } from '@/integrations/types';

/**
 * Types of stock movements that can be tracked
 */
export type MovementType = 'import' | 'manual_add' | 'edit' | 'csv_import';

/**
 * Parameters for recording a stock movement
 */
export interface StockMovementParams {
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  movementType: MovementType;
  createdBy: string; // Username or user ID
  notes?: string | null;
}

/**
 * Result of a stock movement recording operation
 */
export interface StockMovementResult {
  success: boolean;
  movementId?: string;
  error?: string;
}

/**
 * Records a stock increase in the stock_movements table
 * 
 * Safety guarantees:
 * - Does NOT modify the products table
 * - Only inserts audit records
 * - Silently fails if tracking fails (doesn't block stock updates)
 * - Validates that newStock > previousStock before recording
 * 
 * @param params - Stock movement parameters
 * @returns Promise<StockMovementResult> - Result of the operation
 * 
 * @example
 * ```typescript
 * const result = await recordStockMovement({
 *   productId: 'uuid-here',
 *   productName: 'Sample Product',
 *   previousStock: 10,
 *   newStock: 35,
 *   movementType: 'csv_import',
 *   createdBy: 'accounts_user',
 *   notes: 'Weekly stock import from supplier'
 * });
 * 
 * if (result.success) {
 *   console.log('Stock movement recorded:', result.movementId);
 * }
 * ```
 */
export async function recordStockMovement(
  params: StockMovementParams
): Promise<StockMovementResult> {
  try {
    const {
      productId,
      productName,
      previousStock,
      newStock,
      movementType,
      createdBy,
      notes,
    } = params;

    console.log('TRACKING ATTEMPT:', {
      productId,
      productName,
      previousStock,
      newStock,
      movementType,
      createdBy,
      notes,
    });

    // Safety check: Only record if stock actually increased
    const quantityAdded = newStock - previousStock;
    
    console.log('QUANTITY CALCULATION:', {
      previousStock,
      newStock,
      quantityAdded,
      willRecord: quantityAdded > 0,
    });
    
    if (quantityAdded <= 0) {
      console.log('Stock movement not recorded: no increase detected', {
        productName,
        previousStock,
        newStock,
        quantityAdded,
      });
      return {
        success: false,
        error: 'No stock increase detected (quantity_added must be > 0)',
      };
    }

    // Prepare the stock movement record
    const movementRecord: TablesInsert<'stock_movements'> = {
      product_id: productId,
      product_name: productName,
      previous_stock: previousStock,
      new_stock: newStock,
      quantity_added: quantityAdded,
      movement_type: movementType,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      notes: notes || null,
    };

    console.log('INSERTING RECORD:', movementRecord);

    // Insert the movement record
    const { data, error } = await supabase
      .from('stock_movements')
      .insert(movementRecord as any)
      .select()
      .single();

    if (error) {
      console.error('DATABASE ERROR:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('SUCCESS! Inserted record:', data);
    console.log('Stock movement recorded successfully:', {
      movementId: (data as any)?.id,
      productName,
      quantityAdded,
      movementType,
      createdBy,
    });

    return {
      success: true,
      movementId: (data as any)?.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('EXCEPTION in recordStockMovement:', errorMsg);
    console.error('Full error object:', err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Helper function to safely record stock movement without blocking main operation
 * 
 * This version catches all errors and logs them, ensuring the tracking failure
 * doesn't prevent the actual stock update from completing.
 * 
 * @param params - Stock movement parameters
 * @returns Promise<void> - Always resolves (never throws)
 */
export async function recordStockMovementSafe(
  params: StockMovementParams
): Promise<void> {
  console.log('recordStockMovementSafe CALLED with params:', params);
  try {
    const result = await recordStockMovement(params);
    console.log('recordStockMovementSafe result:', result);
  } catch (error) {
    console.error('Stock movement tracking failed (non-blocking):', error);
    // Silently fail - don't block the main operation
  }
}

/**
 * Retrieves stock movement history for a specific product
 * 
 * @param productId - Product UUID
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Promise with array of stock movements
 */
export async function getProductStockHistory(
  productId: string,
  limit: number = 50
) {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id' as any, productId as any)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching stock history:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception fetching stock history:', errorMsg);
    return { data: null, error: errorMsg };
  }
}

/**
 * Retrieves all stock movements within a date range
 * 
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Promise with array of stock movements
 */
export async function getStockMovementsByDateRange(
  startDate: string,
  endDate: string
) {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock movements by date:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception fetching stock movements by date:', errorMsg);
    return { data: null, error: errorMsg };
  }
}
