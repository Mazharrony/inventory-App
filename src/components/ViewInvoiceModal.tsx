

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Receipt, User, Phone, MapPin, Building2, Calendar, CreditCard, Package, Edit, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { EditInvoiceModal } from "./EditInvoiceModal";
import { useAuth } from "@/contexts/SimpleAuthContext";

type Sale = {
  id: string;
  upc: string;
  product_name: string | null;
  price: number;
  quantity: number;
  seller_name: string;
  created_at: string;
  payment_method?: string;
  payment_reference?: string | null;
  customer_name?: string | null;
  customer_mobile?: string | null;
  customer_address?: string | null;
  customer_trn?: string | null;
  invoice_number?: string | null;
  invoice_type?: string | null;
};

type Transaction = {
  transaction_id: string;
  created_at: string;
  seller_name: string;
  payment_method: string;
  payment_reference?: string | null;
  items: Sale[];
  total_amount: number;
  item_count: number;
  customer_name?: string | null;
  customer_mobile?: string | null;
  customer_address?: string | null;
  customer_trn?: string | null;
  invoice_number?: string | null;
  invoice_type?: string | null;
  order_comment?: string | null;
};

interface ViewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onInvoiceUpdated?: () => void;
}

export const ViewInvoiceModal = ({ isOpen, onClose, transaction, onInvoiceUpdated }: ViewInvoiceModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const { isSeller } = useAuth();

  if (!transaction) return null;

  const hasCustomerData = transaction.customer_name || transaction.customer_mobile || transaction.customer_address;
  const invoiceTypeLabel = transaction.invoice_type 
    ? transaction.invoice_type.charAt(0).toUpperCase() + transaction.invoice_type.slice(1)
    : "Retail";

  const printInvoice = () => {
    const invoiceNumber = transaction.invoice_number;
    const createdDate = new Date(transaction.created_at);
    const invoiceDate = createdDate.toLocaleDateString("en-GB");
    const invoiceTime = createdDate.toLocaleTimeString("en-GB");

    // Calculate totals - VAT is INCLUSIVE in the item prices
    const totalAmount = transaction.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotal = totalAmount / 1.05; // Remove VAT to get subtotal
    const vatAmount = totalAmount - subtotal; // VAT is the difference

    // Generate rows for all items
    const itemRows = transaction.items.map(item => {
      const itemTotal = item.price * item.quantity;
      const itemSubtotal = itemTotal / 1.05; // Remove VAT
      const itemVat = itemTotal - itemSubtotal; // VAT amount
      
      return `
        <tr>
          <td class="center">${item.upc}</td>
          <td>${item.product_name || 'Product'}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">AED ${item.price.toFixed(2)}</td>
          <td class="center">PCS</td>
          <td class="right">AED ${itemSubtotal.toFixed(2)}</td>
          <td class="center">5%</td>
          <td class="right">AED ${itemVat.toFixed(2)}</td>
          <td class="right">AED ${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Create invoice HTML
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Tax Invoice - ${invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }
          .invoice-container { width: 100%; max-width: 800px; margin: 0 auto; border: 2px solid #000; }
          .header { border-bottom: 2px solid #000; }
          .company-header { text-align: center; padding: 10px; border-bottom: 1px solid #000; background: #f5f5f5; font-weight: bold; font-size: 14px; }
          .tax-invoice-header { text-align: center; padding: 8px; border-bottom: 1px solid #000; font-weight: bold; font-size: 13px; }
          .company-details { display: flex; }
          .company-left, .company-right { flex: 1; padding: 10px; border-right: 1px solid #000; }
          .company-right { border-right: none; }
          .company-left p, .company-right p { margin: 3px 0; }
          .info-section { display: flex; border-bottom: 1px solid #000; }
          .info-left, .info-right { flex: 1; padding: 8px; }
          .info-left { border-right: 1px solid #000; }
          .info-row { display: flex; margin: 2px 0; }
          .info-label { width: 120px; font-weight: bold; }
          .info-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border: 1px solid #000; font-size: 11px; }
          th { background: #f5f5f5; font-weight: bold; text-align: center; }
          .center { text-align: center; }
          .right { text-align: right; }
          .totals-section { display: flex; border-top: 2px solid #000; }
          .payment-info { flex: 1; padding: 10px; border-right: 1px solid #000; }
          .totals { flex: 1; padding: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; padding: 3px 0; }
          .total-row.grand { font-weight: bold; font-size: 13px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
          .footer { padding: 15px; text-align: center; border-top: 2px solid #000; background: #f5f5f5; }
          .terms { padding: 10px; font-size: 10px; border-top: 1px solid #000; }
          @media print {
            body { margin: 0; }
            .invoice-container { border: none; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="header">
            <div class="company-header">JNK GENERAL TRADING LLC</div>
            <div class="tax-invoice-header">TAX INVOICE</div>
            <div class="company-details">
              <div class="company-left">
                <p><strong>Shop Number 6, Baniyas Complex Building, Opp. Choithrams - Deira - Dubai</strong></p>
                <p>United Arab Emirates</p>
                <p><strong>TRN:</strong> 10027407590003</p>
              </div>
              <div class="company-right">
                <p><strong>Contact:</strong> +971 04 252 2426</p>
                <p><strong>Email:</strong> info@jnknutrition.com</p>
              </div>
            </div>
          </div>

          <!-- Invoice Info -->
          <div class="info-section">
            <div class="info-left">
              <div class="info-row">
                <span class="info-label">Invoice Number:</span>
                <span class="info-value">${invoiceNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Invoice Date:</span>
                <span class="info-value">${invoiceDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Invoice Time:</span>
                <span class="info-value">${invoiceTime}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Invoice Type:</span>
                <span class="info-value">${invoiceTypeLabel} Sale</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">${transaction.payment_method.replace('_', ' ').toUpperCase()}</span>
              </div>
              ${transaction.payment_reference ? `
              <div class="info-row">
                <span class="info-label">Payment Reference:</span>
                <span class="info-value">${transaction.payment_reference}</span>
              </div>
              ` : ''}
              ${transaction.order_comment ? `
              <div class="info-row">
                <span class="info-label">Sales Reference / Comment:</span>
                <span class="info-value">${transaction.order_comment}</span>
              </div>
              ` : ''}
            </div>
            <div class="info-right">
              ${hasCustomerData ? `
                <div class="info-row">
                  <span class="info-label">Customer Name:</span>
                  <span class="info-value">${transaction.customer_name || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Mobile:</span>
                  <span class="info-value">${transaction.customer_mobile || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address:</span>
                  <span class="info-value">${transaction.customer_address || '-'}</span>
                </div>
                ${transaction.customer_trn ? `
                <div class="info-row">
                  <span class="info-label">Customer TRN:</span>
                  <span class="info-value">${transaction.customer_trn}</span>
                </div>
                ` : ''}
              ` : `
                <div class="info-row">
                  <span class="info-label">Customer:</span>
                  <span class="info-value">Walk-in Customer</span>
                </div>
              `}
              <div class="info-row">
                <span class="info-label">Sold By:</span>
                <span class="info-value">${transaction.seller_name}</span>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Price(incl.vat)</th>
                <th>Unit</th>
                <th>Subtotal</th>
                <th>VAT %</th>
                <th>VAT Amount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
            <div class="payment-info">
              <p><strong>Total Items:</strong> ${transaction.item_count}</p>
              <p style="margin-top: 10px; font-size: 11px;"><strong>Amount in Words:</strong></p>
              <p style="font-size: 11px;">${numberToWords(totalAmount)} Dirhams Only</p>
            </div>
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>AED ${subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>VAT (5%):</span>
                <span>AED ${vatAmount.toFixed(2)}</span>
              </div>
              <div class="total-row grand">
                <span>GRAND TOTAL:</span>
                <span>AED ${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>For any queries, please contact us at +971 04 252 2426</p>
          </div>

          <!-- Terms -->
          <div class="terms">
            <p><strong>Terms & Conditions:</strong> All sales are final. Returns accepted within 7 days with original receipt. VAT included in total amount.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    let result = '';
    const intNum = Math.floor(num);
    
    if (intNum >= 1000) {
      result += ones[Math.floor(intNum / 1000)] + ' Thousand ';
    }
    
    const remainder = intNum % 1000;
    if (remainder >= 100) {
      result += ones[Math.floor(remainder / 100)] + ' Hundred ';
    }
    
    const lastTwo = remainder % 100;
    if (lastTwo >= 20) {
      result += tens[Math.floor(lastTwo / 10)] + ' ';
      if (lastTwo % 10 > 0) {
        result += ones[lastTwo % 10] + ' ';
      }
    } else if (lastTwo >= 10) {
      result += teens[lastTwo - 10] + ' ';
    } else if (lastTwo > 0) {
      result += ones[lastTwo] + ' ';
    }
    
    return result.trim();
  };

  const handleInvoiceUpdated = () => {
    setShowEditModal(false);
    if (onInvoiceUpdated) {
      onInvoiceUpdated();
    }
    onClose();
  };

  const subtotal = transaction.total_amount / 1.05;
  const vatAmount = transaction.total_amount - subtotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="w-6 h-6" />
            Invoice Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            View invoice details including customer information, items, and payment summary
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-secondary/50 border border-primary/20 rounded-lg p-5">
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-primary/70 font-medium mb-1">Invoice Number</p>
                <p className="font-mono text-primary font-semibold">
                  {transaction.invoice_number}
                </p>
              </div>
              <div>
                <p className="text-primary/70 font-medium mb-1">Date & Time</p>
                <p className="text-primary flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(transaction.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                </p>
              </div>
              <div>
                <p className="text-primary/70 font-medium mb-1">Payment Method</p>
                <Badge variant="outline" className="bg-white">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {transaction.payment_method}
                </Badge>
              </div>
              {transaction.payment_reference && (
                <div>
                  <p className="text-primary/70 font-medium mb-1">Payment Reference</p>
                  <p className="font-mono text-primary">{transaction.payment_reference}</p>
                </div>
              )}
              {transaction.order_comment && (
                <div className="col-span-2">
                  <p className="text-primary/70 font-medium mb-1 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Sales Reference / Special Comment
                  </p>
                  <p className="text-primary bg-muted/50 border border-border rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {transaction.order_comment}
                  </p>
                </div>
              )}
              <div>
                <p className="text-primary/70 font-medium mb-1">Invoice Type</p>
                <Badge variant={transaction.invoice_type === 'corporate' ? 'default' : 'secondary'}>
                  {invoiceTypeLabel} Sale
                </Badge>
              </div>
              <div>
                <p className="text-primary/70 font-medium mb-1">Sold By</p>
                <p className="text-primary font-medium">{transaction.seller_name}</p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h3>
            {hasCustomerData ? (
              <div className="space-y-3">
                {transaction.customer_name && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{transaction.customer_name}</p>
                    </div>
                  </div>
                )}
                {transaction.customer_mobile && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Mobile</p>
                      <p className="font-medium font-mono">{transaction.customer_mobile}</p>
                    </div>
                  </div>
                )}
                {transaction.customer_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">{transaction.customer_address}</p>
                    </div>
                  </div>
                )}
                {transaction.customer_trn && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">TRN Number</p>
                      <p className="font-medium font-mono">{transaction.customer_trn}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">Walk-in Customer (No details recorded)</p>
            )}
          </div>

          {/* Products */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Products ({transaction.item_count} items)</h3>
            </div>
            <div className="divide-y">
              {transaction.items.map((item, index) => (
                <div key={index} className="px-5 py-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product_name || 'Product'}</p>
                      <p className="text-sm text-gray-500 font-mono">UPC: {item.upc}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity}x × AED {item.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">= AED {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Calculation */}
          <div className="border rounded-lg p-5 bg-gray-50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">AED {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (5%):</span>
                <span className="font-medium">AED {vatAmount.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-primary">AED {transaction.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            {!isSeller && (
              <Button onClick={() => setShowEditModal(true)} variant="outline" size="lg" className="gap-2">
                <Edit className="w-5 h-5" />
                Edit Invoice
              </Button>
            )}
            <Button onClick={printInvoice} size="lg" className="gap-2">
              <Printer className="w-5 h-5" />
              Print Invoice
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        transaction={transaction}
        onSaved={handleInvoiceUpdated}
      />
    </Dialog>
  );
};
