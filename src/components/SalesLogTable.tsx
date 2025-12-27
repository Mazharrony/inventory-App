import { useState, useEffect } from "react";
import { supabase } from "@/integrations/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, Search, Undo2, Eye, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { logger } from "@/lib/logger";
import { format, isToday } from "date-fns";
import { ViewInvoiceModal } from "./ViewInvoiceModal";
import { Tables, TablesInsert } from "@/integrations/types";
import { getLastThreeTransactions } from "@/utils/invoiceUtils";

type Sale = Tables<'sales'>;

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

type SalesLogTableProps = {
  refreshTrigger?: number;
  onSalesChange: () => void;
};

const SalesLogTable = ({ refreshTrigger, onSalesChange }: SalesLogTableProps) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [lastThreeTransactions, setLastThreeTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [undoTransactionId, setUndoTransactionId] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState("");
  const [undoReasonCategory, setUndoReasonCategory] = useState("customer_return");
  const [undoDetails, setUndoDetails] = useState("");
  const [showNoData, setShowNoData] = useState(false);
  const { toast } = useToast();
  const { user: currentUser, isSeller, isAdmin, isAccountant } = useAuth();

  // Log auth state changes in development
  useEffect(() => {
    logger.debug('SalesLogTable auth state', {
      currentUser: currentUser?.username,
      userRole: currentUser?.role,
      isSeller,
      isAdmin,
      isAccountant
    }, 'SalesLogTable');
  }, [currentUser, isSeller, isAdmin, isAccountant]);

  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching sales', error, 'SalesLogTable');
        setSales([]);
        setShowNoData(false);
        return;
      }

      if (data && data.length > 0) {
        setSales(data);
        setShowNoData(false);
      } else {
        setSales([]);
        setShowNoData(true);
      }
    };
    fetchSales();
  }, [refreshTrigger]);

  useEffect(() => {
    if (sales.length > 0) {
      processTransactions();
    }
  }, [sales]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, sellerFilter, timeFilter, paymentFilter, startDate, endDate]);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      logger.debug('Fetched sales', { count: data.length }, 'SalesLogTable');
      setSales(data as unknown as Sale[]);
    }
  };

  const processTransactions = () => {
    // Group sales by transaction_id, or by timestamp+seller if transaction_id doesn't exist
    const transactionMap = new Map<string, Transaction>();

    logger.debug('Processing transactions', { salesCount: sales.length }, 'SalesLogTable');

    sales.forEach(sale => {
      // Use transaction_id if available, otherwise group by time window (5 minute window) + seller
      let txId: string;

      if (sale.transaction_id) {
        txId = sale.transaction_id;
      } else {
        // Group sales within 5 minutes of each other by the same seller
        const saleTime = new Date(sale.created_at);
        const timeWindow = Math.floor(saleTime.getTime() / (5 * 60 * 1000)); // 5-minute windows
        txId = `${sale.seller_name}-${timeWindow}`;
      }

      if (!transactionMap.has(txId)) {
        transactionMap.set(txId, {
          transaction_id: txId,
          created_at: sale.created_at,
          seller_name: sale.seller_name,
          payment_method: sale.payment_method || 'cash',
          payment_reference: sale.payment_reference || null,
          items: [],
          total_amount: 0,
          item_count: 0,
          customer_name: sale.customer_name || null,
          customer_mobile: sale.customer_mobile || null,
          customer_address: sale.customer_address || null,
          customer_trn: sale.customer_trn || null,
          invoice_number: sale.invoice_number || null,
          invoice_type: sale.invoice_type ? sale.invoice_type.toLowerCase() : 'retail',
          order_comment: sale.order_comment || null,
        });

        // Log customer data in development
        if (sale.customer_name) {
          logger.debug('Transaction created with customer', {
            txId,
            customer_name: sale.customer_name,
            customer_mobile: sale.customer_mobile,
          }, 'SalesLogTable');
        }
      }

      const transaction = transactionMap.get(txId)!;
      transaction.items.push(sale);
      transaction.total_amount += sale.price * sale.quantity;
      transaction.item_count += sale.quantity;

      if (!transaction.customer_name && sale.customer_name) {
        transaction.customer_name = sale.customer_name;
      }

      if (!transaction.customer_mobile && sale.customer_mobile) {
        transaction.customer_mobile = sale.customer_mobile;
      }

      if (!transaction.customer_address && sale.customer_address) {
        transaction.customer_address = sale.customer_address;
      }

      if (!transaction.customer_trn && sale.customer_trn) {
        transaction.customer_trn = sale.customer_trn;
      }

      if (!transaction.invoice_number && sale.invoice_number) {
        transaction.invoice_number = sale.invoice_number;
      }

      if (sale.invoice_type) {
        const normalizedInvoiceType = sale.invoice_type.toLowerCase();
        if (normalizedInvoiceType !== transaction.invoice_type) {
          transaction.invoice_type = normalizedInvoiceType;
        }
      }

      if (!transaction.order_comment && sale.order_comment) {
        transaction.order_comment = sale.order_comment;
      }

      // Use the earliest created_at for the transaction
      if (new Date(sale.created_at) < new Date(transaction.created_at)) {
        transaction.created_at = sale.created_at;
      }
    });

    const transactionList = Array.from(transactionMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    logger.debug('Processed transactions', { count: transactionList.length }, 'SalesLogTable');
    setTransactions(transactionList);

    // Set last three transactions for undo functionality
    const lastThree = getLastThreeTransactions(transactionList);
    setLastThreeTransactions(lastThree);
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter((transaction) => {
        // Search in any product name or UPC within the transaction
        return transaction.items.some(item =>
          (item.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.upc.includes(searchTerm)
        ) || transaction.transaction_id.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    if (sellerFilter !== "all") {
      filtered = filtered.filter((transaction) => transaction.seller_name === sellerFilter);
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.created_at);

        if (timeFilter === "today") {
          return transactionDate >= today;
        } else if (timeFilter === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return transactionDate >= weekAgo;
        } else if (timeFilter === "month") {
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return transactionDate >= monthAgo;
        } else if (timeFilter === "custom") {
          // Use custom date range
          if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return transactionDate >= start && transactionDate <= end;
          } else if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            return transactionDate >= start;
          } else if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return transactionDate <= end;
          }
        }
        return true;
      });
    }

    // Payment method filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter((transaction) => transaction.payment_method === paymentFilter);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const deactivateTransaction = async (transactionId: string, reason: string) => {
    logger.debug("Starting deactivation for transaction", { transactionId }, 'SalesLogTable');

    // Find all sales in this transaction
    const transactionSales = sales.filter(sale => {
      if (sale.transaction_id) {
        return sale.transaction_id === transactionId;
      } else {
        // For grouped transactions without transaction_id, match by time window + seller
        const saleTime = new Date(sale.created_at);
        const timeWindow = Math.floor(saleTime.getTime() / (5 * 60 * 1000));
        const groupId = `${sale.seller_name}-${timeWindow}`;
        return groupId === transactionId;
      }
    });

    if (transactionSales.length === 0) {
      toast({
        title: "Error",
        description: "Transaction not found",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete all sales in this transaction
      for (const sale of transactionSales) {
        const { error: deleteError } = await (supabase
          .from("sales")
          .delete()
          .eq("id" as never, sale.id as any)) as { error: any };

        if (deleteError) {
          logger.error("Error deleting sale", deleteError, 'SalesLogTable');
          toast({
            title: "Error",
            description: deleteError.message,
            variant: "destructive",
          });
          return;
        }
      }

      logger.debug("All sales in transaction deleted successfully", { transactionId }, 'SalesLogTable');

      // Get current user for undo log
      const { data: { user } } = await supabase.auth.getUser();
      const undoneBy = user?.email || 'Unknown User';

      // Create undo log entries for each sale in the transaction
      for (const sale of transactionSales) {
        // Create undo log entry with new structure
        const undoLogEntry = {
          sale_id: parseInt(sale.id),
          sale_data: {
            upc: sale.upc,
            product_name: sale.product_name,
            quantity: sale.quantity,
            price: sale.price,
            total: sale.price * sale.quantity,
            seller_name: sale.seller_name,
            original_sale_date: sale.created_at,
            transaction_id: transactionId,
            invoice_number: sale.invoice_number
          },
          undone_by: currentUser?.username || currentUser?.fullName || 'System Admin',
          reason: reason,
          undone_at: new Date().toISOString()
        };

        // Track inventory restoration in sale_data
        let inventoryRestored = false;

        // Try to restore inventory
        if (sale.quantity) {
          const { data: productData, error: getProductError } = await (supabase
            .from("products")
            .select("stock, name")
            .eq("id" as never, (sale.product_id || sale.upc) as any)) as { data: any[]; error: any };

          if (!getProductError && productData && productData.length > 0) {
            const product = productData[0] as unknown as { stock: number; name: string };
            const newStock = (product.stock || 0) + sale.quantity;
            const { error: inventoryError } = await (supabase
              .from("products")
              .update({
                stock: newStock,
                updated_at: new Date().toISOString()
              } as any)
              .eq("id" as never, (sale.product_id || sale.upc) as any)) as { error: any };

            if (!inventoryError) {
              inventoryRestored = true;
              // Track inventory restoration (type assertion for extra property)
              (undoLogEntry.sale_data as any).inventory_restored = true;
              logger.debug(`Restored inventory`, { quantity: sale.quantity, productName: product.name }, 'SalesLogTable');
            }
          }
        }

        // Save the undo log entry to database
        logger.debug('Attempting to save undo log', { saleId: undoLogEntry.sale_id }, 'SalesLogTable');

        const { error: logError } = await supabase
          .from("sales_undo_log")
          .insert(undoLogEntry as any);

        if (logError) {
          logger.error('Error saving undo log to database', logError, 'SalesLogTable');

          // Fallback to localStorage with new structure
          const localLogEntry = {
            ...undoLogEntry,
            id: Math.floor(Math.random() * 1000000)
          };

          const existingLogs = JSON.parse(localStorage.getItem('undo_logs') || '[]');
          existingLogs.unshift(localLogEntry);
          const recentLogs = existingLogs.slice(0, 50);
          localStorage.setItem('undo_logs', JSON.stringify(recentLogs));

          logger.debug('Saved undo log to localStorage as fallback', { saleId: undoLogEntry.sale_id }, 'SalesLogTable');
        } else {
          logger.debug('Undo log saved to database successfully', { saleId: undoLogEntry.sale_id }, 'SalesLogTable');
        }
      }

      const totalAmount = transactionSales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0);
      const totalItems = transactionSales.reduce((sum, sale) => sum + sale.quantity, 0);

      toast({
        title: "Success",
        description: `Transaction undone successfully. ${totalItems} items restored to inventory. Revenue reduced by AED ${totalAmount.toFixed(2)}.`,
      });

      fetchSales();
      onSalesChange();

    } catch (error) {
      logger.error('Transaction undo error', error, 'SalesLogTable');
      toast({
        title: "Error",
        description: "Failed to undo transaction",
        variant: "destructive",
      });
    }
  };

  const handleViewInvoice = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowInvoiceModal(true);
  };

  const handleUndoClick = (transactionId: string) => {
    setUndoTransactionId(transactionId);
    setUndoReasonCategory("customer_return");
    setUndoDetails("");
    setUndoReason("");
    setUndoDialogOpen(true);
  };

  const handleUndoConfirm = async () => {
    if (!undoReasonCategory.trim() || (!undoDetails.trim() && undoReasonCategory === "other")) {
      toast({
        title: "Error",
        description: "Please select a reason category and provide details if 'Other' is selected",
        variant: "destructive",
      });
      return;
    }

    if (undoTransactionId) {
      // Combine category and details for the reason
      const fullReason = undoReasonCategory === "other" 
        ? `Other: ${undoDetails}`
        : `${undoReasonCategory.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}${undoDetails ? ` - ${undoDetails}` : ''}`;
      
      await deactivateTransaction(undoTransactionId, fullReason.trim());
      setUndoDialogOpen(false);
      setUndoTransactionId(null);
      setUndoReasonCategory("customer_return");
      setUndoDetails("");
      setUndoReason("");
    }
  };

  const exportToCSV = () => {
    // 1. Unified column schema for both retail and corporate (exact order required)
    const headers = [
      "Date", "InvoiceNo", "TxnID", "Store / Outlet", "CustomerName", "CustomerType",
      "Product", "UPC", "Qty", "UnitPrice", "LineTotal", "InvoiceTotal",
      "PaymentMethod", "PaymentReference", "Seller / Cashier"
    ];
    const csvData: string[][] = [];

    // 2. Process each transaction with unified mapping
    filteredTransactions.forEach((transaction) => {
      // Invoice-level data (shared across all rows for group orders)
      const date = format(new Date(transaction.created_at), "yyyy-MM-dd");
      const invoiceNo = transaction.invoice_number;
      const txnId = transaction.transaction_id;
      const store = "JNK GENERAL TRADING LLC"; // Default store/outlet name
      const customerName = transaction.customer_name || "Walk-in";
      // 3. Determine customer type: Corporate if has TRN, otherwise Retail
      const customerType = (transaction.customer_trn && transaction.customer_trn.trim()) ? "Corporate" : "Retail";
      const invoiceTotal = transaction.total_amount.toFixed(2); // Same source for all sale types
      const paymentMethod = transaction.payment_method || "cash";
      const paymentReference = transaction.payment_reference || "";
      const seller = transaction.seller_name || "Unknown";

      // 4. Process each item with consistent Product/UPC mapping
      transaction.items.forEach((item) => {
        // Product-specific data (changes per row)
        const product = item.product_name || 'N/A'; // Always from product_name field
        const upc = `"${item.upc || ''}"`;          // Always from UPC field, quoted to prevent scientific notation
        const qty = item.quantity.toString();       // EXACT system quantity
        const unitPrice = item.price.toFixed(2);    // EXACT system unit price
        const lineTotal = (item.price * item.quantity).toFixed(2); // Same calculation as system

        // 5. Create unified row structure for all sale types
        csvData.push([
          date,           // Date
          invoiceNo,      // InvoiceNo
          txnId,          // TxnID
          store,          // Store / Outlet
          customerName,   // CustomerName
          customerType,   // CustomerType (Retail / Corporate)
          product,        // Product (always from product_name)
          upc,            // UPC (always from upc field, as text)
          qty,            // Qty
          unitPrice,      // UnitPrice
          lineTotal,      // LineTotal (per product)
          invoiceTotal,   // InvoiceTotal (same for group order)
          paymentMethod,  // PaymentMethod
          paymentReference, // PaymentReference
          seller          // Seller / Cashier
        ]);
      });
    });

    const csv = [headers, ...csvData].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();

    toast({
      title: "Success",
      description: "Sales transactions exported successfully",
    });
  };

  // Check if transaction can be undone (any active transaction from last 30 days for admin/accountant)
  const canUndoTransaction = (transaction: Transaction, index: number) => {
    const transactionDate = new Date(transaction.created_at);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const isWithinLastMonth = transactionDate >= thirtyDaysAgo;

    // Treat null/undefined status as active (for backward compatibility)
    const hasActiveSales = transaction.items.every(item =>
      item.status === 'active' || item.status === null || item.status === undefined
    );

    logger.debug('Undo button check', {
      invoice: transaction.invoice_number,
      transaction_id: transaction.transaction_id.slice(-8),
      transactionDate: transactionDate.toISOString(),
      thirtyDaysAgo: thirtyDaysAgo.toISOString(),
      isWithinLastMonth,
      hasActiveSales,
      itemStatuses: transaction.items.map(item => ({ 
        product: item.product_name, 
        status: item.status,
        id: item.id 
      })),
      userRole: currentUser?.role,
      isAdmin,
      isAccountant,
      willShowButton: (isAdmin || isAccountant) && isWithinLastMonth && hasActiveSales
    });

    return isWithinLastMonth && hasActiveSales;
  };

  const uniqueSellers = Array.from(new Set(transactions.flatMap(t => t.seller_name)))
    .filter(seller => seller && seller.trim() !== ''); // Filter out empty or null sellers

  return (
    <>
      {showNoData && (
        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
          <strong>No sales found:</strong> No sales records in the database.
        </div>
      )}
      <Card className="bg-card border border-border shadow-sm rounded-lg">
        <CardHeader className="border-b border-border px-6 py-4">
          <CardTitle className="text-primary text-xl font-semibold">Sales Log</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-6 pb-6">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-muted border-border focus:ring-2 focus:ring-primary/20 h-10"
              />
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-muted border-border focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Filter by seller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  {uniqueSellers.map((seller) => (
                    <SelectItem key={seller || 'unknown'} value={seller || 'unknown'}>
                      {seller || 'Unknown Seller'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={(value) => {
                setTimeFilter(value);
                if (value !== "custom") {
                  setStartDate("");
                  setEndDate("");
                }
              }}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-muted border-border focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Filter by time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
              {timeFilter === "custom" && (
                <>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full sm:w-[160px] h-10 bg-muted border-border focus:ring-2 focus:ring-primary/20"
                    placeholder="Start date"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full sm:w-[160px] h-10 bg-muted border-border focus:ring-2 focus:ring-primary/20"
                    placeholder="End date"
                  />
                </>
              )}
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-muted border-border focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline" className="h-10">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table - Desktop View */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border">
                    <TableHead className="px-4 py-3 text-sm font-semibold text-primary">Date</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-primary">Invoice #</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-primary">Customer</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-primary">Items</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-primary">Payment</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-primary text-right">Total</TableHead>
                    <TableHead className="px-4 py-3 text-sm font-semibold text-primary w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground/50" />
                        <span className="text-lg">No transactions found</span>
                        <span className="text-sm">Try adjusting your search or filters</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((transaction, index) => (
                    <TableRow key={transaction.transaction_id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="px-4 py-3 text-sm">
                        {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-mono font-semibold text-primary">
                        {transaction.invoice_number || `JNK-${transaction.transaction_id.slice(-4)}`}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {transaction.customer_name ? (
                          <div className="font-medium truncate" title={transaction.customer_name}>
                            {transaction.customer_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {transaction.item_count}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm capitalize">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.payment_method === 'cash' ? 'text-gray-700' :
                          transaction.payment_method === 'card' ? 'text-gray-600' :
                          transaction.payment_method === 'bank_transfer' ? 'text-gray-800' :
                          transaction.payment_method === 'due' ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {transaction.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right font-medium">
                        AED {transaction.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm w-48">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(transaction)}
                            className="text-xs px-2 py-1 h-8"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {(() => {
                            const canUndo = canUndoTransaction(transaction, index);
                            const showButton = (isAdmin || isAccountant) && canUndo;
                            return showButton ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUndoClick(transaction.transaction_id)}
                                className="text-xs px-2 py-1 h-8 text-destructive hover:bg-destructive/10"
                              >
                                <Undo2 className="h-3 w-3 mr-1" />
                                Undo
                              </Button>
                            ) : null;
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-base">No transactions found</span>
                  <span className="text-xs">Try adjusting your search or filters</span>
                </div>
              </div>
            ) : (
              filteredTransactions
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((transaction, index) => (
                  <div key={transaction.transaction_id} className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-mono font-semibold text-primary text-sm mb-1">
                          {transaction.invoice_number || `JNK-${transaction.transaction_id.slice(-4)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-base">
                          AED {transaction.total_amount.toFixed(2)}
                        </div>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {transaction.item_count} items
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground min-w-[70px]">Customer:</span>
                        <span className="font-medium truncate">
                          {transaction.customer_name || 'Walk-in'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground min-w-[70px]">Payment:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          transaction.payment_method === 'cash' ? 'bg-gray-100 text-gray-700' :
                          transaction.payment_method === 'card' ? 'bg-gray-200 text-gray-800' :
                          transaction.payment_method === 'bank_transfer' ? 'bg-gray-300 text-gray-900' :
                          transaction.payment_method === 'due' ? 'bg-gray-400 text-gray-900' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {transaction.payment_method}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvoice(transaction)}
                        className="flex-1 text-xs h-9"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {(isAdmin || isAccountant) && canUndoTransaction(transaction, index) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUndoClick(transaction.transaction_id)}
                          className="flex-1 text-xs h-9 text-destructive hover:bg-destructive/10"
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Pagination */}
          {filteredTransactions.length > itemsPerPage && (() => {
            const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
            const startItem = filteredTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, filteredTransactions.length);
            
            // Calculate page window (show max 7 pages)
            const getPageNumbers = () => {
              const pages: (number | string)[] = [];
              const maxVisible = 7;
              
              if (totalPages <= maxVisible) {
                // Show all pages if total is less than max visible
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);
                
                if (currentPage <= 4) {
                  // Near the beginning: show 1, 2, 3, 4, 5, ..., last
                  for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  // Near the end: show 1, ..., last-4, last-3, last-2, last-1, last
                  pages.push('ellipsis-start');
                  for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // In the middle: show 1, ..., current-1, current, current+1, ..., last
                  pages.push('ellipsis-start');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                }
              }
              
              return pages;
            };

            const pageNumbers = getPageNumbers();

            return (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{startItem}</span> to <span className="font-medium text-foreground">{endItem}</span> of <span className="font-medium text-foreground">{filteredTransactions.length}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* First Page Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Previous Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {pageNumbers.map((page, index) => {
                      if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      
                      const pageNum = page as number;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 min-w-8 px-2 text-xs font-medium ${
                            currentPage === pageNum 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted"
                          }`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Next Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  {/* Last Page Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* View Invoice Modal */}
      <ViewInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        transaction={selectedTransaction}
        onInvoiceUpdated={async () => {
          // Refresh the sales data when invoice is updated
          await fetchSales();
          // processTransactions will be triggered by the useEffect when sales state updates
          
          // Trigger a custom event to notify Analytics page to refresh invoice edit logs
          window.dispatchEvent(new CustomEvent('invoiceEdited'));
        }}
      />

      {/* Undo Dialog */}
      <AlertDialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Undo Transaction
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This will restore inventory and remove the sale from records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 my-4">
            {/* Confirmation Summary */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-900">Action Summary:</p>
                  <ul className="mt-2 space-y-1 text-red-800 list-disc list-inside">
                    <li>Sale will be marked as UNDONE</li>
                    <li>Inventory will be restored to original quantity</li>
                    <li>Transaction will be logged for audit trail</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Reason Category Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Undoing *</label>
              <select
                value={undoReasonCategory}
                onChange={(e) => setUndoReasonCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="customer_return">Customer Return/Refund</option>
                <option value="wrong_price">Wrong Price Charged</option>
                <option value="wrong_quantity">Incorrect Quantity</option>
                <option value="duplicate_entry">Duplicate Entry</option>
                <option value="system_error">System Error</option>
                <option value="customer_complaint">Customer Complaint</option>
                <option value="other">Other (Please Specify)</option>
              </select>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional Details {undoReasonCategory === "other" && "*"}
              </label>
              <Textarea
                placeholder={
                  undoReasonCategory === "other"
                    ? "Please explain the reason for undoing..."
                    : "Optional: Add any additional details"
                }
                value={undoDetails}
                onChange={(e) => setUndoDetails(e.target.value)}
                className="mt-2"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This information will be stored in the audit log for reference.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUndoConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirm Undo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SalesLogTable;