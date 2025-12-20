/**
 * Inventory Purchase Order Component
 * 
 * Purpose: Cart-style interface for adding stock to multiple products at once
 * Similar to Sales cart but for inventory additions
 */

import { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { supabase } from "@/integrations/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Search, Plus, Trash2, Package, CheckCircle, AlertCircle, X } from "lucide-react";
import { Tables } from "@/integrations/types";
import { recordStockMovementSafe } from "@/utils/stockMovementTracker";
import { useAuth } from "@/contexts/SimpleAuthContext";

interface CartItem {
  productId: string;
  productName: string;
  upc: string;
  currentStock: number;
  quantityToAdd: number;
  expectedNewStock: number;
}

interface UpdateResult {
  productName: string;
  previousStock: number;
  newStock: number;
  quantityAdded: number;
  success: boolean;
  error?: string;
}

export default function InventoryPurchaseOrder({ onOrderComplete }: { onOrderComplete?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Tables<'products'>[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Tables<'products'> | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [inputPosition, setInputPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
    // Update dropdown position when search changes
    if (searchInputRef.current && filteredProducts.length > 0) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setInputPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [searchTerm, products, filteredProducts]);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");
    
    if (!error && data) {
      // Filter active products in memory
      const activeProducts = data.filter((p: any) => p.is_active !== false);
      setProducts(activeProducts as unknown as Tables<'products'>[]);
    }
  }

  function filterProducts() {
    const normalized = searchTerm.trim();
    if (!normalized || normalized.length < 2) {
      setFilteredProducts([]);
      return;
    }

    const searchLower = normalized.toLowerCase();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.upc.toLowerCase().includes(searchLower)
    );
    
    setFilteredProducts(filtered.slice(0, 50)); // Show up to 50 results
  }

  const totalMatchCount = useMemo(() => {
    const normalized = searchTerm.trim();
    if (!normalized || normalized.length < 2) return 0;
    const searchLower = normalized.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.upc.toLowerCase().includes(searchLower)
    ).length;
  }, [searchTerm, products]);

  function selectProduct(product: Tables<'products'>) {
    setSelectedProduct(product);
    setSearchTerm(""); // Clear search to hide dropdown
    setFilteredProducts([]);
    setQuantityToAdd("");
  }

  function addToCart() {
    if (!selectedProduct || !quantityToAdd || parseInt(quantityToAdd) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a product and enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    const qty = parseInt(quantityToAdd);
    const expectedNew = selectedProduct.stock + qty;

    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.productId === selectedProduct.id);
    
    if (existingIndex >= 0) {
      // Update existing cart item
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantityToAdd += qty;
      updatedCart[existingIndex].expectedNewStock += qty;
      setCart(updatedCart);
      
      toast({
        title: "Cart Updated",
        description: `Added ${qty} more units to ${selectedProduct.name}`
      });
    } else {
      // Add new cart item
      const newItem: CartItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        upc: selectedProduct.upc,
        currentStock: selectedProduct.stock,
        quantityToAdd: qty,
        expectedNewStock: expectedNew
      };
      
      setCart([...cart, newItem]);
      
      toast({
        title: "Added to Order",
        description: `${selectedProduct.name} - ${qty} units`
      });
    }

    // Reset form for next product (keep search ability, clear selected product)
    setQuantityToAdd(""); // Clear qty for next entry
    setSearchTerm(""); // Clear search to let user search for next product
    setSelectedProduct(null); // Clear selected product
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(item => item.productId !== productId));
  }

  function updateCartQuantity(productId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          quantityToAdd: newQuantity,
          expectedNewStock: item.currentStock + newQuantity
        };
      }
      return item;
    }));
  }

  function clearCart() {
    setCart([]);
    setSearchTerm("");
    setSelectedProduct(null);
    setQuantityToAdd("");
  }

  async function confirmInventoryUpdate() {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add products to the order first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    const results: UpdateResult[] = [];
    let successCount = 0;
    let totalUnitsAdded = 0;

    for (const item of cart) {
      try {
        // Re-fetch current stock for safety
        const { data: currentProduct, error: fetchError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.productId as any)
          .single();

        if (fetchError || !currentProduct) {
          results.push({
            productName: item.productName,
            previousStock: item.currentStock,
            newStock: item.currentStock,
            quantityAdded: 0,
            success: false,
            error: "Failed to fetch current stock"
          });
          continue;
        }

        const actualCurrentStock = (currentProduct as any).stock;
        const newStock = actualCurrentStock + item.quantityToAdd;

        // Update product stock
        const { error: updateError } = await supabase
          .from("products")
          .update({ 
            stock: newStock,
            updated_at: new Date().toISOString()
          } as any)
          .eq("id", item.productId as any);

        if (updateError) {
          results.push({
            productName: item.productName,
            previousStock: actualCurrentStock,
            newStock: actualCurrentStock,
            quantityAdded: 0,
            success: false,
            error: updateError.message
          });
          continue;
        }

        // Record stock movement
        await recordStockMovementSafe({
          productId: item.productId,
          productName: item.productName,
          previousStock: actualCurrentStock,
          newStock: newStock,
          movementType: 'manual_add',
          createdBy: user?.username || user?.id || 'unknown',
          notes: `Stock added via Purchase Order (cart: ${item.quantityToAdd} units)`
        });

        results.push({
          productName: item.productName,
          previousStock: actualCurrentStock,
          newStock: newStock,
          quantityAdded: item.quantityToAdd,
          success: true
        });

        successCount++;
        totalUnitsAdded += item.quantityToAdd;

      } catch (error) {
        results.push({
          productName: item.productName,
          previousStock: item.currentStock,
          newStock: item.currentStock,
          quantityAdded: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setUpdateResults(results);
    setShowResults(true);
    setIsProcessing(false);

    // Show summary toast
    if (successCount === cart.length) {
      toast({
        title: " Order Completed Successfully",
        description: `${successCount} products updated, ${totalUnitsAdded} total units added`
      });
    } else {
      toast({
        title: "Order Partially Completed",
        description: `${successCount}/${cart.length} products updated successfully`,
        variant: "destructive"
      });
    }

    // Clear cart
    setCart([]);

    // Notify parent to refresh
    if (onOrderComplete) {
      onOrderComplete();
    }
  }

  function closeResults() {
    setShowResults(false);
    setUpdateResults([]);
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantityToAdd, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Inventory Purchase Order
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add stock to multiple products at once, then confirm all updates together
          </p>
        </CardHeader>
      </Card>

      {/* Product Search & Add */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Products to Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Box */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="product-search">Search Product</Label>
              <span className="text-xs text-muted-foreground">
                💡 Tip: Add multiple products - search, select qty, click "Add to Order", repeat
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                id="product-search"
                placeholder="Search by product name or UPC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              
              {/* Search Results Dropdown - Using Portal to escape stacking contexts */}
              {filteredProducts.length > 0 && ReactDOM.createPortal(
                <div 
                  className="fixed z-[9999] bg-white border rounded-md shadow-lg overflow-hidden"
                  style={{
                    top: `${inputPosition.top}px`,
                    left: `${inputPosition.left}px`,
                    width: `${inputPosition.width}px`,
                    maxHeight: `${Math.min(window.innerHeight - inputPosition.top - 16, 400)}px`
                  }}
                >
                  {/* Results count indicator - Sticky at top */}
                  {totalMatchCount > filteredProducts.length && (
                    <div className="px-4 py-2 bg-secondary/50 border-b border-primary/20 text-sm text-primary sticky top-0 z-20">
                      Showing {filteredProducts.length} of {totalMatchCount} results - Type more to narrow search
                    </div>
                  )}
                  
                  {/* Scrollable results area */}
                  <div className="overflow-y-auto" style={{ maxHeight: `${Math.min(window.innerHeight - inputPosition.top - 16 - (totalMatchCount > filteredProducts.length ? 48 : 0), 400)}px` }}>
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          UPC: {product.upc} | Stock: {product.stock} | Price: AED {product.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
          {selectedProduct && (
            <div className="p-4 bg-secondary/50 rounded-md border border-primary/20">
              <div className="font-semibold text-primary">{selectedProduct.name}</div>
              <div className="text-sm text-primary/70 mt-1">
                UPC: {selectedProduct.upc} | Current Stock: <strong>{selectedProduct.stock}</strong>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="quantity">Quantity to Add</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={quantityToAdd}
                onChange={(e) => setQuantityToAdd(e.target.value)}
                disabled={!selectedProduct}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={addToCart}
                disabled={!selectedProduct || !quantityToAdd || parseInt(quantityToAdd) <= 0}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cart */}
      {cart.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Cart ({cart.length} products, {totalItems} units)
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
                <Button 
                  onClick={confirmInventoryUpdate}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Confirm Inventory Update"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>UPC</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Qty to Add</TableHead>
                    <TableHead className="text-center">Expected New Stock</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.upc}</code>
                      </TableCell>
                      <TableCell className="text-center">{item.currentStock}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantityToAdd}
                          onChange={(e) => updateCartQuantity(item.productId, parseInt(e.target.value) || 0)}
                          className="w-20 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-green-600">
                          {item.expectedNewStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Dialog */}
      {showResults && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <CheckCircle className="h-5 w-5" />
                Order Processing Complete
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={closeResults}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-green-50 rounded-md border border-green-200">
                <div className="text-lg font-semibold text-green-900">
                  {updateResults.filter(r => r.success).length} / {updateResults.length} Products Updated
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Total units added: {updateResults.reduce((sum, r) => sum + r.quantityAdded, 0)}
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Previous → New Stock</TableHead>
                      <TableHead className="text-center">Units Added</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updateResults.map((result, index) => (
                      <TableRow key={index} className={result.success ? "bg-green-50" : "bg-red-50"}>
                        <TableCell className="font-medium">{result.productName}</TableCell>
                        <TableCell className="text-center font-mono">
                          {result.previousStock} → {result.newStock}
                        </TableCell>
                        <TableCell className="text-center">
                          {result.success ? (
                            <Badge className="bg-green-600">+{result.quantityAdded}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {result.success ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              ✓ Success
                            </Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                ✗ Failed
                              </Badge>
                              {result.error && (
                                <div className="text-xs text-red-600">{result.error}</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button onClick={closeResults} className="w-full">
                Close Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {cart.length === 0 && !showResults && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Your order cart is empty</p>
            <p className="text-sm text-gray-500">Search for products above and add them to your order</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

