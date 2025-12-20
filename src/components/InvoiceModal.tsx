import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Printer, Receipt, User, Phone, MapPin, X, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/types";

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

type TransactionData = {
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
  _cartData?: Array<{
    id: string;
    product: any;
    quantity: number;
    customPrice: number;
    subtotal: number;
  }>; // Cart data for committing sale
};

type Customer = {
  id: number;
  mobile: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  trn: string | null;
  type: string | null;
  created_at: string | null;
  updated_at: string | null;
};

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionData | null;
  onSaleAdded: () => void;
}

export const InvoiceModal = ({ isOpen, onClose, transaction, onSaleAdded }: InvoiceModalProps) => {
  const { isAdmin, isAccountant } = useAuth();
  const [customerMobile, setCustomerMobile] = useState("");
  // New: Order comment state
  const [orderComment, setOrderComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTRN, setCustomerTRN] = useState("");
  const [invoiceType, setInvoiceType] = useState("retail");
  const [paymentReference, setPaymentReference] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [dateValidationError, setDateValidationError] = useState("");
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    fetchCustomers();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const name = transaction?.customer_name || "";
    setCustomerMobile(transaction?.customer_mobile || "");
    setCustomerName(name);
    setCustomerSearchTerm(name);
    setCustomerAddress(transaction?.customer_address || "");
    setCustomerTRN(transaction?.customer_trn || "");
    setPaymentReference(transaction?.payment_reference || "");
    setOrderComment(""); // Reset comment on open

    const normalizedInvoiceType = transaction?.invoice_type
      ? transaction.invoice_type.toLowerCase()
      : "retail";

    const supportedInvoiceType = ["retail", "wholesale", "corporate"].includes(normalizedInvoiceType)
      ? normalizedInvoiceType
      : "retail";

    setInvoiceType(supportedInvoiceType);
    
    // Initialize transaction date (today by default)
    const today = new Date().toISOString().split('T')[0];
    setTransactionDate(today);
    setDateValidationError("");
  }, [isOpen, transaction]);

  // Validate manual date entry (must be within last 7 days)
  const validateTransactionDate = (dateString: string) => {
    if (!dateString) {
      setDateValidationError("Date is required");
      return false;
    }

    const selectedDate = new Date(dateString);
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Reset time for comparison
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      setDateValidationError("Cannot enter future dates");
      return false;
    }

    if (selectedDate < sevenDaysAgo) {
      setDateValidationError("Can only enter transactions from the last 7 days");
      return false;
    }

    setDateValidationError("");
    return true;
  };

  const fetchCustomers = async () => {
    try {
      // First try to get from customers table
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false }) as { data: Customer[] | null; error: any };

      if (!customersError && customersData && customersData.length > 0) {
        console.log('Found customers in customers table:', customersData.length);
        setCustomers(customersData);
        return;
      }

      console.log('No customers in customers table, checking sales data...');

      // If no customers in customers table, get unique customers from sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('customer_name, customer_mobile, customer_address, customer_trn, invoice_type, created_at')
        .not('customer_name', 'is', null)
        .not('customer_mobile', 'is', null)
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

      if (!salesError && salesData) {
        console.log('Found sales data with customers:', salesData.length);
        console.log('Sales data sample:', salesData.slice(0, 3));
        // Create unique customers from sales data
        const uniqueCustomers = salesData.reduce((acc: Customer[], sale: any) => {
          const existing = acc.find(c =>
            c.mobile === sale.customer_mobile &&
            c.name === sale.customer_name
          );
          if (!existing) {
            acc.push({
              id: `sale-${sale.customer_mobile}-${Date.now()}` as any,
              name: sale.customer_name,
              mobile: sale.customer_mobile,
              email: null,
              phone: null,
              address: sale.customer_address || '',
              trn: sale.customer_trn || '',
              type: sale.invoice_type || 'retail',
              created_at: sale.created_at,
              updated_at: null
            });
          }
          return acc;
        }, []);

        console.log('Created unique customers from sales:', uniqueCustomers.length);
        console.log('Unique customers:', uniqueCustomers);
        setCustomers(uniqueCustomers);
      } else if (salesError) {
        console.error('Error fetching customers from sales:', salesError);
      } else {
        console.log('No sales data found, adding test customer data...');
        // Add some test customer data for demonstration
        const testCustomers: Customer[] = [
          {
            id: 'test-1' as any,
            name: 'John Smith',
            mobile: '1234567890',
            email: null,
            phone: null,
            address: '123 Main Street, Downtown',
            trn: 'TRN12345',
            type: 'retail',
            created_at: new Date().toISOString(),
            updated_at: null
          },
          {
            id: 'test-2' as any,
            name: 'Jane Doe',
            mobile: '9876543210',
            email: null,
            phone: null,
            address: '456 Oak Avenue, Uptown',
            trn: '',
            type: 'wholesale',
            created_at: new Date().toISOString(),
            updated_at: null
          },
          {
            id: 'test-3' as any,
            name: 'Mike Johnson',
            mobile: '5555551234',
            email: null,
            phone: null,
            address: '789 Pine Street',
            trn: 'TRN67890',
            type: 'retail',
            created_at: new Date().toISOString(),
            updated_at: null
          }
        ];
        console.log('Setting test customers:', testCustomers);
        setCustomers(testCustomers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleMobileChange = async (mobile: string) => {
    setCustomerMobile(mobile);

    if (mobile.length >= 3) { // Reduced from 10 to 3 for better UX
      setIsLoadingCustomer(true);

      // Search for existing customer by mobile
      const existingCustomer = customers.find(c => c.mobile.includes(mobile) || mobile.includes(c.mobile));

      if (existingCustomer) {
        setCustomerName(existingCustomer.name);
        setCustomerSearchTerm(existingCustomer.name);
        setCustomerAddress(existingCustomer.address);
        setCustomerTRN(existingCustomer.trn || '');
        if (existingCustomer.type) {
          setInvoiceType(existingCustomer.type);
        }
        toast({
          title: "Customer Found",
          description: `Loaded details for ${existingCustomer.name}`,
        });
      } else {
        // Clear other fields if no exact match, but keep mobile
        setCustomerName("");
        setCustomerSearchTerm("");
        setCustomerAddress("");
        setCustomerTRN("");
      }

      setIsLoadingCustomer(false);
    } else if (mobile.length < 3) {
      // Clear other fields when mobile is too short
      setCustomerName("");
      setCustomerSearchTerm("");
      setCustomerAddress("");
      setCustomerTRN("");
    }
  };

  const handleCustomerNameChange = (name: string) => {
    setCustomerSearchTerm(name);
    setCustomerName(name);

    if (name.length >= 1) {
      setShowCustomerSuggestions(true);
    } else {
      setShowCustomerSuggestions(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerSearchTerm(customer.name);
    setCustomerMobile(customer.mobile);
    setCustomerAddress(customer.address);
    setCustomerTRN(customer.trn || '');
    if (customer.type) {
      setInvoiceType(customer.type);
    }
    setShowCustomerSuggestions(false);
    
    toast({
      title: "Customer Selected",
      description: `Loaded details for ${customer.name}`,
    });
  };

  const getCustomerSuggestions = () => {
    if (!customerSearchTerm || customerSearchTerm.length < 1) {
      console.log('Search term too short or empty:', customerSearchTerm);
      return [];
    }

    console.log('Searching customers with term:', customerSearchTerm);
    console.log('Available customers:', customers.length);

    const searchLower = customerSearchTerm.toLowerCase().trim();

    const filtered = customers
      .filter(customer => {
        const nameLower = (customer.name || '').toLowerCase();
        const mobileLower = (customer.mobile || '').toLowerCase();
        const addressLower = (customer.address || '').toLowerCase();

        // Smart search: check if search term is contained in any field, or if any field starts with search term
        const matches = nameLower.includes(searchLower) ||
               mobileLower.includes(searchLower) ||
               addressLower.includes(searchLower) ||
               nameLower.startsWith(searchLower) ||
               mobileLower.startsWith(searchLower);
        
        if (matches) {
          console.log('Match found:', customer.name, customer.mobile);
        }
        
        return matches;
      })
      .slice(0, 8); // Increased from 5 to 8 for better results
    
    console.log('Filtered suggestions:', filtered.length, filtered);
    return filtered;
  };

  const saveCustomer = async () => {
    const trimmedMobile = (customerMobile || '').trim();
    const trimmedName = (customerName || '').trim();
    const trimmedAddress = (customerAddress || '').trim();
    const trimmedTrn = (customerTRN || '').trim();

    if (!trimmedName) return;

    try {
      // Check if customer already exists by mobile (if provided) or similar name
      let existingCustomer = null;

      if (trimmedMobile) {
        const { data } = await supabase
          .from("customers")
          .select('id, mobile, name')
          .eq('mobile', trimmedMobile as any)
          .limit(1)
          .maybeSingle();
        existingCustomer = data;
      }

      // If no mobile match, try name similarity
      if (!existingCustomer && trimmedName.length > 2) {
        const { data } = await supabase
          .from("customers")
          .select('id, mobile, name')
          .ilike('name', `%${trimmedName}%`)
          .limit(1)
          .maybeSingle();
        existingCustomer = data;
      }

      if (existingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from("customers")
          .update({
            name: trimmedName,
            mobile: trimmedMobile || null,
            address: trimmedAddress || null,
            trn: trimmedTrn || null,
            type: invoiceType,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id' as any, existingCustomer.id);

        if (error) throw error;

        console.log('Updated existing customer:', existingCustomer.id);
      } else {
        // Insert new customer
        const { data: newCustomer, error } = await supabase
          .from("customers")
          .insert({
            name: trimmedName,
            mobile: trimmedMobile || null,
            address: trimmedAddress || null,
            trn: trimmedTrn || null,
            type: invoiceType || 'retail'
          } as any)
          .select()
          .single();

        if (error) throw error;

        console.log('Created new customer:', (newCustomer as any)?.id);
      }

      await fetchCustomers();

      toast({
        title: "Customer Saved",
        description: `Customer ${trimmedName} saved successfully`,
      });

    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: `Failed to save customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const commitSale = async () => {
    if (!transaction || !transaction._cartData) {
      throw new Error("No cart data available to commit sale");
    }

    // Validate transaction date before committing
    if (!validateTransactionDate(transactionDate)) {
      throw new Error(dateValidationError || "Invalid transaction date");
    }

    const cart = transaction._cartData;
    
    // Use manual date if provided, otherwise use current time
    const saleDateTime = new Date(transactionDate);
    saleDateTime.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());
    const createdAt = saleDateTime.toISOString();

    // Process each cart item as individual sales with same transaction_id
    const salesData = cart.map(item => ({
      upc: item.product.upc,
      product_name: item.product.name,
      price: item.customPrice, // Use custom price
      quantity: item.quantity,
      total: item.customPrice * item.quantity,
      seller_name: transaction.seller_name,
      product_id: String(item.product.id).startsWith('manual-') ? null : item.product.id,
      payment_method: transaction.payment_method,
      payment_reference: transaction.payment_reference || null,
      transaction_id: transaction.transaction_id,
      invoice_number: transaction.invoice_number,
      status: 'active',
      created_at: createdAt, // Use manual date
      recorded_at: new Date().toISOString(), // Actual entry time for audit
      order_comment: orderComment ? orderComment.trim() : null,
    })) as any[];

    console.log('Committing sales data:', salesData);

    // Insert all sales
    const { data: salesResults, error: salesError } = await (supabase
      .from("sales")
      .insert(salesData)
      .select()) as { data: any[] | null; error: any };

    if (salesError) {
      console.error("Sales insert error:", salesError);
      throw new Error(salesError.message);
    }

    // Update inventory for all products
    for (const item of cart) {
      if (!String(item.product.id).startsWith('manual-')) {
        const newStock = item.product.stock - item.quantity;
        const { error: stockError } = await (supabase
          .from("products")
          .update({ stock: newStock, updated_at: new Date().toISOString() } as any)
          .eq("id" as never, item.product.id) as any);

        if (stockError) {
          console.error("Failed to update inventory for", item.product.name, stockError);
          // Continue with other items but log the error
        }
      }
    }

    return salesResults;
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

  const generateInvoice = async () => {
    if (!transaction) return;

    try {
      // First commit the sale to database
      await commitSale();

      // Always save customer if details provided (even without mobile)
      if (customerName && (customerName || '').trim()) {
        await saveCustomer();
      }

      const invoiceNumber = transaction.invoice_number;
      const createdDate = new Date(transaction.created_at);
      const invoiceDate = createdDate.toLocaleDateString("en-GB");
      const invoiceTime = createdDate.toLocaleTimeString("en-GB");

      // Update sales records with customer and invoice data
      try {
        const { error } = await (supabase
          .from("sales")
          .update({
            customer_name: customerName ? customerName.trim() : null,
            customer_mobile: customerMobile ? customerMobile.trim() : null,
            customer_address: customerAddress ? customerAddress.trim() : null,
            customer_trn: customerTRN ? customerTRN.trim() : null,
            invoice_number: invoiceNumber,
            invoice_type: invoiceType,
            payment_reference: paymentReference ? paymentReference.trim() : null,
            order_comment: orderComment ? orderComment.trim() : null,
          } as any)
          .eq("transaction_id" as never, transaction.transaction_id)) as { error: any };

        if (error) {
          console.error("Error updating sales with customer data:", error);
          toast({
            title: "Warning",
            description: "Invoice generated but customer data not saved to sales records",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error updating sales records:", error);
      }

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
            .company-left { flex: 1; padding: 10px; border-right: 1px solid #000; }
            .company-right { width: 300px; padding: 10px; }
            .invoice-table { width: 100%; border-collapse: collapse; }
            .invoice-table th, .invoice-table td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 11px; }
            .invoice-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
            .invoice-table .center { text-align: center; }
            .invoice-table .right { text-align: right; }
            .totals-section { background: #f5f5f5; }
            .amount-words { font-style: italic; margin-top: 5px; }
            @media print { .no-print { display: none; } }
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
                  <strong>Invoice Details:</strong><br>
                  <strong>Invoice #:</strong> ${invoiceNumber}<br>
                  <strong>Date:</strong> ${invoiceDate}<br>
                  <strong>Time:</strong> ${invoiceTime}<br>
                  <strong>Payment:</strong> ${transaction.payment_method.replace('_', ' ').toUpperCase()}<br>
                  ${transaction.payment_reference ? `<strong>Ref #:</strong> ${transaction.payment_reference}<br>` : ''}
                  <strong>Seller:</strong> ${transaction.seller_name}<br>
                  ${customerName ? `
                  <br><strong>Bill To:</strong><br>
                  <strong>${customerName}</strong><br>
                  ${customerMobile}<br>
                  ${customerAddress || 'N/A'}<br>
                  ${invoiceType === 'corporate' && customerTRN ? `<strong>TRN:</strong> ${customerTRN}<br>` : ''}
                  ` : `
                  <br><strong>Bill To:</strong><br>
                  <strong>Walk-in Customer</strong>
                  `}
                </div>
                <div class="company-right">
                  <strong>JNK General Trading LLC</strong><br>
                  Shop No.6, Baniyas Complex<br>
                  Baniyas Square, Dubai<br>
                  United Arab Emirates<br>
                  Ph : 04 252 2426<br><br>
                  <strong>TRN :</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;100274075900003
                </div>
              </div>
              {/* Order Comment (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="orderComment" className="text-muted-foreground text-xs">Order Comment (Optional)</Label>
                <Textarea
                  id="orderComment"
                  placeholder="Add any notes or comments for this order (optional)"
                  value={orderComment}
                  onChange={e => setOrderComment(e.target.value)}
                  className="min-h-[48px] sm:min-h-[60px] bg-muted border-border rounded-lg text-xs sm:text-sm placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>

            <!-- Invoice Table -->
            <table class="invoice-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Barcode</th>
                  <th>Item Description</th>
                  <th style="width: 50px;">Qty</th>
                  <th style="width: 80px;">Rate (AED)</th>
                  <th style="width: 50px;">UOM</th>
                  <th style="width: 90px;">Taxable Amount (AED)</th>
                  <th style="width: 60px;">VAT %</th>
                  <th style="width: 80px;">VAT (AED)</th>
                  <th style="width: 90px;">Total Incl VAT (AED)</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                <!-- Empty rows for spacing -->
                <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <!-- Totals -->
                <tr class="totals-section">
                  <td colspan="4"><strong>TOTAL</strong></td>
                  <td></td>
                  <td class="right"><strong>AED ${subtotal.toFixed(2)}</strong></td>
                  <td></td>
                  <td class="right"><strong>AED ${vatAmount.toFixed(2)}</strong></td>
                  <td class="right"><strong>AED ${totalAmount.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>

            <!-- Summary -->
            <div style="padding: 8px; border-top: 1px solid #000; background: #f5f5f5;">
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <strong>Amount in Words:</strong> ${numberToWords(totalAmount).toUpperCase()} DIRHAMS ONLY
                </div>
                <div style="text-align: right;">
                  <div>Sub Total &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>AED ${subtotal.toFixed(2)}</strong></div>
                  <div>Tax (5%) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>AED ${vatAmount.toFixed(2)}</strong></div>
                  <div style="border-top: 1px solid #000; margin-top: 3px; padding-top: 3px;">Total Amount (AED) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>AED ${totalAmount.toFixed(2)}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Print Invoice</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
          </div>
        </body>
        </html>
      `;

      const saleIds = transaction.items
        .map(item => item.id)
        .filter((id): id is string => Boolean(id) && !String(id).startsWith("cart-"));

      if (saleIds.length > 0) {
        const sanitizedName = customerName.trim();
        const sanitizedMobile = customerMobile.trim();
        const sanitizedAddress = customerAddress.trim();
        const sanitizedTrn = customerTRN.trim();

        const invoicePayload = {
          customer_name: sanitizedName || null,
          customer_mobile: sanitizedMobile || null,
          customer_address: sanitizedAddress || null,
          customer_trn: invoiceType === "corporate" ? (sanitizedTrn || null) : null,
          invoice_type: invoiceType,
          invoice_number: invoiceNumber,
          order_comment: orderComment ? orderComment.trim() : null,
        } as Record<string, string | null>;

        try {
          const { error: invoiceUpdateError } = await (supabase
            .from("sales")
            .update(invoicePayload as any)
            .in("id" as never, saleIds)) as { error: any };

          if (invoiceUpdateError) {
            console.error("Error updating invoice details:", invoiceUpdateError);
            toast({
              title: "Warning",
              description: "Invoice generated, but customer details were not saved.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Unexpected error updating invoice details:", error);
          toast({
            title: "Warning",
            description: "Invoice generated, but failed to save customer details.",
            variant: "destructive",
          });
        }
      }

      // Open invoice in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
      }

      toast({
        title: "Invoice Generated",
        description: "Sale completed and invoice opened in new window for printing",
      });

      onSaleAdded();
      onClose();

    } catch (error) {
      console.error('Error generating invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to generate invoice: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleSkipInvoice = async () => {
    if (!transaction) return;

    try {
      // First commit the sale to database
      await commitSale();

      // Always save customer if details provided (even without mobile)
      if (customerName && customerName.trim()) {
        await saveCustomer();
      }

      // Update sales records with customer data
      const { error } = await (supabase
        .from("sales")
        .update({
          customer_name: (customerName || '').trim() || null,
          customer_mobile: (customerMobile || '').trim() || null,
          customer_address: (customerAddress || '').trim() || null,
          customer_trn: (customerTRN || '').trim() || null,
          invoice_type: invoiceType,
          order_comment: orderComment ? orderComment.trim() : null,
        } as any)
        .eq("transaction_id" as never, transaction.transaction_id)) as { error: any };

      if (error) {
        console.error("Error updating sales:", error);
        toast({
          title: "Error",
          description: "Failed to save customer data",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Order Completed",
        description: "Sale completed without invoice",
      });

      onSaleAdded();
      onClose();

    } catch (error) {
      console.error("Error completing order:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to complete order: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = () => {
    // Just close the modal without committing the sale
    // The cart will remain intact for the user to modify or try again
    onClose();
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onSaleAdded();
        onClose();
      }
    }}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden rounded-xl shadow-lg bg-muted p-0"
      >
        {/* Header - Fixed at top */}
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-muted to-white px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-primary text-lg sm:text-xl lg:text-2xl font-bold">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-primary flex-shrink-0" />
            Print Invoice
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review the order summary and customer details before printing or skipping the invoice.
          </DialogDescription>
        </DialogHeader>

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left: Order Summary */}
          <div className="flex-1 lg:w-2/3 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
            <div className="bg-white border border-border rounded-xl p-3 sm:p-4 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3 text-sm sm:text-base lg:text-lg">Order Summary</h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <p className="flex justify-between sm:block">
                    <span className="font-medium">Invoice Number:</span> 
                    <span className="sm:ml-1">{transaction.invoice_number}</span>
                  </p>
                  <p className="flex justify-between sm:block">
                    <span className="font-medium">Items:</span> 
                    <span className="sm:ml-1">{transaction.items.length} products ({transaction.item_count} qty)</span>
                  </p>
                  <p className="flex justify-between sm:block">
                    <span className="font-medium">Payment Method:</span> 
                    <span className="sm:ml-1 uppercase">{transaction.payment_method.replace('_', ' ')}</span>
                  </p>
                  <p className="flex justify-between sm:block">
                    <span className="font-medium">Total Amount:</span> 
                    <span className="sm:ml-1 font-bold text-primary">AED {transaction.total_amount.toFixed(2)}</span>
                  </p>
                </div>

                <div className="mt-3 sm:mt-4">
                  <p className="font-semibold mb-2 text-xs sm:text-sm">Products:</p>
                  {/* Desktop/Tablet Table */}
                  <div className="hidden sm:block">
                    <div className="max-h-[25vh] lg:max-h-[35vh] overflow-y-auto rounded-lg border border-border">
                      <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 text-xs bg-secondary border-b border-border py-2 px-2">
                        <div className="col-span-6 font-bold">Product</div>
                        <div className="col-span-2 text-right font-bold">Qty</div>
                        <div className="col-span-2 text-right font-bold">Price</div>
                        <div className="col-span-2 text-right font-bold">Total</div>
                      </div>
                      <div className="divide-y divide-border">
                        {transaction.items.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 py-2 px-2 hover:bg-muted/50 transition-colors text-xs">
                            <div className="col-span-6 truncate">{item.product_name || 'N/A'}</div>
                            <div className="col-span-2 text-right">{item.quantity}</div>
                            <div className="col-span-2 text-right">{item.price.toFixed(2)}</div>
                            <div className="col-span-2 text-right font-semibold">{(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Mobile Card Layout */}
                  <div className="sm:hidden space-y-2 max-h-[30vh] overflow-y-auto">
                    {transaction.items.map((item, idx) => (
                      <div key={idx} className="bg-secondary/50 rounded-lg p-2 text-xs">
                        <div className="font-semibold mb-1">{item.product_name || 'N/A'}</div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          <span>@ AED {item.price.toFixed(2)}</span>
                        </div>
                        <div className="text-right font-bold text-primary mt-1">AED {(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Invoice Type + Date + Customer Details */}
          <div className="flex-1 lg:w-1/3 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 border-t lg:border-t-0 lg:border-l border-border bg-white">
            <div className="space-y-4">
              {/* Invoice Type */}
              <div className="space-y-1.5">
                <Label htmlFor="invoiceType" className="text-foreground font-semibold text-xs sm:text-sm">Invoice Type</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger className="bg-muted border-border h-9 sm:h-10 rounded-lg text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail Sale</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Date - Prominent Position */}
              {(isAdmin || isAccountant) && (
                <div className="space-y-2 bg-amber-50/30 border border-amber-200/50 rounded-lg p-3">
                  <Label htmlFor="transactionDate" className="text-foreground font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    Transaction Date (Last 7 days)
                  </Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => {
                      setTransactionDate(e.target.value);
                      validateTransactionDate(e.target.value);
                    }}
                    min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-white border-border h-10 sm:h-11 rounded-lg w-full text-sm sm:text-base px-3 font-medium"
                    style={{ 
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield',
                      colorScheme: 'light'
                    }}
                  />
                  {dateValidationError && (
                    <p className="text-xs text-destructive font-medium">{dateValidationError}</p>
                  )}
                  {transactionDate !== new Date().toISOString().split('T')[0] && !dateValidationError && (
                    <Alert className="bg-amber-100/80 border-amber-300 text-amber-900 py-1.5 sm:py-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <AlertDescription className="ml-1.5 text-xs sm:text-sm font-medium">
                        {new Date(transactionDate).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Customer Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                  <Label className="text-foreground font-semibold text-xs sm:text-sm">Customer Details (Optional)</Label>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-muted-foreground text-xs">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-primary" />
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="+971XXXXXXXXX"
                        value={customerMobile}
                        onChange={(e) => handleMobileChange(e.target.value)}
                        className="pl-8 sm:pl-10 bg-muted border-border h-9 sm:h-10 rounded-lg text-xs sm:text-sm placeholder:text-muted-foreground"
                      />
                    </div>
                    {isLoadingCustomer && (
                      <p className="text-xs text-primary">Searching...</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customerName" className="text-muted-foreground text-xs">Customer Name</Label>
                    <div className="relative">
                      <Input
                        id="customerName"
                        placeholder="Type to search..."
                        value={customerSearchTerm}
                        onChange={(e) => handleCustomerNameChange(e.target.value)}
                        onFocus={() => {
                          if (customerSearchTerm.length >= 2) {
                            setShowCustomerSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowCustomerSuggestions(false), 200);
                        }}
                        className="bg-muted border-border h-9 sm:h-10 rounded-lg text-xs sm:text-sm placeholder:text-muted-foreground"
                      />
                      {showCustomerSuggestions && getCustomerSuggestions().length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto text-xs">
                          {getCustomerSuggestions().map((customer, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                              onClick={() => selectCustomer(customer)}
                            >
                              <div className="font-medium text-foreground">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {customer.mobile} {customer.address ? `• ${customer.address}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customerAddress" className="text-muted-foreground text-xs">Address</Label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-2.5 sm:left-3 top-2.5 text-primary" />
                    <Textarea
                      id="customerAddress"
                      placeholder="Enter address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="pl-8 sm:pl-10 min-h-[60px] sm:min-h-[70px] bg-muted border-border rounded-lg text-xs sm:text-sm placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                </div>
                {invoiceType === "corporate" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="customerTRN" className="text-muted-foreground text-xs">TRN Number</Label>
                    <Input
                      id="customerTRN"
                      placeholder="Enter TRN"
                      value={customerTRN}
                      onChange={(e) => setCustomerTRN(e.target.value)}
                      className="bg-muted border-border h-9 sm:h-10 rounded-lg text-xs sm:text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                )}
                {transaction && (transaction.payment_method === 'card' || transaction.payment_method === 'bank_transfer') && (
                  <div className="space-y-1.5">
                    <Label htmlFor="paymentReference" className="text-muted-foreground text-xs">Payment Reference</Label>
                    <Input
                      id="paymentReference"
                      placeholder="Enter reference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="bg-muted border-border h-9 sm:h-10 rounded-lg text-xs sm:text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-gradient-to-t from-white to-muted/50 border-t border-border flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={() => setShowCancelConfirm(true)}
            variant="outline"
            size="sm"
            className="sm:flex-none bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 font-medium text-sm sm:text-base py-2 sm:py-2.5 rounded-lg"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => setShowSkipConfirm(true)}
            variant="outline"
            size="sm"
            className="sm:flex-none bg-secondary text-primary border-border font-medium text-sm sm:text-base py-2 sm:py-2.5 rounded-lg hover:bg-secondary/80"
          >
            Skip Invoice
          </Button>
          <Button 
            onClick={() => setShowPrintConfirm(true)} 
            size="sm"
            className="sm:flex-none sm:ml-auto bg-primary text-white hover:bg-primary/90 font-semibold text-sm sm:text-base py-2 sm:py-2.5 rounded-lg"
          >
            <Printer className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            Print Invoice
          </Button>
        </div>

        {/* Confirmation Dialogs */}
        <AlertDialog open={showPrintConfirm} onOpenChange={setShowPrintConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Print Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to finalize this order and generate a printable invoice?
                This will complete the sale and update inventory.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowPrintConfirm(false);
                generateInvoice();
              }}>
                Print Invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Order Without Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to complete this order without printing an invoice?
                The sale will be finalized and inventory will be updated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowSkipConfirm(false);
                handleSkipInvoice();
              }}>
                Complete Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this order? This will discard the current cart and return to the sales screen without recording any sale.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Order</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowCancelConfirm(false);
                handleCancelOrder();
              }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Cancel Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};