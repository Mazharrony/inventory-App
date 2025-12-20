// Utility functions for invoice number generation and undo functionality

import { supabase } from "@/integrations/client";

/**
 * Generates a sequential JNK invoice number
 * Format: JNK-XXXX (starts at JNK-1000, increments by 1)
 * Queries database for last invoice number to ensure strict sequential order
 * No gaps, no duplicates, strictly increasing sequence
 */
export const generateSequentialInvoiceNumber = async (): Promise<string> => {
  try {
    // Query for all invoice numbers - need to parse numeric value for proper sorting
    const { data, error } = await supabase
      .from('sales')
      .select('invoice_number')
      .not('invoice_number', 'is', null)
      .like('invoice_number', 'JNK-%');
    
    if (error) {
      console.error('Error fetching invoice numbers:', error);
      throw new Error(`Failed to generate invoice number: ${error.message}`);
    }
    
    let maxNumber = 999; // Start before 1000
    
    if (data && data.length > 0) {
      // Parse all invoice numbers and find the true maximum
      data.forEach(row => {
        if (row.invoice_number) {
          const match = row.invoice_number.match(/JNK-(\d+)/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });
    }
    
    const nextNumber = maxNumber + 1;
    return `JNK-${nextNumber}`;
  } catch (error) {
    console.error('Exception in generateSequentialInvoiceNumber:', error);
    throw error;
  }
};

/**
 * Generate JNK-prefixed invoice number with 4-5 digits
 * Format: JNK-XXXX or JNK-XXXXX
 * @deprecated Use generateSequentialInvoiceNumber() instead for strict sequential numbering
 */
export const generateJNKInvoiceNumber = (): string => {
  // Generate a number between 1000-99999 (4-5 digits)
  const min = 1000;
  const max = 99999;
  const invoiceNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return `JNK-${invoiceNumber}`;
};

/**
 * Validate JNK invoice number format
 */
export const validateJNKInvoiceNumber = (invoiceNumber: string): boolean => {
  const pattern = /^JNK-\d{4,5}$/;
  return pattern.test(invoiceNumber);
};

/**
 * Get the last 3 transactions for undo functionality
 */
export const getLastThreeTransactions = (transactions: any[]): any[] => {
  return transactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);
};

/**
 * Check if transaction can be undone (within last 3 transactions)
 */
export const canUndoTransaction = (transaction: any, allTransactions: any[]): boolean => {
  const lastThree = getLastThreeTransactions(allTransactions);
  return lastThree.some(t => t.transaction_id === transaction.transaction_id);
};