/*
╔══════════════════════════════════════════════════════════════════╗
║  JNK GENERAL TRADING LLC - Sales & Inventory Management System      ║
║                                                                  ║
║  Crafted with Excellence by: MAZHAR RONY                     ║
║  "Building tomorrow's business solutions today"               ║
║                                                                  ║
║  Connect: hello@meetmazhar.site | Portfolio: www.meetmazhar.site  ║
╚══════════════════════════════════════════════════════════════════╝
*/

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/client";
import { ChevronLeft, ChevronRight, Download, Calendar, Eye, BarChart3, Users, Undo2, TrendingUp, Shield, History, UserCheck, RefreshCw, Package, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import SalesLogTable from "@/components/SalesLogTable";
import * as XLSX from 'xlsx';
import { Tables } from "@/integrations/types";
import { UndoSaleDetailsModal } from "@/components/UndoSaleDetailsModal";

type Sale = {
  id: string;
  upc: string;
  product_name: string | null;
  customer_name?: string | null;
  invoice_number?: string | null;
  price: number;
  quantity: number;
  seller_name: string;
  created_at: string;
  payment_method?: string;
};

type UndoLog = {
  id: number;
  sale_id: number | null;
  sale_data: any | null;
  undone_by: string | null;
  undone_at: string | null;
  reason: string | null;
};

type InvoiceEditLog = {
  id: string;
  invoice_number: string;
  transaction_id: string;
  edited_by: string;
  edited_at: string;
  changes_summary: string[];
  previous_data: any;
  new_data: any;
  edit_reason: string | null;
  created_at: string;
};

type SellerStats = {
  seller_name: string;
  total_sales: number;
  total_revenue: number;
  total_items: number;
  undo_count: number;
  avg_sale_value: number;
};

type StockMovement = Tables<'stock_movements'>;

const Analytics = () => {
  const navigate = useNavigate();
  const { isAdmin, isAccountant, isSeller, userRole } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [undoLogs, setUndoLogs] = useState<UndoLog[]>([]);
  const [invoiceEditLogs, setInvoiceEditLogs] = useState<InvoiceEditLog[]>([]);
  const [sellerStats, setSellerStats] = useState<SellerStats[]>([]);
  const [selectedDayDetails, setSelectedDayDetails] = useState<Sale[] | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState(isAdmin ? "overview" : "overview");
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', mobile: '', address: '', trn: '', type: 'individual' });
  
  // Undo sale details modal state
  const [selectedUndoLog, setSelectedUndoLog] = useState<UndoLog | null>(null);
  const [isUndoDetailsModalOpen, setIsUndoDetailsModalOpen] = useState(false);
  
  // Refresh trigger for SalesLogTable
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Sales table filtering and sorting states
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesFilter, setSalesFilter] = useState('all');
  const [salesSortBy, setSalesSortBy] = useState('date');
  const [salesSortOrder, setSalesSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Stock movements state
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [movementSearchTerm, setMovementSearchTerm] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [movementDateFilter, setMovementDateFilter] = useState('all');
  
  const { toast } = useToast();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [dateFilterMode, setDateFilterMode] = useState<'last30days' | 'month'>('last30days');

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchStockMovements();
  }, []);

  useEffect(() => {
    if ((isAdmin || isAccountant || isSeller) && sales.length > 0) {
      fetchUndoLogs();
      fetchInvoiceEditLogs();
    }
  }, [isAdmin, isAccountant, isSeller, sales]);

  // Listen for invoice edit events to refresh invoice edit logs
  useEffect(() => {
    const handleInvoiceEdited = () => {
      console.log('Invoice edited event received, refreshing invoice edit logs...');
      fetchInvoiceEditLogs();
    };

    window.addEventListener('invoiceEdited', handleInvoiceEdited);
    return () => {
      window.removeEventListener('invoiceEdited', handleInvoiceEdited);
    };
  }, []);

  useEffect(() => {
    if ((isAdmin || isAccountant || isSeller) && sales.length > 0 && undoLogs.length >= 0) {
      fetchSellerStats();
    }
  }, [isAdmin, isAccountant, isSeller, sales, undoLogs]);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSales(data as unknown as Sale[]);
    }
  };

  const handleSalesChange = () => {
    fetchSales();
    setRefreshTrigger(prev => prev + 1);
  };

  const fetchUndoLogs = async () => {
    if (!isAdmin && !isAccountant && !isSeller) return;
    
    console.log('Fetching undo logs...');
    const { data, error } = await supabase
      .from("sales_undo_log")
      .select("*")
      .order("undone_at", { ascending: false });

    if (!error && data) {
      console.log(`Fetched ${data.length} undo logs from database`);
      setUndoLogs(data as any as UndoLog[]);
    } else if (error) {
      console.error('Error fetching undo logs:', error);
      
      // Fallback to localStorage if needed
      const localLogs = JSON.parse(localStorage.getItem('undo_logs') || '[]');
      console.log(`Using localStorage fallback: ${localLogs.length} logs`);
      
      // Convert old format to new format if needed
      const convertedLogs = localLogs.map((log: any) => ({
        id: parseInt(log.id) || Math.floor(Math.random() * 1000000),
        sale_id: log.original_sale_id || null,
        sale_data: {
          upc: log.sale_upc,
          product_name: log.sale_product_name,
          quantity: log.sale_quantity,
          price: log.sale_price,
          total: log.sale_total,
          seller_name: log.seller_name,
          original_sale_date: log.original_sale_date
        },
        undone_by: log.undone_by,
        undone_at: log.undone_at,
        reason: log.undo_reason || log.reason
      }));
      
      setUndoLogs(convertedLogs);
    }
  };

  const fetchInvoiceEditLogs = async () => {
    if (!isAdmin && !isAccountant && !isSeller) return;
    
    try {
      console.log('Fetching invoice edit logs...');
      const { data, error } = await supabase
        .from("invoice_edit_logs")
        .select("*")
        .order("edited_at", { ascending: false })
        .limit(100); // Limit to last 100 edits

      if (!error && data) {
        console.log(` Fetched ${data.length} invoice edit logs from database`);
        setInvoiceEditLogs(data as any as InvoiceEditLog[]);
      } else if (error) {
        console.error('Error fetching invoice edit logs:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Check if table doesn't exist
        if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
          console.warn('invoice_edit_logs table does not exist. Please run migration: 20251212_create_invoice_edit_logs.sql');
        }
        
        // Table might not exist yet, so just set empty array
        setInvoiceEditLogs([]);
      }
    } catch (error: any) {
      console.error('Exception fetching invoice edit logs:', error);
      console.error('Exception details:', error?.message || error);
      setInvoiceEditLogs([]);
    }
  };

  // Debug function to add sample undo data (for testing purposes)
  const addSampleUndoData = () => {
    const sampleUndo: UndoLog = {
      id: Math.floor(Math.random() * 1000000),
      sale_id: Math.floor(Math.random() * 100),
      sale_data: {
        upc: "1234567890123",
        product_name: "Sample Product",
        quantity: 2,
        price: 25.00,
        total: 50.00,
        seller_name: "Test Seller",
        original_sale_date: new Date().toISOString()
      },
      undone_by: "Admin Test",
      undone_at: new Date().toISOString(),
      reason: "Customer returned product - Test Data"
    };

    // Add directly to state for immediate display
    setUndoLogs(prev => [sampleUndo, ...prev]);
    
    toast({
      title: "Sample Undo Added",
      description: "Added a sample undo record for demonstration",
    });
  };

  const fetchSellerStats = async () => {
    if (!isAdmin && !isAccountant && !isSeller) return;

    // Calculate seller statistics from sales data
    const stats: Record<string, SellerStats> = {};
    
    sales.forEach(sale => {
      const seller = sale.seller_name;
      if (!stats[seller]) {
        stats[seller] = {
          seller_name: seller,
          total_sales: 0,
          total_revenue: 0,
          total_items: 0,
          undo_count: 0,
          avg_sale_value: 0
        };
      }
      
      stats[seller].total_sales += 1;
      stats[seller].total_revenue += sale.price * sale.quantity;
      stats[seller].total_items += sale.quantity;
    });

    // Add undo counts
    undoLogs.forEach(undo => {
      const seller = undo.sale_data?.seller_name;
      if (seller && stats[seller]) {
        stats[seller].undo_count += 1;
      }
    });

    // Calculate averages
    Object.values(stats).forEach(stat => {
      stat.avg_sale_value = stat.total_sales > 0 ? stat.total_revenue / stat.total_sales : 0;
    });

    setSellerStats(Object.values(stats).sort((a, b) => b.total_revenue - a.total_revenue));
  };

  const fetchCustomers = async () => {
    try {
      // First try to get from customers table
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!customersError && customersData && customersData.length > 0) {
        setCustomers(customersData);
        setFilteredCustomers(customersData);
        return;
      }

      // If no customers in customers table, get unique customers from sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('customer_name, customer_mobile, customer_address, customer_trn, invoice_type, created_at')
        .not('customer_name', 'is', null)
        .not('customer_mobile', 'is', null)
        .order('created_at', { ascending: false });

      if (!salesError && salesData && Array.isArray(salesData)) {
        // Create unique customers from sales data
        const uniqueCustomers = salesData.reduce((acc: any[], sale) => {
          // Type guard to ensure sale has the expected properties
          if (sale && typeof sale === 'object' && 'customer_mobile' in sale && 'customer_name' in sale) {
            const existing = acc.find(c =>
              c.customer_mobile === sale.customer_mobile &&
              c.customer_name === sale.customer_name
            );
            if (!existing) {
              acc.push({
                id: `sale-${sale.customer_mobile}-${Date.now()}`, // Generate ID
                name: sale.customer_name,
                mobile: sale.customer_mobile,
                address: sale.customer_address || '',
                trn: sale.customer_trn || '',
                type: sale.invoice_type || 'retail',
                created_at: sale.created_at
              });
            }
          }
          return acc;
        }, []);

        setCustomers(uniqueCustomers);
        setFilteredCustomers(uniqueCustomers);
      } else if (salesError) {
        console.error('Error fetching customers from sales:', salesError);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchStockMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStockMovements(data as unknown as StockMovement[]);
        setFilteredMovements(data as unknown as StockMovement[]);
      } else if (error) {
        console.error('Error fetching stock movements:', error);
      }
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
  };

  // Filter stock movements based on search and filters
  useEffect(() => {
    let filtered = stockMovements;

    // Search by product name
    if (movementSearchTerm) {
      filtered = filtered.filter(movement =>
        (movement.product_name?.toLowerCase() ?? '').includes(movementSearchTerm.toLowerCase())
      );
    }

    // Filter by movement type
    if (movementTypeFilter !== 'all') {
      filtered = filtered.filter(movement => movement.movement_type === movementTypeFilter);
    }

    // Filter by date
    if (movementDateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      filtered = filtered.filter(movement => {
        const movementDate = new Date(movement.created_at);
        switch (movementDateFilter) {
          case 'today':
            return movementDate >= today;
          case 'week':
            return movementDate >= weekStart;
          case 'month':
            return movementDate >= monthStart;
          default:
            return true;
        }
      });
    }

    setFilteredMovements(filtered);
  }, [stockMovements, movementSearchTerm, movementTypeFilter, movementDateFilter]);

  // Filter customers based on search and filter
  useEffect(() => {
    let filtered = customers;

    // Apply search filter
    if (customerSearchTerm) {
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.mobile.includes(customerSearchTerm) ||
        (customer.address && customer.address.toLowerCase().includes(customerSearchTerm.toLowerCase())) ||
        (customer.trn && customer.trn.toLowerCase().includes(customerSearchTerm.toLowerCase()))
      );
    }

    // Apply type/date filter
    if (customerFilter === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(customer => 
        new Date(customer.created_at) >= thirtyDaysAgo
      );
    } else if (customerFilter === 'individual') {
      filtered = filtered.filter(customer => 
        !customer.type || customer.type === 'individual'
      );
    } else if (customerFilter === 'corporate') {
      filtered = filtered.filter(customer => 
        customer.type === 'corporate'
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, customerSearchTerm, customerFilter]);

  const openEditModal = (customer: any) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name || '',
      mobile: customer.mobile || '',
      address: customer.address || '',
      trn: customer.trn || '',
      type: customer.type || 'individual'
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingCustomer(null);
    setIsEditModalOpen(false);
    setEditForm({ name: '', mobile: '', address: '', trn: '', type: 'individual' });
  };

  const saveCustomerEdit = async () => {
    if (!editingCustomer) return;

    try {
      // Check if customer exists in customers table
      const { data: existingCustomer } = await (supabase
        .from('customers')
        .select('id')
        .eq('mobile', editingCustomer.mobile)
        .single()) as { data: any | null; error: any };

      if (existingCustomer) {
        // Update in customers table
        const { error } = await (supabase
          .from('customers')
          .update({
            name: editForm.name,
            mobile: editForm.mobile,
            address: editForm.address,
            trn: editForm.trn,
            type: editForm.type,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', editingCustomer.id)) as { error: any };

        if (error) {
          console.error('Update error:', error);
          toast({
            title: "Error",
            description: `Failed to update customer: ${error.message}`,
            variant: "destructive",
          });
          return;
        }
      } else {
        // Insert into customers table
        const { error } = await (supabase
          .from('customers')
          .insert({
            name: editForm.name,
            mobile: editForm.mobile,
            address: editForm.address,
            trn: editForm.trn,
            type: editForm.type,
          } as any)) as { error: any };

        if (error) {
          console.error('Insert error:', error);
          toast({
            title: "Error",
            description: `Failed to save customer: ${error.message}`,
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: "Customer data updated successfully",
      });

      // Refresh customers list
      fetchCustomers();
      closeEditModal();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer data",
        variant: "destructive",
      });
    }
  };

  const deleteCustomer = async (customerId: string, customerName: string) => {
    // Prevent deletion of customers derived from sales data
    if (customerId.toString().startsWith('sale-')) {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete customers derived from sales data. Only customers from the customers table can be deleted.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId as any);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: "Error",
          description: `Failed to delete customer: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });

      // Refresh customers list
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  // Filter sales based on selected mode (last 30 days or specific month)
  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.created_at);
    
    if (dateFilterMode === 'last30days') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return saleDate >= thirtyDaysAgo;
    } else {
      // Month mode
      return (
        saleDate.getMonth() === selectedMonth && 
        saleDate.getFullYear() === selectedYear
      );
    }
  });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.price * sale.quantity, 0);
  const totalItemsSold = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
  
  // Count unique transactions instead of individual sales
  const uniqueTransactions = new Set(
    filteredSales
      .map(sale => sale.invoice_number || sale.created_at)
      .filter(Boolean)
  );
  const totalTransactions = uniqueTransactions.size;
  
  // Get display label for current filter
  const getDateRangeLabel = () => {
    if (dateFilterMode === 'last30days') {
      return 'Last 30 days';
    } else {
      return format(new Date(selectedYear, selectedMonth), "MMMM yyyy");
    }
  };

  // Filtered and sorted sales for the main table
  const filteredSalesForTable = (() => {
    let filtered = filteredSales;
    if (salesSearchTerm) {
      const searchLower = salesSearchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        (sale.product_name?.toLowerCase() ?? '').includes(searchLower) ||
        (sale.customer_name?.toLowerCase() ?? '').includes(searchLower) ||
        (sale.upc?.toLowerCase() ?? '').includes(searchLower) ||
        (sale.seller_name?.toLowerCase() ?? '').includes(searchLower)
      );
    }
    return filtered;
  })();

  const exportStockMovements = () => {
    if (filteredMovements.length === 0) {
      toast({
        title: "No Data",
        description: "No stock movements to export",
        variant: "destructive"
      });
      return;
    }

    const exportData = filteredMovements.map(movement => ({
      'Product Name': movement.product_name,
      'Previous Stock': movement.previous_stock,
      'New Stock': movement.new_stock,
      'Quantity Added': movement.quantity_added,
      'Movement Type': movement.movement_type,
      'Imported By': movement.created_by,
      'Date': format(new Date(movement.created_at), 'yyyy-MM-dd HH:mm'),
      'Notes': movement.notes || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    const colWidths = [
      { wch: 35 }, // Product Name
      { wch: 15 }, // Previous Stock
      { wch: 12 }, // New Stock
      { wch: 15 }, // Quantity Added
      { wch: 15 }, // Movement Type
      { wch: 20 }, // Imported By
      { wch: 20 }, // Date
      { wch: 30 }, // Notes
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `stock_movements_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} stock movements to ${filename}`
    });
  };

  return (
    <div>
      <AppHeader 
        title="JNK GENERAL TRADING LLC" 
        subtitle={isAdmin ? "Admin Sales Analytics" : "Sales Analytics"}
        icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />} 
      />
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Tabs defaultValue="sales" className="w-full">
          <div className="w-full overflow-x-auto mb-4 sm:mb-6">
            <TabsList className={`inline-flex w-auto min-w-full md:grid md:w-full ${isSeller ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
              <TabsTrigger value="sales" className="text-xs sm:text-sm whitespace-nowrap">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sales </span>Overview
              </TabsTrigger>
              <TabsTrigger value="customers" className="text-xs sm:text-sm whitespace-nowrap">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Customer </span>Data
              </TabsTrigger>
              <TabsTrigger value="stock-movements" className="text-xs sm:text-sm whitespace-nowrap">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Stock </span>Imports
              </TabsTrigger>
              <TabsTrigger value="sellers" className="text-xs sm:text-sm whitespace-nowrap">
                <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sellers </span>Log
              </TabsTrigger>
              {!isSeller && (
                <TabsTrigger value="analytics" className="text-xs sm:text-sm whitespace-nowrap">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">System </span>Analytics
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab 1: Sales Overview */}
          <TabsContent value="sales" className="space-y-6">
            {/* Date Filter Controls */}
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex gap-2">
                    <Button
                      variant={dateFilterMode === 'last30days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilterMode('last30days')}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Last 30 Days
                    </Button>
                    <Button
                      variant={dateFilterMode === 'month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilterMode('month')}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      By Month
                    </Button>
                  </div>
                  
                  {dateFilterMode === 'month' && (
                    <div className="flex gap-2">
                      <Select
                        value={selectedMonth.toString()}
                        onValueChange={(value) => setSelectedMonth(parseInt(value))}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2023, 2024, 2025, 2026].map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">AED {totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {getDateRangeLabel()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalItemsSold}</div>
                  <p className="text-xs text-muted-foreground">
                    Total units
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <History className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    Total sales
                  </p>
                </CardContent>
              </Card>
            </div>
            <SalesLogTable 
              refreshTrigger={refreshTrigger}
              onSalesChange={handleSalesChange}
            />
          </TabsContent>

          {/* Tab 2: Customer Data */}
          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Customer Database</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage customer information and purchase history
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Input
                        placeholder="Search customers..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="w-full sm:w-[250px]"
                      />
                    </div>
                    <Select value={customerFilter} onValueChange={setCustomerFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="recent">Recent (30 days)</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>TRN</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No customers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.mobile}</TableCell>
                            <TableCell>
                              <Badge variant={customer.type === 'corporate' ? 'default' : 'secondary'}>
                                {customer.type || 'individual'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{customer.trn || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{customer.address || '-'}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(customer.created_at), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(customer)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                {isAdmin && !customer.id.toString().startsWith('sale-') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteCustomer(customer.id, customer.name)}
                                    className="text-red-600"
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Customer Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-mobile">Mobile</Label>
                    <Input
                      id="edit-mobile"
                      value={editForm.mobile}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-type">Type</Label>
                    <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-trn">TRN (Optional)</Label>
                    <Input
                      id="edit-trn"
                      value={editForm.trn}
                      onChange={(e) => setEditForm({ ...editForm, trn: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-address">Address (Optional)</Label>
                    <Input
                      id="edit-address"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
                    <Button onClick={saveCustomerEdit}>Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Tab 3: Stock Movements */}
          <TabsContent value="stock-movements" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Stock Movement History
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track all stock imports and increases for inventory auditing
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={exportStockMovements}
                      disabled={filteredMovements.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      onClick={fetchStockMovements}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input
                    placeholder="Search by product name..."
                    value={movementSearchTerm}
                    onChange={(e) => setMovementSearchTerm(e.target.value)}
                    className="sm:w-[300px]"
                  />
                  <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                    <SelectTrigger className="sm:w-[180px]">
                      <SelectValue placeholder="Movement Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="csv_import">CSV Import</SelectItem>
                      <SelectItem value="manual_add">Manual Add</SelectItem>
                      <SelectItem value="edit">Product Edit</SelectItem>
                      <SelectItem value="import">Import</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={movementDateFilter} onValueChange={setMovementDateFilter}>
                    <SelectTrigger className="sm:w-[180px]">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{filteredMovements.length}</div>
                      <p className="text-xs text-muted-foreground">Import records</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Units Added</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {filteredMovements.reduce((sum, m) => sum + m.quantity_added, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Total stock increase</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Set(filteredMovements.map(m => m.product_id)).size}
                      </div>
                      <p className="text-xs text-muted-foreground">Products restocked</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Stock Movements Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-center">Imported Qty</TableHead>
                        <TableHead className="text-center">Previous → New</TableHead>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Movement Type</TableHead>
                        <TableHead>Imported By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            {movementSearchTerm || movementTypeFilter !== 'all' || movementDateFilter !== 'all' 
                              ? 'No stock movements match your filters' 
                              : 'No stock movements recorded yet'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMovements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="font-medium">{movement.product_name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default" className="bg-green-600">
                                +{movement.quantity_added} pcs
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono text-sm">
                              {movement.previous_stock} → {movement.new_stock}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(movement.created_at), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {movement.movement_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.created_by}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {movement.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Sellers Log */}
          <TabsContent value="sellers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seller Performance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track individual seller statistics and performance metrics
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seller Name</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Items Sold</TableHead>
                        <TableHead className="text-right">Avg Sale Value</TableHead>
                        <TableHead className="text-right">Undo Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellerStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No seller data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        sellerStats.map((stat) => (
                          <TableRow key={stat.seller_name}>
                            <TableCell className="font-medium">{stat.seller_name}</TableCell>
                            <TableCell className="text-right">{stat.total_sales}</TableCell>
                            <TableCell className="text-right font-semibold">
                              AED {stat.total_revenue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{stat.total_items}</TableCell>
                            <TableCell className="text-right">
                              AED {stat.avg_sale_value.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={stat.undo_count > 0 ? 'destructive' : 'secondary'}>
                                {stat.undo_count}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Seller Comparison Chart */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performers by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sellerStats.slice(0, 5).map((stat, index) => (
                      <div key={stat.seller_name} className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{stat.seller_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {stat.total_sales} sales
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">AED {stat.total_revenue.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Seller Activity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Total Sellers</span>
                      <span className="text-lg font-bold">{sellerStats.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Total Sales</span>
                      <span className="text-lg font-bold">
                        {sellerStats.reduce((sum, s) => sum + s.total_sales, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Total Revenue</span>
                      <span className="text-lg font-bold">
                        AED {sellerStats.reduce((sum, s) => sum + s.total_revenue, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Total Undos</span>
                      <span className="text-lg font-bold">
                        {sellerStats.reduce((sum, s) => sum + s.undo_count, 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 4: System Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Undo Logs & Invoice Edit Logs Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Undo Logs & Audit Trail</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Complete history of undone transactions and invoice edits
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      fetchUndoLogs();
                      fetchInvoiceEditLogs();
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="undo" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="undo">
                      <Undo2 className="h-4 w-4 mr-2" />
                      Undo Logs ({undoLogs.length})
                    </TabsTrigger>
                    <TabsTrigger value="edits">
                      <Edit className="h-4 w-4 mr-2" />
                      Invoice Edits ({invoiceEditLogs.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Undo Logs Tab */}
                  <TabsContent value="undo">
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Undone Date</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Undone By</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {undoLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                                <div className="space-y-4">
                                  <div className="text-6xl opacity-20"></div>
                                  <div>
                                    <p className="text-lg font-medium mb-2">No undo logs found</p>
                                    <div className="space-y-1 text-sm">
                                      <p>To see undo logs here, follow these steps:</p>
                                      <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                                        <li>Go to the <strong>Sales page</strong></li>
                                        <li>Make a sale transaction</li>
                                        <li>Find the transaction in the sales log</li>
                                        <li>Click the <strong>"Undo Sale"</strong> button (last 3 transactions only)</li>
                                      </ol>
                                    </div>
                                    <p className="text-xs text-primary/70 mt-3">Only the last 3 transactions can be undone for safety</p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            undoLogs.slice(0, 50).map((log) => (
                              <TableRow key={log.id} className="hover:bg-muted/50">
                                <TableCell className="whitespace-nowrap">
                                  <div>
                                    <div className="font-medium">
                                      {log.undone_at ? format(new Date(log.undone_at), "MMM dd, yyyy") : "Unknown"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {log.undone_at ? format(new Date(log.undone_at), "HH:mm") : "--:--"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {log.sale_data?.product_name || "Unknown Product"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      UPC: {log.sale_data?.upc || "N/A"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {log.sale_data?.seller_name || "Unknown"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-mono">{log.sale_data?.quantity || 0}</span>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  <span className="font-mono">
                                    AED {(log.sale_data?.total || 0).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="truncate" title={log.reason || ""}>
                                    {log.reason || "No reason provided"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div className="font-medium">
                                    {log.undone_by || "Unknown User"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-300">
                                      Logged
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUndoLog(log);
                                      setIsUndoDetailsModalOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Invoice Edit Logs Tab */}
                  <TabsContent value="edits">
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Edited Date</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Edited By</TableHead>
                            <TableHead>Changes</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceEditLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                <div className="space-y-4">
                                  <div className="text-6xl opacity-20"></div>
                                  <div>
                                    <p className="text-lg font-medium mb-2">No invoice edit logs found</p>
                                    <p className="text-sm text-muted-foreground">
                                      Invoice edit logs will appear here when invoices are edited
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            invoiceEditLogs.slice(0, 50).map((log) => (
                              <TableRow key={log.id} className="hover:bg-muted/50">
                                <TableCell className="whitespace-nowrap">
                                  <div>
                                    <div className="font-medium">
                                      {log.edited_at ? format(new Date(log.edited_at), "MMM dd, yyyy") : "Unknown"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {log.edited_at ? format(new Date(log.edited_at), "HH:mm") : "--:--"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-mono font-medium text-primary">
                                    {log.invoice_number || "N/A"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {log.edited_by || "Unknown User"}
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <div className="space-y-1">
                                    {Array.isArray(log.changes_summary) && log.changes_summary.length > 0 ? (
                                      log.changes_summary.slice(0, 3).map((change, idx) => (
                                        <div key={idx} className="text-xs text-muted-foreground truncate" title={change}>
                                          • {change}
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No changes recorded</span>
                                    )}
                                    {Array.isArray(log.changes_summary) && log.changes_summary.length > 3 && (
                                      <div className="text-xs text-primary font-medium">
                                        +{log.changes_summary.length - 3} more changes
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                    Edited
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Show edit details in a dialog
                                      const changesText = Array.isArray(log.changes_summary) 
                                        ? log.changes_summary.join('\n• ') 
                                        : 'No changes recorded';
                                      toast({
                                        title: `Invoice ${log.invoice_number} Edit Details`,
                                        description: `Edited by ${log.edited_by} on ${format(new Date(log.edited_at), "MMM dd, yyyy 'at' HH:mm")}\n\nChanges:\n• ${changesText}`,
                                      });
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Analytics Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Undos</CardTitle>
                  <Undo2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{undoLogs.length}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Invoice Edits</CardTitle>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invoiceEditLogs.length}</div>
                  <p className="text-xs text-muted-foreground">
                    All time edits
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Restored Inventory</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {undoLogs.filter(log => log.sale_data?.inventory_restored).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Successfully restored
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered customers
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Method Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const paymentMethods = filteredSales.reduce((acc, sale) => {
                      const method = sale.payment_method || 'cash';
                      if (!acc[method]) {
                        acc[method] = { count: 0, total: 0 };
                      }
                      acc[method].count += 1;
                      acc[method].total += sale.price * sale.quantity;
                      return acc;
                    }, {} as Record<string, { count: number; total: number }>);

                    return Object.entries(paymentMethods).map(([method, data]) => (
                      <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium capitalize">{method}</div>
                          <div className="text-sm text-muted-foreground">{data.count} transactions</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">AED {data.total.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            {((data.total / totalRevenue) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Undo Sale Details Modal */}
      <UndoSaleDetailsModal
        isOpen={isUndoDetailsModalOpen}
        onClose={() => {
          setIsUndoDetailsModalOpen(false);
          setSelectedUndoLog(null);
        }}
        undoLog={selectedUndoLog}
      />
    </div>
  );
}

export default Analytics;

