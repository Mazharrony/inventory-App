import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, Edit2, Save, X, Upload, Download, Trash2, AlertTriangle, BarChart3, TrendingUp, DollarSign, AlertCircle, RefreshCw } from "lucide-react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppHeader } from "@/components/AppHeader";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Tables, TablesInsert } from "@/integrations/types";
import { bulkUpdateProducts, ProductUpdateRow, BulkUpdateResult } from "@/utils/bulkUpdateProducts";
import { recordStockMovementSafe } from "@/utils/stockMovementTracker";
import { useAuth } from "@/contexts/SimpleAuthContext";
import InventoryPurchaseOrder from "@/components/InventoryPurchaseOrder";

type StockMovement = Tables<'stock_movements'>;

const MAX_PRODUCTS_FETCH = 5000;

export default function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Tables<'products'>[]>([]);
  const [productsTotal, setProductsTotal] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [upc, setUpc] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Omit<Tables<'products'>, 'price' | 'stock'> & { price: string | number, stock: string | number }>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("active");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    productId: string | null;
    productName: string;
    hasSales: boolean;
    upc: string;
    stock: number;
  }>({ open: false, productId: null, productName: "", hasSales: false, upc: "", stock: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Analytics state
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsLowStockFilter, setAnalyticsLowStockFilter] = useState(false);
  
  // Stock movements state
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [movementSearchTerm, setMovementSearchTerm] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [movementDateFilter, setMovementDateFilter] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'created_at'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination state for inventory table
  const [inventoryPage, setInventoryPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIdx = (inventoryPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredProducts, inventoryPage]);

  // Analytics calculations
  const inventoryAnalytics = useMemo(() => {
    const activeProducts = products.filter(p => p.is_active !== false);
    
    const totalProducts = activeProducts.length;
    const totalStockUnits = activeProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
    const estimatedValue = activeProducts.reduce((sum, p) => sum + (p.price * Math.max(0, p.stock)), 0);
    const lowStockCount = activeProducts.filter(p => p.stock > 0 && p.stock < 10).length;
    const outOfStockCount = activeProducts.filter(p => p.stock === 0).length;
    const negativeStockCount = activeProducts.filter(p => p.stock < 0).length;
    
    // Filter products for analytics table
    let analyticsProducts = [...activeProducts];
    
    if (analyticsSearch) {
      const searchLower = analyticsSearch.toLowerCase();
      analyticsProducts = analyticsProducts.filter(p =>
        (p.name?.toLowerCase() ?? '').includes(searchLower) ||
        (p.upc?.toLowerCase() ?? '').includes(searchLower)
      );
    }
    
    if (analyticsLowStockFilter) {
      analyticsProducts = analyticsProducts.filter(p => p.stock < 10);
    }
    
    // Sort by stock value (descending)
    analyticsProducts.sort((a, b) => (b.price * Math.max(0, b.stock)) - (a.price * Math.max(0, a.stock)));
    
    return {
      totalProducts,
      totalStockUnits,
      estimatedValue,
      lowStockCount,
      outOfStockCount,
      negativeStockCount,
      analyticsProducts,
    };
  }, [products, analyticsSearch, analyticsLowStockFilter]);

  // Pagination state for analytics table
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const analyticsItemsPerPage = 10;
  const analyticsTotalPages = Math.ceil(inventoryAnalytics.analyticsProducts.length / analyticsItemsPerPage);
  const paginatedAnalyticsProducts = useMemo(() => {
    const startIdx = (analyticsPage - 1) * analyticsItemsPerPage;
    return inventoryAnalytics.analyticsProducts.slice(startIdx, startIdx + analyticsItemsPerPage);
  }, [inventoryAnalytics.analyticsProducts, analyticsPage]);

  // Fallback demo products
  const demoProducts = [
    { id: 'demo-1', name: 'Demo Whey Protein', upc: '00001', price: 99, stock: 20, is_active: true },
    { id: 'demo-2', name: 'Demo Creatine', upc: '00002', price: 49, stock: 15, is_active: true },
    { id: 'demo-3', name: 'Demo Multivitamin', upc: '00003', price: 29, stock: 30, is_active: true },
  ];
  const [showDemoWarning, setShowDemoWarning] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStockMovements();
  }, [stockFilter, activeFilter, searchTerm]);

  // Reset inventory page when filters/search change to avoid empty pages after narrowing results
  useEffect(() => {
    setInventoryPage(1);
  }, [stockFilter, activeFilter, searchTerm]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, stockFilter, activeFilter, sortBy, sortDir]);
  
  // Reset analytics page when search or filters change
  useEffect(() => {
    setAnalyticsPage(1);
  }, [analyticsSearch, analyticsLowStockFilter]);

  // Helper function to generate pagination buttons
  const renderAnalyticsPagination = () => {
    if (inventoryAnalytics.analyticsProducts.length <= analyticsItemsPerPage) {
      return null;
    }

    const pages = [];
    let startPage = 1;
    let endPage = analyticsTotalPages;

    if (analyticsTotalPages > 4) {
      if (analyticsPage <= 2) {
        startPage = 1;
        endPage = 4;
      } else if (analyticsPage >= analyticsTotalPages - 1) {
        startPage = analyticsTotalPages - 3;
        endPage = analyticsTotalPages;
      } else {
        startPage = analyticsPage - 1;
        endPage = analyticsPage + 2;
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      pages.push(
        <li key={page}>
          <button
            className={`px-3 py-1 rounded-md border ${
              analyticsPage === page
                ? 'bg-primary text-white font-bold shadow'
                : 'bg-background text-foreground hover:bg-muted'
            } transition-all`}
            onClick={() => setAnalyticsPage(page)}
            aria-current={analyticsPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        </li>
      );
    }

    return (
      <div className="w-full mt-4">
        <div
          className="flex flex-wrap md:justify-end justify-center items-center gap-2 md:gap-2 px-2 py-2"
          style={{ minHeight: '48px' }}
        >
          <nav aria-label="Analytics pagination" className="w-full md:w-auto">
            <ul className="inline-flex flex-wrap items-center space-x-1 text-sm w-full md:w-auto justify-center md:justify-end">
              {analyticsPage > 1 && (
                <li>
                  <button
                    className="px-3 py-1 rounded-md border bg-background text-foreground hover:bg-muted transition-all"
                    onClick={() => setAnalyticsPage(analyticsPage - 1)}
                  >
                    Prev
                  </button>
                </li>
              )}
              {pages}
              {analyticsPage < analyticsTotalPages && (
                <li>
                  <button
                    className="px-3 py-1 rounded-md border bg-background text-foreground hover:bg-muted transition-all"
                    onClick={() => setAnalyticsPage(analyticsPage + 1)}
                  >
                    Next
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    );
  };
  
  // Filter stock movements based on search and filters
  useEffect(() => {
    let filtered = stockMovements;

    // Search by product name
    if (movementSearchTerm) {
      filtered = filtered.filter(movement =>
        movement.product_name.toLowerCase().includes(movementSearchTerm.toLowerCase())
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

  async function fetchProducts() {
    // Build base query with all filters (reused for both queries)
    let baseQuery = supabase
      .from("products")
      .select("*", { count: "exact" });

    // Apply search filter at DB level
    if (searchTerm && searchTerm.trim()) {
      const searchPattern = `%${searchTerm.trim()}%`;
      baseQuery = baseQuery.or(`name.ilike.${searchPattern},upc.ilike.${searchPattern}`);
    }

    // Apply stock filter at DB level
    if (stockFilter === "low") {
      // Low stock: 1 to 9 (exclusive upper bound)
      baseQuery = baseQuery.lt("stock", 10).gte("stock", 1);
    } else if (stockFilter === "out") {
      baseQuery = baseQuery.eq("stock", 0);
    } else if (stockFilter === "negative") {
      baseQuery = baseQuery.lt("stock", 0);
    }

    // Apply active filter at DB level
    if (activeFilter === "active") {
      // Treat null as active (matches previous client logic p.is_active !== false)
      baseQuery = baseQuery.or("is_active.is.null,is_active.eq.true");
    } else if (activeFilter === "inactive") {
      baseQuery = baseQuery.eq("is_active", false);
    }

    // Query 1: Get EXACT count only (no 1000-row limit)
    let countQuery = supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // Apply same filters to count query
    if (searchTerm && searchTerm.trim()) {
      const searchPattern = `%${searchTerm.trim()}%`;
      countQuery = countQuery.or(`name.ilike.${searchPattern},upc.ilike.${searchPattern}`);
    }
    if (stockFilter === "low") {
      // Low stock: 1 to 9 (exclusive upper bound)
      countQuery = countQuery.lt("stock", 10).gte("stock", 1);
    } else if (stockFilter === "out") {
      countQuery = countQuery.eq("stock", 0);
    } else if (stockFilter === "negative") {
      countQuery = countQuery.lt("stock", 0);
    }
    if (activeFilter === "active") {
      // Treat null as active to keep parity with client-side logic
      countQuery = countQuery.or("is_active.is.null,is_active.eq.true");
    } else if (activeFilter === "inactive") {
      countQuery = countQuery.eq("is_active", false);
    }

    const { count: exactCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting products:', countError.message);
    }

    console.log('DEBUG: exactCount =', exactCount, 'stockFilter =', stockFilter, 'activeFilter =', activeFilter, 'searchTerm =', searchTerm);

    // Query 2: Get page data (limited to MAX_PRODUCTS_FETCH rows)
    const { data, error } = await baseQuery
      .order("created_at", { ascending: false })
      .range(0, MAX_PRODUCTS_FETCH - 1);

    if (error) {
      console.error('Error fetching products:', error.message);
      toast({ title: "Error loading products", description: error.message, variant: "destructive" });
      setProducts(demoProducts);
      setProductsTotal(demoProducts.length);
      setShowDemoWarning(true);
      return;
    }

    const productsData = (data as unknown as Tables<'products'>[]) || [];
    setProducts(productsData);
    
    // Use exact count from count-only query; if undefined, use data length as fallback
    const finalCount = exactCount !== null && exactCount !== undefined ? exactCount : productsData.length;
    setProductsTotal(finalCount);
    console.log('DEBUG: Setting productsTotal to', finalCount);
    setShowDemoWarning(false);

    if ((exactCount ?? productsData.length) === 0) {
      setProducts(demoProducts);
      setProductsTotal(demoProducts.length);
      setShowDemoWarning(true);
      return;
    }

    if ((exactCount ?? productsData.length) > MAX_PRODUCTS_FETCH) {
      toast({
        title: `Showing first ${MAX_PRODUCTS_FETCH.toLocaleString()} products`,
        description: `You have ${(exactCount ?? productsData.length).toLocaleString()} products. Use search to narrow results.`,
      });
    }
  }
  
  async function fetchStockMovements() {
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
  }

  // Get search suggestions based on current input
  const getSearchSuggestions = () => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const suggestions = new Set<string>();
    const searchLower = searchTerm.toLowerCase();
    
    products.forEach((product) => {
      const words = product.name.toLowerCase().split(/\s+/);
      words.forEach((word: string) => {
        if (word.startsWith(searchLower) && word !== searchLower) {
          suggestions.add(word);
        }
      });
      
      // Add full product names that contain the search term
      if (product.name.toLowerCase().includes(searchLower) && 
          !product.name.toLowerCase().startsWith(searchLower)) {
        suggestions.add(product.name);
      }
    });
    
    return Array.from(suggestions).slice(0, 5); // Limit to 5 suggestions
  };

  // Helper function for fuzzy matching and common abbreviations
  const checkFuzzyMatch = (productName: string, searchTerm: string) => {
    // Common brand abbreviations and variations
    const brandMappings: { [key: string]: string[] } = {
      'muscle': ['mu', 'mus', 'musc'],
      'rulz': ['ru', 'rul', 'rules', 'rule'],
      'protein': ['pro', 'prot', 'prtn'],
      'whey': ['wh', 'why'],
      'creatine': ['cre', 'creat', 'cr'],
      'vitamin': ['vit', 'vita', 'v'],
      'nutrition': ['nut', 'nutr', 'n'],
      'supplement': ['sup', 'supp', 's'],
      'amino': ['am', 'amin', 'aa'],
      'bcaa': ['bc', 'bca', 'branched']
    };
    
    // Check if search term matches any abbreviation
    for (const [fullWord, abbreviations] of Object.entries(brandMappings)) {
      if (abbreviations.includes(searchTerm) && productName.includes(fullWord)) {
        console.log(`Fuzzy match: "${searchTerm}" → "${fullWord}" in "${productName}"`);
        return true;
      }
    }
    
    // Check if search term is a prefix of any word in product name
    const words = productName.split(/\s+/);
    const prefixMatch = words.some(word => word.startsWith(searchTerm) && searchTerm.length >= 2);
    
    if (prefixMatch) {
      console.log(`Prefix match: "${searchTerm}" starts word in "${productName}"`);
    }
    
    return prefixMatch;
  };

  function filterProducts() {
    // All filtering happens at DB level; apply client-side sorting for display
    let sorted = [...products];

    sorted.sort((a, b) => {
      if (sortBy === 'name') {
        return sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortBy === 'price') {
        return sortDir === 'asc' ? a.price - b.price : b.price - a.price;
      }
      if (sortBy === 'stock') {
        return sortDir === 'asc' ? a.stock - b.stock : b.stock - a.stock;
      }
      if (sortBy === 'created_at') {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
      }
      return 0;
    });

    setFilteredProducts(sorted);
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !upc.trim() || !price || !stock) return;
    
    // Check if product with same UPC already exists
    const existingProduct = products.find((p) => p.upc === upc.trim());
    
    if (existingProduct) {
      // Product exists, ask user if they want to add to existing stock
      const addToExisting = window.confirm(
        `A product with UPC ${upc.trim()} already exists: "${existingProduct.name}"\n\n` +
        `Current stock: ${existingProduct.stock}\n` +
        `Would you like to add ${stock} units to the existing stock instead of creating a duplicate?`
      );
      
      if (addToExisting) {
        const newStock = existingProduct.stock + parseInt(stock, 10);
        let settlementMessage = "";
        
        // Check for negative inventory settlement
        if (existingProduct.stock < 0) {
          const negativeAmount = Math.abs(existingProduct.stock);
          const stockIncrease = parseInt(stock, 10);
          const settledAmount = Math.min(stockIncrease, negativeAmount);
          
          if (settledAmount === negativeAmount) {
            if (stockIncrease > negativeAmount) {
              settlementMessage = ` (Settled ${negativeAmount} units of negative inventory, ${stockIncrease - negativeAmount} new units added)`;
            } else {
              settlementMessage = ` (Fully settled negative inventory)`;
            }
          } else {
            settlementMessage = ` (Partially settled negative inventory: ${settledAmount} units)`;
          }
        }
        
        const { error } = await supabase.from("products").update({
          stock: newStock,
          price: parseFloat(price), // Update price too in case it changed
          updated_at: new Date().toISOString(),
        } as any).eq("id" as any, existingProduct.id as any);
        
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          // Track stock movement (non-blocking)
          await recordStockMovementSafe({
            productId: existingProduct.id,
            productName: existingProduct.name,
            previousStock: existingProduct.stock,
            newStock: newStock,
            movementType: 'manual_add',
            createdBy: user?.username || user?.id || 'unknown',
            notes: 'Stock added via manual product entry form',
          });
          
          setName(""); setUpc(""); setPrice(""); setStock("");
          fetchProducts();
          fetchStockMovements(); // Refresh stock movements to show new import
          toast({ 
            title: "Stock updated", 
            description: `Added ${stock} units to existing product${settlementMessage}` 
          });
        }
        return;
      }
    }
    
    // Create new product
    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      upc: upc.trim(),
      price: parseFloat(price),
      stock: parseInt(stock),
    } as any);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setName(""); setUpc(""); setPrice(""); setStock("");
      fetchProducts();
      toast({ title: "Product added" });
    }
  }

  async function deactivateProduct(id: string) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    // Check if product has any sales
    const { data: salesData, error: salesCheckError } = await supabase
      .from("sales")
      .select("id")
      .eq("product_id" as never, id as never)
      .limit(1);
    
    if (salesCheckError) {
      console.error("Sales check error:", salesCheckError);
    }
    
    const hasSales = salesData && salesData.length > 0;
    
    // Open dialog instead of confirm
    setDeactivateDialog({
      open: true,
      productId: id,
      productName: product.name,
      hasSales,
      upc: product.upc,
      stock: product.stock
    });
  }
  
  async function confirmDeactivate() {
    const { productId, productName, hasSales } = deactivateDialog;
    if (!productId) return;
    
    setDeactivateDialog({ ...deactivateDialog, open: false });
    
    if (hasSales) {
      // Deactivate instead of delete
      const { error } = await supabase
        .from("products")
        .update({ is_active: false } as never)
        .eq("id" as never, productId as never);
        
      if (error) {
        console.error("Deactivate error:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await fetchProducts();
        toast({ 
          title: "Product Deactivated", 
          description: `${productName} has been moved to Inactive Products` 
        });
      }
    } else {
      // Permanently delete if no sales
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id" as never, productId as never);
        
      if (error) {
        console.error("Delete error:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await fetchProducts();
        toast({ 
          title: "Product Deleted", 
          description: `${productName} has been permanently removed` 
        });
      }
    }
  }

  async function reactivateProduct(id: string) {
    const product = products.find(p => p.id === id);
    
    const { error } = await supabase
      .from("products")
      .update({ is_active: true } as never)
      .eq("id" as never, id as never);
      
    if (error) {
      console.error("Reactivate error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await fetchProducts();
      toast({ 
        title: "Product Reactivated", 
        description: `${product?.name} is now active again` 
      });
    }
  }

  function startEdit(product: Tables<'products'>) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      upc: product.upc,
      price: product.price,
      stock: product.stock,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editForm.name?.trim() || !editForm.upc?.trim() || !editForm.price || !editForm.stock) return;
    
    const originalProduct = products.find((p) => p.id === editingId);
    const newStock = typeof editForm.stock === 'string' ? parseInt(editForm.stock, 10) : editForm.stock;
    const newPrice = typeof editForm.price === 'string' ? parseFloat(editForm.price) : editForm.price;
    const oldStock = originalProduct?.stock || 0;
    
    // Check if we're increasing stock and if there was negative inventory
    const stockIncrease = newStock - oldStock;
    let settlementMessage = "";
    
    if (stockIncrease > 0 && oldStock < 0) {
      // We're adding stock to a negative inventory
      const negativeAmount = Math.abs(oldStock);
      const settledAmount = Math.min(stockIncrease, negativeAmount);
      
      settlementMessage = ` (Settled ${settledAmount} units of negative inventory)`;
      
      if (settledAmount === negativeAmount) {
        // Fully settled the negative inventory
        if (stockIncrease > negativeAmount) {
          settlementMessage = ` (Fully settled negative inventory, ${stockIncrease - negativeAmount} new units added)`;
        } else {
          settlementMessage = ` (Fully settled negative inventory)`;
        }
      }
    }
    
    const { error } = await supabase.from("products").update({
      name: editForm.name.trim(),
      upc: editForm.upc.trim(),
      price: newPrice,
      stock: newStock,
    } as any).eq("id" as any, editingId as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Track stock movement if stock increased (non-blocking)
      if (stockIncrease > 0 && originalProduct) {
        await recordStockMovementSafe({
          productId: originalProduct.id,
          productName: editForm.name.trim(),
          previousStock: oldStock,
          newStock: newStock,
          movementType: 'edit',
          createdBy: user?.username || user?.id || 'unknown',
          notes: 'Stock updated via product edit form',
        });
        fetchStockMovements(); // Refresh stock movements to show new import
      }
      
      setEditingId(null);
      setEditForm({});
      fetchProducts();
      toast({ 
        title: "Product updated", 
        description: `Stock updated successfully${settlementMessage}` 
      });
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const clearFileInput = () => {
    setImportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['name', 'upc', 'price', 'stock'],
      ['Sample Product', '1234567890123', '25.99', '100'],
      ['Another Product', '9876543210987', '15.50', '50']
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(template);
    
    // Add a note
    XLSX.utils.sheet_add_aoa(ws, [['NOTE: Product Name is used to match existing products. You can update UPC, price, and stock for products with matching names.']], { origin: 'A5' });
    
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
    XLSX.writeFile(wb, "inventory_template.xlsx");
    
    toast({
      title: "Template Downloaded",
      description: "Product Name identifies products. Update UPC, price, stock by matching names."
    });
  };

  const processImportFile = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    
    try {
      let data: unknown[] = [];
      
      if (importFile.name.endsWith('.csv')) {
        // Parse CSV
        const text = await importFile.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data;
      } else if (importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls')) {
        // Parse Excel
        const arrayBuffer = await importFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }
      
      console.log('Parsed data:', data);
      console.log('Total rows:', data.length);
      
      if (data.length === 0) {
        toast({
          title: "Empty File",
          description: "The uploaded file contains no data.",
          variant: "destructive"
        });
        return;
      }

      // Normalize column names (handle various naming conventions)
      const normalizedData = data.map((row: any) => {
        const normalized: Record<string, unknown> = {};
        
        for (const [key, value] of Object.entries(row)) {
          const lowerKey = key.toLowerCase().trim();
          
          // Map various column name variations to standard names
          if (['id', 'product_id'].includes(lowerKey)) {
            normalized.id = value;
          } else if (['name', 'product_name', 'product name'].includes(lowerKey)) {
            normalized.name = value;
          } else if (['upc', 'barcode', 'sku'].includes(lowerKey)) {
            normalized.upc = value;
          } else if (['price'].includes(lowerKey)) {
            normalized.price = value;
          } else if (['stock', 'quantity', 'qty'].includes(lowerKey)) {
            normalized.stock = value;
          } else {
            // Keep original key for unknown columns
            normalized[key] = value;
          }
        }
        
        return normalized;
      });

      // Detect mode: UPDATE if all rows have 'name' column, otherwise INSERT
      const hasNameColumn = normalizedData.every(row => row.name !== undefined && row.name !== null && row.name !== '');
      
      const isUpdateMode = hasNameColumn;
      
      console.log('Import mode detection:', { 
        hasNameColumn, 
        isUpdateMode,
        firstRow: normalizedData[0]
      });

      if (isUpdateMode) {
        // BULK UPDATE MODE - Only update existing products
        console.log('Running BULK UPDATE mode');
        
        // Always use 'name' as the identifier for bulk updates
        // This allows changing UPCs while matching products by name
        const identifierField = 'name' as const;
        
        const result: BulkUpdateResult = await bulkUpdateProducts(
          normalizedData as ProductUpdateRow[],
          {
            identifierField,
            updatableFields: ['upc', 'price', 'stock'],
            validateConstraints: true,
            skipMissingIdentifier: true,
            currentUser: user?.username || user?.id || 'unknown', // Add current user for stock tracking
          }
        );

        console.log('Bulk update result:', result);

        // Display detailed toast with results
        if (result.success) {
          toast({
            title: "Bulk Update Successful",
            description: `Updated ${result.updatedCount} products. ${result.skippedCount > 0 ? `Skipped ${result.skippedCount} rows.` : ''} ${result.notFoundIds.length > 0 ? `${result.notFoundIds.length} products not found.` : ''}`,
          });
        } else {
          toast({
            title: "Bulk Update Completed with Issues",
            description: `Updated ${result.updatedCount} products, but ${result.errorCount} failed. Check console for details.`,
            variant: "destructive"
          });
        }

        // Log detailed results to console for review
        if (result.skippedRows.length > 0) {
          console.warn('Skipped rows:', result.skippedRows);
        }
        if (result.notFoundIds.length > 0) {
          console.warn('Products not found:', result.notFoundIds);
        }
        if (result.validationErrors.length > 0) {
          console.error('Validation errors:', result.validationErrors);
        }
        
        // Refresh product list and stock movements
        fetchProducts();
        fetchStockMovements(); // Refresh stock movements to show imports from CSV
        clearFileInput();
        
      } else {
        // INSERT MODE - Legacy behavior for new products
        console.log('Running INSERT mode (creating new products)');
        
        const validProducts = [];
        const errors = [];
        
        for (let i = 0; i < normalizedData.length; i++) {
          const row = normalizedData[i];
          const rowNum = i + 2;

          const name = row.name;
          const upc = row.upc;
          const price = row.price;
          const stock = row.stock;

          // Require name, price, stock for insert
          if (!name || !price || stock === undefined) {
            const missingFields = [];
            if (!name) missingFields.push('name');
            if (!price) missingFields.push('price');
            if (stock === undefined) missingFields.push('stock');
            
            errors.push(`Row ${rowNum}: Missing required fields (${missingFields.join(', ')})`);
            continue;
          }

          const priceNum = parseFloat(price as string);
          const stockNum = parseInt(stock as string);

          if (isNaN(priceNum) || priceNum < 0) {
            errors.push(`Row ${rowNum}: Invalid price "${price}"`);
            continue;
          }

          if (isNaN(stockNum)) {
            errors.push(`Row ${rowNum}: Invalid stock "${stock}"`);
            continue;
          }

          const finalUpc = upc ? String(upc).trim() : `AUTO-${Date.now()}-${i}`;
          
          const validProduct = {
            name: String(name).trim(),
            upc: finalUpc,
            price: priceNum,
            stock: stockNum,
          };

          validProducts.push(validProduct);
        }
        
        if (errors.length > 0) {
          console.error("Import errors:", errors);
          toast({
            title: "Import Errors",
            description: `${errors.length} rows have errors. Check browser console (F12) for details.`,
            variant: "destructive"
          });
        }
        
        if (validProducts.length === 0) {
          toast({
            title: "No Valid Data",
            description: "No valid products found. Ensure your file has columns: name, price, stock (required). UPC is optional.",
            variant: "destructive"
          });
          return;
        }
        
        // Insert products into database
        const { error } = await supabase.from("products").insert(validProducts);
        
        if (error) {
          toast({
            title: "Database Error",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Import Successful",
            description: `Imported ${validProducts.length} new products${errors.length > 0 ? ` (${errors.length} rows skipped)` : ''}`
          });
          
          fetchProducts();
          clearFileInput();
        }
      }
      
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

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
      product_name: movement.product_name,
      quantity_added: movement.quantity_added,
      previous_stock: movement.previous_stock,
      new_stock: movement.new_stock,
      movement_type: movement.movement_type,
      created_by: movement.created_by,
      created_at: format(new Date(movement.created_at), 'yyyy-MM-dd HH:mm:ss'),
      notes: movement.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    const colWidths = [
      { wch: 30 }, // product_name
      { wch: 15 }, // quantity_added
      { wch: 15 }, // previous_stock
      { wch: 15 }, // new_stock
      { wch: 15 }, // movement_type
      { wch: 20 }, // created_by
      { wch: 20 }, // created_at
      { wch: 30 }  // notes
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `stock_movements_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} movements to ${filename}`
    });
  };
  
  const exportAnalytics = () => {
    if (inventoryAnalytics.analyticsProducts.length === 0) {
      toast({
        title: "No Data",
        description: "No products to export",
        variant: "destructive"
      });
      return;
    }

    const exportData = inventoryAnalytics.analyticsProducts.map(product => ({
      name: product.name,
      upc: product.upc,
      price: product.price,
      stock: product.stock,
      total_value: (product.price * Math.max(0, product.stock)).toFixed(2),
      stock_status: product.stock < 0 ? 'NEGATIVE' : product.stock === 0 ? 'OUT' : product.stock < 10 ? 'LOW' : 'OK',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    const colWidths = [
      { wch: 30 }, // name
      { wch: 15 }, // upc
      { wch: 10 }, // price
      { wch: 10 }, // stock
      { wch: 12 }, // total_value
      { wch: 12 }  // stock_status
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Inventory Analytics");
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `inventory_analytics_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} products to ${filename}`
    });
  };

  const exportInventory = () => {
    if (filteredProducts.length === 0) {
      toast({
        title: "No Data",
        description: "No products to export",
        variant: "destructive"
      });
      return;
    }

    // Prepare data for export
    const exportData = products.map(product => ({
      name: product.name,
      upc: product.upc,
      price: product.price,
      stock: product.stock,
      created_at: new Date(product.created_at).toLocaleDateString(),
      updated_at: new Date(product.updated_at).toLocaleDateString()
    }));

    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = [
      { wch: 30 }, // name
      { wch: 15 }, // upc
      { wch: 10 }, // price
      { wch: 10 }, // stock
      { wch: 12 }, // created_at
      { wch: 12 }  // updated_at
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `inventory_export_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} products to ${filename}`
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <AppHeader 
        title="JNK GENERAL TRADING LLC" 
        subtitle="Inventory Management" 
        icon={<Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />} 
      />

      {showDemoWarning && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 sm:p-4 mb-4 text-xs sm:text-sm mx-3 sm:mx-0">
          <strong>Warning:</strong> No products found in Supabase. Showing demo products. Please check your database connection and data.
        </div>
      )}

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
              <TabsTrigger value="inventory" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Inventory</span>
                <span className="sm:hidden">Stock</span>
              </TabsTrigger>
              <TabsTrigger value="purchase-order" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Purchase Order</span>
                <span className="sm:hidden">Order</span>
              </TabsTrigger>
              <TabsTrigger value="inventory-analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
            </TabsList>

            {/* INVENTORY TAB - Original Content */}
            <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
          {/* Deactivate/Delete Confirmation Dialog */}
          <AlertDialog open={deactivateDialog.open} onOpenChange={(open) => setDeactivateDialog(prev => ({ ...prev, open }))}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{deactivateDialog.hasSales ? "Deactivate Product" : "Delete Product"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {deactivateDialog.hasSales
                    ? `"${deactivateDialog.productName}" has sales history. It will be marked inactive instead of being deleted.`
                    : `"${deactivateDialog.productName}" has no sales. This action will permanently delete the product.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeactivateDialog(prev => ({ ...prev, open: false }))}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeactivate}>{deactivateDialog.hasSales ? "Deactivate" : "Delete"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Import Section */}
          <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 sm:p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1">
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    <strong>Insert new products:</strong> Upload with columns: name, price, stock (required), upc (optional)
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Update existing products:</strong> Product Name identifies products. Update UPC, price, or stock by matching names.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                  <Button
                    onClick={processImportFile}
                    disabled={!importFile || isImporting}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isImporting ? "Importing..." : "Import"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              {importFile && (
                <div className="mt-4 p-3 bg-secondary/50 border border-primary/20 rounded-md">
                  <p className="text-sm text-primary">
                    <strong>Selected file:</strong> {importFile.name} ({Math.round(importFile.size / 1024)} KB)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-bold text-center">Add New Inventory Item</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" onSubmit={addProduct}>
                <div className="lg:col-span-2 space-y-2">
                  <Label htmlFor="product-name">Product Name *</Label>
                  <Input 
                    id="product-name"
                    placeholder="Enter product name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-upc">UPC / Barcode *</Label>
                  <Input 
                    id="product-upc"
                    placeholder="Scan or type UPC" 
                    value={upc} 
                    onChange={e => setUpc(e.target.value)} 
                    required 
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-price">Price (AED) *</Label>
                  <Input 
                    id="product-price"
                    placeholder="0.00" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-stock">Stock Quantity *</Label>
                  <Input 
                    id="product-stock"
                    placeholder="0" 
                    type="number" 
                    min="0" 
                    value={stock} 
                    onChange={e => setStock(e.target.value)} 
                    required 
                  />
                </div>
                <div className="lg:col-span-3 flex items-end">
                  <Button type="submit" className="w-full">
                    Add to Inventory
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl">
                  {(() => {
                    const totalCount = productsTotal ?? filteredProducts.length ?? 0;
                    const totalDisplay = totalCount.toLocaleString();
                    const start = filteredProducts.length === 0 ? 0 : (inventoryPage - 1) * itemsPerPage + 1;
                    const end = filteredProducts.length === 0 ? 0 : start + paginatedProducts.length - 1;
                    return (
                      <>Inventory (Items {start.toLocaleString()}–{end.toLocaleString()} of {totalDisplay}{searchTerm ? <span className="text-sm font-normal text-muted-foreground ml-2">— searching for "{searchTerm}"</span> : null})</>
                    );
                  })()}
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative">
                    <Input
                      placeholder="Search by name, keywords, or UPC..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full sm:w-72"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Search Suggestions Dropdown */}
                    {searchTerm && searchTerm.length >= 2 && getSearchSuggestions().length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {getSearchSuggestions().map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                            onClick={() => setSearchTerm(suggestion)}
                          >
                            <span className="text-gray-600"></span>
                            <span className="font-medium">{suggestion}</span>
                          </div>
                        ))}
                        <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50">
                          💡 Tip: Try "mu" for Muscle, "pro" for Protein
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Stock Filter Dropdown - Compact */}
                  <select 
                    value={stockFilter} 
                    onChange={e => setStockFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background text-sm min-w-[140px]"
                  >
                    <option value="all">All</option>
                    <option value="negative">Negative</option>
                    <option value="out">Out of Stock</option>
                    <option value="low">Low Stock</option>
                  </select>
                  
                  <select 
                    value={activeFilter} 
                    onChange={e => setActiveFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background text-sm min-w-[120px]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="all">All</option>
                  </select>

                  <select
                    value={`${sortBy}-${sortDir}`}
                    onChange={e => {
                      const [field, dir] = e.target.value.split('-');
                      setSortBy(field as any);
                      setSortDir(dir as any);
                    }}
                    className="px-3 py-2 border rounded-md bg-background text-sm min-w-[160px]"
                  >
                    <option value="name-asc">Name A → Z</option>
                    <option value="name-desc">Name Z → A</option>
                    <option value="stock-desc">Stock High → Low</option>
                    <option value="stock-asc">Stock Low → High</option>
                    <option value="price-asc">Price Low → High</option>
                    <option value="price-desc">Price High → Low</option>
                    <option value="created_at-desc">Newest First</option>
                    <option value="created_at-asc">Oldest First</option>
                  </select>
                  <Button
                    variant="outline"
                    onClick={exportInventory}
                    className="flex items-center gap-2"
                    disabled={filteredProducts.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {searchTerm && filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-4">
                    No products match your search for "{searchTerm}"
                  </p>
                  <div className="text-sm text-muted-foreground mb-4">
                    <p className="mb-2">Try these search examples:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>"mu"</strong> → finds Muscle Rulz, Muscletech</li>
                      <li><strong>"pro"</strong> → finds Protein products</li>
                      <li><strong>"wh"</strong> → finds Whey products</li>
                      <li><strong>UPC codes</strong> → exact product match</li>
                      <li><strong>Brand names</strong> → full or partial</li>
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm("")}
                    className="mt-2"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold">UPC</TableHead>
                  <TableHead className="font-semibold">Price (AED)</TableHead>
                  <TableHead className="font-semibold">Stock</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm || stockFilter !== "all" ? "No products match your filters" : "No inventory items yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((p) => (
                    <TableRow key={p.id} className={
                      p.is_active === false ? "bg-gray-100 opacity-60" :
                      p.stock < 0 ? "bg-red-100 border-red-200" : 
                      p.stock === 0 ? "bg-red-50" : 
                      p.stock < 10 ? "bg-yellow-50" : ""
                    }>
                      <TableCell className="font-medium">
                        {editingId === p.id ? (
                          <Input 
                            value={editForm.name || ""} 
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="min-w-[200px]"
                          />
                        ) : (
                          <div>
                            <div className="font-medium">
                              {p.name}
                              {p.is_active === false && <Badge variant="outline" className="ml-2 bg-gray-200">INACTIVE</Badge>}
                            </div>
                            {p.stock < 0 && <div className="text-xs text-red-700 font-bold">NEGATIVE INVENTORY ({p.stock})</div>}
                            {p.stock === 0 && <div className="text-xs text-red-600 font-medium">OUT OF STOCK</div>}
                            {p.stock > 0 && p.stock < 10 && <div className="text-xs text-yellow-600 font-medium">LOW STOCK</div>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === p.id ? (
                          <Input 
                            value={editForm.upc || ""} 
                            onChange={e => setEditForm({...editForm, upc: e.target.value})}
                            className="min-w-[120px]"
                          />
                        ) : (
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{p.upc}</code>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === p.id ? (
                          <Input 
                            type="number"
                            step="0.01"
                            value={editForm.price || ""} 
                            onChange={e => setEditForm({...editForm, price: e.target.value})}
                            className="min-w-[100px]"
                          />
                        ) : (
                          <span className="font-semibold text-green-600">AED {p.price}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === p.id ? (
                          <Input 
                            type="number"
                            value={editForm.stock || ""} 
                            onChange={e => setEditForm({...editForm, stock: e.target.value})}
                            className="min-w-[80px]"
                          />
                        ) : (
                          <span className={`font-semibold ${
                            p.stock < 0 ? "text-red-700 bg-red-100 px-2 py-1 rounded" :
                            p.stock === 0 ? "text-red-600" : 
                            p.stock < 10 ? "text-yellow-600" : "text-primary/70"
                          }`}>
                            {p.stock < 0 ? `${p.stock} (NEGATIVE)` : p.stock}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          {editingId === p.id ? (
                            <>
                              <Button variant="default" size="sm" onClick={saveEdit}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {p.is_active === false ? (
                                <Button variant="default" size="sm" onClick={() => reactivateProduct(p.id)} title="Reactivate Product">
                                  <Package className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button variant="destructive" size="sm" onClick={() => deactivateProduct(p.id)} title="Delete/Deactivate Product">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
      {/* Pagination Controls - Responsive, Compact, Right-Aligned */}
      {filteredProducts.length > itemsPerPage && (
        <div className="w-full mt-4">
          <div
            className="flex flex-wrap md:justify-end justify-center items-center gap-2 md:gap-2 px-2 py-2"
            style={{ minHeight: '48px' }}
          >
            <nav aria-label="Inventory pagination" className="w-full md:w-auto">
              <ul className="inline-flex flex-wrap items-center space-x-1 text-sm w-full md:w-auto justify-center md:justify-end">
                {inventoryPage > 1 && (
                  <li>
                    <button
                      className="px-3 py-1 rounded-md border bg-background text-foreground hover:bg-muted transition-all"
                      onClick={() => setInventoryPage(inventoryPage - 1)}
                    >
                      Prev
                    </button>
                  </li>
                )}
                {/* Compact page number window logic */}
                {(() => {
                  let startPage = 1;
                  let endPage = totalPages;
                  if (totalPages > 4) {
                    if (inventoryPage <= 2) {
                      startPage = 1;
                      endPage = 4;
                    } else if (inventoryPage >= totalPages - 1) {
                      startPage = totalPages - 3;
                      endPage = totalPages;
                    } else {
                      startPage = inventoryPage - 1;
                      endPage = inventoryPage + 2;
                    }
                  }
                  const pages = [];
                  for (let page = startPage; page <= endPage; page++) {
                    pages.push(
                      <li key={page}>
                        <button
                          className={`px-3 py-1 rounded-md border ${inventoryPage === page ? 'bg-primary text-white font-bold shadow' : 'bg-background text-foreground hover:bg-muted'} transition-all`}
                          onClick={() => setInventoryPage(page)}
                          aria-current={inventoryPage === page ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      </li>
                    );
                  }
                  return pages;
                })()}
                {inventoryPage < totalPages && (
                  <li>
                    <button
                      className="px-3 py-1 rounded-md border bg-background text-foreground hover:bg-muted transition-all"
                      onClick={() => setInventoryPage(inventoryPage + 1)}
                    >
                      Next
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      )}
                </div>
              )}
            </CardContent>
      </Card>
            </TabsContent>

            {/* PURCHASE ORDER TAB */}
            <TabsContent value="purchase-order" className="space-y-6">
              <InventoryPurchaseOrder 
                onOrderComplete={() => {
                  fetchProducts();
                  fetchStockMovements();
                }}
              />
            </TabsContent>

            {/* INVENTORY ANALYTICS TAB */}
            <TabsContent value="inventory-analytics" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 h-32 flex flex-col">
                  <CardHeader className="p-0 flex-1">
                    <div className="flex items-center justify-between h-full">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1 font-medium">Total Products</p>
                        <p className="text-xl sm:text-2xl font-semibold text-foreground">{(productsTotal ?? inventoryAnalytics.totalProducts).toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-gradient-primary shadow-md flex-shrink-0 ml-4">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 mt-3 text-xs text-muted-foreground">
                    <p>Active products in inventory</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 h-32 flex flex-col">
                  <CardHeader className="p-0 flex-1">
                    <div className="flex items-center justify-between h-full">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1 font-medium">Total Stock Units</p>
                        <p className="text-xl sm:text-2xl font-semibold text-foreground">{inventoryAnalytics.totalStockUnits.toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md flex-shrink-0 ml-4">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 mt-3 text-xs text-muted-foreground">
                    <p>Units in stock</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 h-32 flex flex-col">
                  <CardHeader className="p-0 flex-1">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1 font-medium">Estimated Value</p>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground">AED {inventoryAnalytics.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 mt-3 text-xs text-muted-foreground">
                    <p>Total inventory value</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 h-32 flex flex-col">
                  <CardHeader className="p-0 flex-1">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1 font-medium">Stock Alerts</p>
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-yellow-600">{inventoryAnalytics.lowStockCount}{products.length < (productsTotal ?? products.length) ? '+' : ''} Low</div>
                        <div className="text-sm text-red-600">{inventoryAnalytics.outOfStockCount}{products.length < (productsTotal ?? products.length) ? '+' : ''} Out</div>
                        {inventoryAnalytics.negativeStockCount > 0 && (
                          <div className="text-sm text-red-700 font-bold">{inventoryAnalytics.negativeStockCount}{products.length < (productsTotal ?? products.length) ? '+' : ''} Negative</div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 mt-3 text-xs text-muted-foreground">
                    <p>Stock status alerts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Analytics Table */}
              <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift">
                <CardHeader className="border-b border-border px-6 py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-xl">
                      Product Analytics ({(productsTotal ?? inventoryAnalytics.analyticsProducts.length).toLocaleString()} products)
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="Search products..."
                        value={analyticsSearch}
                        onChange={e => setAnalyticsSearch(e.target.value)}
                        className="w-full sm:w-64"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={analyticsLowStockFilter}
                            onChange={e => setAnalyticsLowStockFilter(e.target.checked)}
                            className="rounded"
                          />
                          Low Stock Only
                        </label>
                      </div>
                      <Button
                        variant="outline"
                        onClick={exportAnalytics}
                        className="flex items-center gap-2"
                        disabled={inventoryAnalytics.analyticsProducts.length === 0}
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Product Name</TableHead>
                          <TableHead className="font-semibold">UPC</TableHead>
                          <TableHead className="font-semibold text-right">Price (AED)</TableHead>
                          <TableHead className="font-semibold text-right">Stock</TableHead>
                          <TableHead className="font-semibold text-right">Total Value</TableHead>
                          <TableHead className="font-semibold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAnalyticsProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No products match your filters
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedAnalyticsProducts.map((product) => {
                            const totalValue = product.price * Math.max(0, product.stock);
                            const stockStatus = product.stock < 0 ? 'negative' : product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : 'ok';
                            
                            return (
                              <TableRow key={product.id} className={
                                product.stock < 0 ? "bg-red-100" :
                                product.stock === 0 ? "bg-red-50" :
                                product.stock < 10 ? "bg-yellow-50" : ""
                              }>
                                <TableCell className="font-medium max-w-xs">
                                  <div className="truncate" title={product.name}>{product.name}</div>
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{product.upc}</code>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  {product.price.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-semibold ${
                                    product.stock < 0 ? "text-red-700" :
                                    product.stock === 0 ? "text-red-600" :
                                    product.stock < 10 ? "text-yellow-600" : "text-primary/70"
                                  }`}>
                                    {product.stock}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                  {totalValue.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {stockStatus === 'negative' && (
                                    <Badge variant="destructive" className="bg-red-700">NEGATIVE</Badge>
                                  )}
                                  {stockStatus === 'out' && (
                                    <Badge variant="destructive">OUT</Badge>
                                  )}
                                  {stockStatus === 'low' && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">LOW</Badge>
                                  )}
                                  {stockStatus === 'ok' && (
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">OK</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {renderAnalyticsPagination()}
                </CardContent>
              </Card>
              
              {/* Stock Movement History Section */}
              <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift">
                <CardHeader className="border-b border-border px-6 py-4">
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
                    <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 h-32 flex flex-col">
                      <CardHeader className="p-0 flex-1">
                        <div className="flex items-center justify-between h-full">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1 font-medium">Total Movements</p>
                            <p className="text-xl sm:text-2xl font-semibold text-foreground">{filteredMovements.length}</p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-md flex-shrink-0 ml-4">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 mt-3 text-xs text-muted-foreground">
                        <p>Import records</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 h-32 flex flex-col">
                      <CardHeader className="p-0 flex-1">
                        <div className="flex items-center justify-between h-full">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1 font-medium">Total Units Added</p>
                            <p className="text-xl sm:text-2xl font-semibold text-foreground">
                              {filteredMovements.reduce((sum, m) => sum + m.quantity_added, 0)}
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md flex-shrink-0 ml-4">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 mt-3 text-xs text-muted-foreground">
                        <p>Total stock increase</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-modern transition-smooth hover:shadow-modern-lg hover-lift p-4 h-32 flex flex-col">
                      <CardHeader className="p-0 flex-1">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1 font-medium">Unique Products</p>
                          <p className="text-xl sm:text-2xl font-semibold text-foreground">
                            {new Set(filteredMovements.map(m => m.product_id)).size}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 mt-3 text-xs text-muted-foreground">
                        <p>Products restocked</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stock Movements Table */}
                  <div className="rounded-lg border border-border overflow-hidden bg-card/95 backdrop-blur-sm shadow-modern">
                    <Table className="w-full">
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
                                <Badge variant="outline" className="capitalize">
                                  {movement.movement_type.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{movement.created_by}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
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
          </Tabs>
        </div>
      </main>
    </div>
  );
}
