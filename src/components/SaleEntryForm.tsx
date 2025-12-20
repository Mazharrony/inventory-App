

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { InvoiceModal } from "./InvoiceModal";
import { Tables, TablesInsert } from "@/integrations/types";
import { generateSequentialInvoiceNumber } from "@/utils/invoiceUtils";

type Product = Tables<'products'>;
type Sale = Tables<'sales'>;

type TransactionData = {
  transaction_id: string;
  created_at: string;
  seller_name: string;
  payment_method: string;
  payment_reference?: string | null;
  items: Array<{
    id: string;
    upc: string;
    product_name: string;
    price: number;
    quantity: number;
  }>;
  total_amount: number;
  item_count: number;
  invoice_number?: string;
  _cartData?: CartItem[]; // Cart data for modal to commit sale
};

type CartItem = {
  id: string; // temporary ID for cart management
  product: Product;
  quantity: number;
  customPrice: number; // Custom price per company policy
  subtotal: number;
};

type SaleEntryFormProps = {
  onSaleAdded: () => void;
};

const SaleEntryForm = ({ onSaleAdded }: SaleEntryFormProps) => {
  const { user, isAdmin } = useAuth(); // Get current logged-in user as seller
  const [upc, setUpc] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [showNegativeStockDialog, setShowNegativeStockDialog] = useState(false);
  const [pendingSale, setPendingSale] = useState<TablesInsert<'sales'> | null>(null);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCartStockWarning, setShowCartStockWarning] = useState(false);
  const [cartStockWarnings, setCartStockWarnings] = useState<Array<{
    productName: string;
    upc: string;
    available: number;
    required: number;
    shortfall: number;
  }>>([]);

  const [currentTransaction, setCurrentTransaction] = useState<TransactionData | null>(null);

  // Shopping Cart States (now default behavior)
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-focus UPC field for barcode scanning
  useEffect(() => {
    const upcInput = document.getElementById("upc");
    if (upcInput) {
      upcInput.focus();
    }
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (!error && data) {
      setProducts(data as unknown as Product[]);
    }
  };

  // Smart product search with fuzzy matching
  const getProductSuggestions = () => {
    if (!productName || productName.length < 2 || product) return [];

    const searchLower = productName.toLowerCase().trim();
    console.log('Sales Form - Searching for:', searchLower);

    // Helper function for fuzzy matching
    const checkFuzzyMatch = (productName: string, searchTerm: string) => {
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

      for (const [fullWord, abbreviations] of Object.entries(brandMappings)) {
        if (abbreviations.includes(searchTerm) && productName.includes(fullWord)) {
          console.log(`Sales Form - Fuzzy match: "${searchTerm}" → "${fullWord}" in "${productName}"`);
          return true;
        }
      }

      const words = productName.split(/\s+/);
      return words.some(word => word.startsWith(searchTerm) && searchTerm.length >= 2);
    };

    const filtered = products.filter((prod) => {
      const prodNameLower = prod.name?.toLowerCase() ?? '';
      const nameMatches = prodNameLower.includes(searchLower);
      const fuzzyMatches = checkFuzzyMatch(prodNameLower, searchLower);
      const words = prodNameLower.split(/\s+/);
      const startsWithMatches = words.some(word => word.startsWith(searchLower));
      return nameMatches || fuzzyMatches || startsWithMatches;
    });

    // Sort by relevance: startsWith > word boundary > includes
    const sorted = filtered.sort((a, b) => {
      const aName = a.name?.toLowerCase() ?? '';
      const bName = b.name?.toLowerCase() ?? '';

      // Helper: position of search term
      const aStarts = aName.startsWith(searchLower);
      const bStarts = bName.startsWith(searchLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Word boundary (not start)
      const wordBoundary = (name: string) => name.split(/\s+/).some(word => word.startsWith(searchLower));
      const aWordBoundary = wordBoundary(aName);
      const bWordBoundary = wordBoundary(bName);
      if (aWordBoundary && !bWordBoundary) return -1;
      if (!aWordBoundary && bWordBoundary) return 1;

      // Fallback: index of search term
      return aName.indexOf(searchLower) - bName.indexOf(searchLower);
    });

    console.log('Sales Form - Found suggestions:', sorted.length);
    return sorted; // Return all matching products
  };

  // Handle product selection from suggestions
  const selectProduct = (selectedProduct: Product) => {
    setProduct(selectedProduct);
    setProductName(selectedProduct.name);
    setPrice(selectedProduct.price.toString());
    setUpc(selectedProduct.upc);
    setProductNotFound(false);
    setShowProductSuggestions(false);

    console.log('Sales Form - Product selected:', selectedProduct.name);

    toast({
      title: "Product Selected",
      description: `${selectedProduct.name} - AED ${selectedProduct.price}`,
    });
  };

  const lookupProduct = useCallback(async (scannedUpc: string) => {
    if (!scannedUpc.trim()) {
      setProduct(null);
      setProductNotFound(false);
      setProductName("");
      setPrice("");
      return;
    }

    setIsLoadingProduct(true);
    setProductNotFound(false);

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("upc" as never, scannedUpc.trim()) as { data: Product[] | null; error: any };

      if (error || !data || data.length === 0) {
        setProduct(null);
        setProductNotFound(true);
        setProductName("");
        setPrice("");
      } else {
        const productData = data[0] as unknown as Product;
        setProduct(productData);
        setProductNotFound(false);
        setProductName(productData.name);
        setPrice(productData.price.toString());
      }
    } catch (err) {
      setProduct(null);
      setProductNotFound(true);
      setProductName("");
      setPrice("");
    } finally {
      setIsLoadingProduct(false);
    }
  }, []);

  // Debounced UPC lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (upc.trim()) {
        lookupProduct(upc);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [upc, lookupProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Always add to cart (cart is now the default behavior)
    addToCart();
  };

  // Proceed with cart checkout (after stock warning confirmation)
  const proceedWithCartCheckout = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to complete sale",
        variant: "destructive",
      });
      return;
    }

    const sellerName = user.username || 'admin';

    // Validate payment reference for card/bank payments
    if ((paymentMethod === 'card' || paymentMethod === 'bank_transfer') && (!paymentReference || !paymentReference.trim())) {
      toast({
        title: "Payment Reference Required",
        description: "Please enter a reference number for card or bank transfer payments.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate a single transaction ID for this entire cart checkout (proper UUID)
      const transactionId = crypto.randomUUID();
      console.log('Generated transaction ID:', transactionId);
      
      // Generate sequential invoice number from database
      const invoiceNumber = await generateSequentialInvoiceNumber();
      console.log('Generated sequential invoice number:', invoiceNumber);

      // Create transaction data structure for InvoiceModal (but don't insert sales yet)
      const transactionItems = cart.map((item, index) => ({
        id: `pending-${item.id}`, // Temporary ID until sale is committed
        upc: item.product.upc,
        product_name: item.product.name,
        price: item.customPrice, // Use custom price for invoice
        quantity: item.quantity
      }));

      const totalAmount = transactionItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalQuantity = transactionItems.reduce((sum, item) => sum + item.quantity, 0);

      const transactionData = {
        transaction_id: transactionId,
        created_at: new Date().toISOString(),
        seller_name: sellerName,
        payment_method: paymentMethod,
        payment_reference: paymentReference ? paymentReference.trim() : null,
        items: transactionItems,
        total_amount: totalAmount,
        item_count: totalQuantity,
        invoice_number: invoiceNumber,
        // Add cart data for modal to use when committing
        _cartData: cart
      };

      setCurrentTransaction(transactionData);
      setShowInvoiceModal(true);

      // Don't clear cart yet - wait for modal confirmation
      // Don't call onSaleAdded() yet - wait for modal

    } catch (error) {
      console.error('Cart checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to prepare checkout: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Cart Checkout Function
  const handleCartCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    // Check stock for all items first (but don't update yet - wait for modal confirmation)
    const warnings: Array<{
      productName: string;
      upc: string;
      available: number;
      required: number;
      shortfall: number;
    }> = [];
    
    for (const item of cart) {
      if (item.product.stock < item.quantity) {
        warnings.push({
          productName: item.product.name,
          upc: item.product.upc,
          available: item.product.stock,
          required: item.quantity,
          shortfall: item.quantity - item.product.stock
        });
      }
    }

    if (warnings.length > 0) {
      setCartStockWarnings(warnings);
      setShowCartStockWarning(true);
      return; // Wait for user confirmation
    }

    // No stock warnings, proceed directly
    await proceedWithCartCheckout();
  };

  const processSale = async (saleData: TablesInsert<'sales'>) => {
    const { data, error } = await (supabase
      .from("sales")
      .insert([saleData as any])
      .select()) as { data: Sale[] | null; error: any };

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Update inventory stock (can go negative)
      if (product) {
        const newStock = product.stock - parseInt(quantity);
        const { error: stockError } = await (supabase
          .from("products")
          .update({ stock: newStock, updated_at: new Date().toISOString() } as any)
          .eq("id" as never, product.id)) as { error: any };

        if (stockError) {
          console.error("Failed to update inventory:", stockError);
          toast({
            title: "Warning",
            description: "Sale recorded but failed to update inventory. Please check manually.",
            variant: "destructive",
          });
        }
      }

      const stockMessage = product && product.stock < parseInt(quantity)
        ? ` (Inventory is now negative: ${product.stock - parseInt(quantity)} units)`
        : "";

      toast({
        title: "Success",
        description: `Sale added successfully${stockMessage}`,
      });

      // Store sale data and show invoice modal
      if (data && data.length > 0) {
        const sale = data[0];
        // Create transaction data structure for single item
        const transactionData: TransactionData = {
          transaction_id: sale.id,
          created_at: sale.created_at,
          seller_name: sale.seller_name,
          payment_method: (sale.payment_method as string) || 'cash',
          items: [{
            id: sale.id,
            upc: sale.upc,
            product_name: (sale.product_name as string) || (saleData.product_name as string),
            price: sale.price,
            quantity: sale.quantity
          }],
          total_amount: sale.price * sale.quantity,
          item_count: sale.quantity
        };

        setCurrentTransaction(transactionData);
        localStorage.setItem('recentSalesData', JSON.stringify([transactionData]));
        setShowInvoiceModal(true);
      }

      resetForm();
    }
  };

  const resetForm = () => {
    setUpc("");
    setProductName("");
    setPrice("");
    setQuantity("1");
    setProduct(null);
    setProductNotFound(false);
    setShowProductSuggestions(false);
    setPaymentReference("");

    // Refocus UPC field for next entry
    setTimeout(() => {
      const upcInput = document.getElementById("upc");
      if (upcInput) {
        upcInput.focus();
      }
    }, 100);
  };

  // Cart Management Functions
  const addToCart = () => {
    if (!price || !quantity || !productName.trim()) {
      toast({
        title: "Error",
        description: "Please enter product name, price and quantity",
        variant: "destructive",
      });
      return;
    }

    let cartProduct: Product;

    if (product) {
      cartProduct = product;
    } else {
      // Create temporary product for manual entry (non-inventoried item)
      cartProduct = {
        id: `manual-${Date.now()}`, // Temporary ID for manual entries
        upc: upc.trim() || `manual-${Date.now()}`, // Use provided UPC or generate one
        name: productName.trim(),
        price: parseFloat(price),
        stock: 999999, // Unlimited stock for manual entries
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Product;
    }

    const cartItem: CartItem = {
      id: Date.now().toString(), // Temporary unique ID
      product: cartProduct,
      quantity: parseInt(quantity),
      customPrice: parseFloat(price), // Store the custom price
      subtotal: parseFloat(price) * parseInt(quantity)
    };

    setCart(prevCart => [...prevCart, cartItem]);

    // Reset form for next product
    setUpc("");
    setProductName("");
    setPrice("");
    setQuantity("1");
    setProduct(null);
    setProductNotFound(false);
    setShowProductSuggestions(false);

    const itemType = product ? "inventory item" : "manual entry";
    toast({
      title: "Added to Cart",
      description: `${cartProduct.name} (${quantity}x) added to cart as ${itemType}`,
    });

    // Refocus UPC field for next entry
    setTimeout(() => {
      const upcInput = document.getElementById("upc");
      if (upcInput) {
        upcInput.focus();
      }
    }, 100);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setCart(prevCart => prevCart.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity, subtotal: item.customPrice * newQuantity }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleNegativeStockConfirm = async () => {
    if (pendingSale) {
      await processSale(pendingSale);
      setPendingSale(null);
    }
    setShowNegativeStockDialog(false);
  };

  const handleNegativeStockCancel = () => {
    setPendingSale(null);
    setShowNegativeStockDialog(false);
  };

  const handleCartStockWarningConfirm = async () => {
    setShowCartStockWarning(false);
    // Continue with checkout process
    await proceedWithCartCheckout();
  };

  const handleCartStockWarningCancel = () => {
    setShowCartStockWarning(false);
    setCartStockWarnings([]);
  };

  return (
    <Card className="bg-card border border-border shadow-sm rounded-lg">
      <CardHeader className="border-b border-border px-6 py-4">
        <CardTitle className="text-primary text-xl font-semibold">Shopping Cart</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 px-6 pb-6">
        {/* Shopping Cart Display */}
        {cart.length > 0 && (
          <div className="mb-6 p-4 bg-muted/30 border border-border rounded-lg">
            <h3 className="font-medium mb-4 flex justify-between items-center text-base">
              Shopping Cart ({cart.length} items)
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Cart
              </Button>
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{item.product.name}</div>
                    <div className="text-sm text-muted-foreground">{item.product.upc}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => {
                          const newQty = Math.max(1, item.quantity - 1);
                          updateCartItemQuantity(item.id, newQty);
                        }}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateCartItemQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 text-center bg-background border-border focus:ring-2 focus:ring-primary/20 h-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 hover:bg-primary/20 hover:text-primary"
                        onClick={() => {
                          const newQty = Math.min(item.product.stock, item.quantity + 1);
                          updateCartItemQuantity(item.id, newQty);
                        }}
                        disabled={item.quantity >= item.product.stock}
                      >
                        +
                      </Button>
                    </div>
                    <span className="text-sm text-muted-foreground">× AED {item.customPrice.toFixed(2)}</span>
                    <span className="font-semibold min-w-20 text-right text-primary">AED {item.subtotal.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="text-destructive hover:bg-destructive/10 p-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex justify-between items-center gap-3">
                <div className="text-xl font-bold text-primary">
                  Total: AED {getCartTotal().toFixed(2)}
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <Select value={paymentMethod} onValueChange={(value) => {
                    setPaymentMethod(value);
                    if (value === 'cash') setPaymentReference('');
                  }}>
                    <SelectTrigger className="w-36 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="due">Due</SelectItem>
                    </SelectContent>
                  </Select>
                  {(paymentMethod === 'card' || paymentMethod === 'bank_transfer') && (
                    <Input
                      placeholder="Reference # *"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-40 bg-muted border-border focus:ring-2 focus:ring-primary/20 h-10"
                      required
                    />
                  )}
                  <Button
                    onClick={handleCartCheckout}
                    className="bg-success text-success-foreground hover:bg-success/90 h-10"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Checkout Cart
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="upc" className="text-sm font-medium">UPC / Barcode *</Label>
              <Input
                id="upc"
                type="text"
                placeholder="Scan or enter UPC"
                value={upc}
                onChange={(e) => setUpc(e.target.value)}
                required
                autoFocus
                disabled={isLoadingProduct}
                className="bg-muted border-border focus:ring-2 focus:ring-primary/20 h-10"
              />
              {isLoadingProduct && (
                <div className="text-sm text-primary flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  Looking up product...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName" className="text-sm font-medium">Product Name</Label>
              <div className="relative">
                <Input
                  id="productName"
                  type="text"
                  placeholder="Type to search products..."
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    if (!product && e.target.value.length >= 2) {
                      setShowProductSuggestions(true);
                    } else {
                      setShowProductSuggestions(false);
                    }
                    // Clear product if typing manually
                    if (product && e.target.value !== product.name) {
                      setProduct(null);
                      setPrice("");
                      setUpc("");
                    }
                  }}
                  onFocus={() => {
                    if (productName.length >= 2 && !product) {
                      setShowProductSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicking on suggestions
                    setTimeout(() => setShowProductSuggestions(false), 200);
                  }}
                  disabled={!!product}
                  className={`bg-muted border-border focus:ring-2 focus:ring-primary/20 h-10 ${product ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}`}
                />

                {/* Clear product button */}
                {product && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-destructive/20"
                    onClick={() => {
                      setProduct(null);
                      setProductName("");
                      setPrice("");
                      setUpc("");
                      setProductNotFound(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {/* Product Suggestions Dropdown */}
                {showProductSuggestions && getProductSuggestions().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-md max-h-60 overflow-y-auto">
                    {getProductSuggestions().map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0 flex justify-between items-center transition-colors"
                        onClick={() => selectProduct(suggestion)}
                      >
                        <div>
                          <div className="font-medium text-sm">{suggestion.name}</div>
                          <div className="text-xs text-muted-foreground">
                            UPC: {suggestion.upc} • Stock: {suggestion.stock} • AED {suggestion.price}
                          </div>
                        </div>
                        <div className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">Select</div>
                      </div>
                    ))}
                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                      Tip: Try "mu" for Muscle, "pro" for Protein
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium">
                Price (AED) *
                <span className="ml-2 text-xs text-primary font-normal">
                  (Editable for customer-specific pricing)
                </span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className={`bg-muted border-border focus:ring-2 focus:ring-primary/20 h-10 ${product ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-medium">
                Qty *
                {product && (
                  <span className="ml-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    ({product.stock} available)
                  </span>
                )}
              </Label>
              <div className="flex items-center space-x-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-border hover:bg-muted/50"
                  onClick={() => {
                    const currentQty = parseInt(quantity) || 1;
                    if (currentQty > 1) {
                      setQuantity((currentQty - 1).toString());
                    }
                  }}
                  disabled={parseInt(quantity) <= 1}
                >
                  -
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="text-center flex-1 bg-muted border-border focus:ring-2 focus:ring-primary/20 h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-border hover:bg-muted/50"
                  onClick={() => {
                    const currentQty = parseInt(quantity) || 1;
                    const maxStock = product ? product.stock : 999;
                    if (currentQty < maxStock) {
                      setQuantity((currentQty + 1).toString());
                    }
                  }}
                  disabled={product && parseInt(quantity) >= product.stock}
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          {/* Current User Info */}
          {user && (
            <div className="p-4 bg-muted/30 border border-border rounded-lg">
              <p className="text-sm font-medium text-foreground">
                Seller: {user.username}
              </p>
            </div>
          )}

          {/* Product Status Alerts */}
          {product && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Product Found:</strong> {product.name} - AED {product.price}
                <br />
                <span className="text-sm">Stock: {product.stock} units available</span>
              </AlertDescription>
            </Alert>
          )}

          {productNotFound && upc.trim() && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Product Not Found:</strong> UPC "{upc}" not in inventory.
                You can still proceed with manual entry by filling in the product name and price.
              </AlertDescription>
            </Alert>
          )}

          {product && product.stock < parseInt(quantity) && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>Low Stock Warning:</strong> Only {product.stock} units available.
                Sale will result in negative inventory ({product.stock - parseInt(quantity)} units).
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-medium rounded-lg"
            disabled={isLoadingProduct || (!product && (!productName.trim() || !price))}
          >
            Add to Cart
          </Button>
        </form>

        {/* Negative Stock Warning Dialog (Single Product) */}
        <AlertDialog open={showNegativeStockDialog} onOpenChange={setShowNegativeStockDialog}>
          <AlertDialogContent className="animate-scale-in max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Negative Inventory Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2 space-y-2">
                <p>This sale will result in negative inventory:</p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product:</span>
                    <span className="font-medium">{product?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Stock:</span>
                    <span className="font-medium">{product?.stock} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Quantity:</span>
                    <span className="font-medium">{quantity} units</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 mt-1.5">
                    <span className="text-muted-foreground">Resulting Stock:</span>
                    <span className="font-semibold text-red-600">
                      {product ? product.stock - parseInt(quantity) : 0} units
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pt-2">
                  The system will track this negative inventory and automatically settle it when new stock is added.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel onClick={handleNegativeStockCancel} className="hover-lift">
                Cancel Sale
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleNegativeStockConfirm} className="bg-red-600 hover:bg-red-700 hover-lift">
                Proceed with Sale
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cart Stock Warning Dialog (Multiple Products) */}
        <AlertDialog open={showCartStockWarning} onOpenChange={setShowCartStockWarning}>
          <AlertDialogContent className="animate-scale-in max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                Stock Warning - Multiple Products
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2">
                <p className="mb-4">
                  The following products have insufficient stock. Proceeding will result in negative inventory:
                </p>
                <div className="space-y-3">
                  {cartStockWarnings.map((warning, index) => (
                    <div
                      key={index}
                      className="bg-muted/50 rounded-lg p-4 border border-red-500/20"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">{warning.productName}</h4>
                          <p className="text-sm text-muted-foreground">UPC: {warning.upc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-red-500/20 text-red-700 dark:text-red-400 rounded-full font-medium">
                            Shortfall: {warning.shortfall}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Available</span>
                          <span className="font-medium text-foreground">{warning.available} units</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Required</span>
                          <span className="font-medium text-foreground">{warning.required} units</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">After Sale</span>
                          <span className="font-semibold text-red-600">
                            {warning.available - warning.required} units
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      The system will track negative inventory for these products and automatically settle them when new stock is added.
                    </span>
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
              <AlertDialogCancel onClick={handleCartStockWarningCancel} className="hover-lift">
                Cancel Checkout
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCartStockWarningConfirm}
                className="bg-red-600 hover:bg-red-700 hover-lift"
              >
                Proceed with Checkout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Invoice Modal */}
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setCurrentTransaction(null);
          }}
          transaction={currentTransaction as any}
          onSaleAdded={onSaleAdded}
        />
      </CardContent>
    </Card>
  );
};

export default SaleEntryForm;
