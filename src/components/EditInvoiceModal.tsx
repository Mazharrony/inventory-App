import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Save, X, Plus, Trash2, Scan, Receipt, User, Phone, MapPin, Building2, Package, Search, AlertTriangle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/types";
import { format } from "date-fns";

type Product = Tables<'products'>;

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
  transaction_id?: string;
  order_comment?: string | null;
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

type EditableItem = {
  id: string;
  upc: string;
  product_name: string;
  price: number;
  quantity: number;
  isNew?: boolean;
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

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSaved: () => void;
}

export const EditInvoiceModal = ({ isOpen, onClose, transaction, onSaved }: EditInvoiceModalProps) => {
  const { isAdmin, isAccountant, user } = useAuth();
  // Customer states
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTrn, setCustomerTrn] = useState("");
  const [invoiceType, setInvoiceType] = useState("retail");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [dateValidationError, setDateValidationError] = useState("");

  // Product states
  const [items, setItems] = useState<EditableItem[]>([]);
  const [newProductUpc, setNewProductUpc] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState("1");
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchMode, setSearchMode] = useState<'upc' | 'name' | null>(null);

  const { toast } = useToast();

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen && transaction) {
      initializeForm();
      fetchProducts();
      fetchCustomers();
    }
  }, [isOpen, transaction]);

  const initializeForm = () => {
    if (!transaction) return;

    // Initialize customer data
    setCustomerName(transaction.customer_name || "");
    setCustomerMobile(transaction.customer_mobile || "");
    setCustomerAddress(transaction.customer_address || "");
    setCustomerTrn(transaction.customer_trn || "");
    setCustomerSearchTerm(transaction.customer_name || "");
    setInvoiceType(transaction.invoice_type || "retail");
    setPaymentMethod(transaction.payment_method || "cash");
    setPaymentReference(transaction.payment_reference || "");
    setOrderComment(transaction.order_comment || "");
    
    // Initialize date from transaction created_at
    const dateOnly = transaction.created_at.split('T')[0];
    setTransactionDate(dateOnly);
    setDateValidationError("");

    // Initialize items
    const editableItems: EditableItem[] = transaction.items.map(item => ({
      id: item.id,
      upc: item.upc,
      product_name: item.product_name || "",
      price: item.price,
      quantity: item.quantity,
    }));
    setItems(editableItems);

    // Clear new product form
    setNewProductUpc("");
    setNewProductName("");
    setNewProductPrice("");
    setNewProductQuantity("1");
  };

  // Validate manual date edit (must be within last 7 days)
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
      setDateValidationError("Can only edit transactions from the last 7 days");
      return false;
    }

    setDateValidationError("");
    return true;
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;
      setProducts((data as any) || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!customersError && customersData) {
        setCustomers(customersData as any);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const searchProduct = async (upc: string) => {
    if (!upc.trim()) return null;

    setIsLoadingProduct(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("upc" as any, upc.trim() as any)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error searching product:", error);
      return null;
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleUpcSearch = async (upc: string) => {
    setNewProductUpc(upc);
    setSearchMode('upc');
    setSelectedSuggestionIndex(-1); // Reset selection
    
    if (upc.length >= 3) {
      const product = await searchProduct(upc) as any;
      if (product) {
        setNewProductName(product.name);
        setNewProductPrice(product.price.toString());
        setShowProductSuggestions(false); // Hide suggestions when exact match found
        toast({
          title: "Product Found",
          description: `Loaded ${product.name}`,
        });
      } else {
        // Only clear fields if not manually typed product name
        if (!newProductName.trim()) {
          setNewProductName("");
          setNewProductPrice("");
        }
        // Show UPC suggestions for partial matches
        if (upc.length >= 2) {
          setShowProductSuggestions(true);
        }
      }
    } else {
      // Only clear if UPC is being cleared
      if (!upc.trim()) {
        setNewProductName("");
        setNewProductPrice("");
      }
      setShowProductSuggestions(false);
    }
  };

  const getProductSuggestions = () => {
    // Combine UPC and name search results
    const upcTerm = newProductUpc.toLowerCase();
    const nameTerm = newProductName.toLowerCase();
    
    if (!upcTerm && !nameTerm) return [];
    if (upcTerm.length < 2 && nameTerm.length < 1) return [];

    return products
      .filter(product => {
        const matchesUpc = upcTerm && (
          product.upc.toLowerCase().includes(upcTerm) ||
          product.name.toLowerCase().includes(upcTerm)
        );
        
        const matchesName = nameTerm && (
          product.name.toLowerCase().includes(nameTerm) ||
          product.upc.toLowerCase().includes(nameTerm)
        );
        
        return matchesUpc || matchesName;
      })
      .sort((a, b) => {
        // Prioritize exact UPC matches, then name matches
        const aUpcMatch = a.upc.toLowerCase().startsWith(upcTerm);
        const bUpcMatch = b.upc.toLowerCase().startsWith(upcTerm);
        
        if (aUpcMatch && !bUpcMatch) return -1;
        if (bUpcMatch && !aUpcMatch) return 1;
        
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  };

  const selectProduct = (product: Product) => {
    setNewProductUpc(product.upc);
    setNewProductName(product.name);
    setNewProductPrice(product.price.toString());
    setShowProductSuggestions(false);
    
    toast({
      title: "Product Selected",
      description: `Selected ${product.name}`,
    });
  };

  const handleProductNameSearch = (name: string) => {
    setNewProductName(name);
    setSearchMode('name');
    setSelectedSuggestionIndex(-1); // Reset selection
    
    if (name.length >= 1) {
      setShowProductSuggestions(true);
      
      // Auto-fill if exact match found
      const exactMatch = products.find(product => 
        product.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exactMatch) {
        setNewProductUpc(exactMatch.upc);
        setNewProductPrice(exactMatch.price.toString());
        setShowProductSuggestions(false);
        
        toast({
          title: "Exact Match Found",
          description: `Auto-filled details for ${exactMatch.name}`,
        });
      }
    } else {
      setShowProductSuggestions(false);
      // Clear other fields if name is cleared
      if (!name.trim()) {
        setNewProductUpc("");
        setNewProductPrice("");
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, suggestions: Product[], isNameSearch = false) => {
    if (!showProductSuggestions || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          const selectedProduct = suggestions[selectedSuggestionIndex];
          if (isNameSearch) {
            selectProductFromName(selectedProduct);
          } else {
            selectProduct(selectedProduct);
          }
        }
        break;
      case 'Escape':
        setShowProductSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const getProductNameSuggestions = () => {
    if (!newProductName || newProductName.length < 1) {
      return [];
    }

    const searchLower = newProductName.toLowerCase().trim();
    
    // Smart search algorithm
    return products
      .filter(product => {
        const nameLower = product.name.toLowerCase();
        const upcLower = product.upc.toLowerCase();
        
        // Priority matching:
        // 1. Exact name match
        // 2. Name starts with search term
        // 3. Name contains search term
        // 4. UPC contains search term
        return nameLower.includes(searchLower) || 
               upcLower.includes(searchLower) ||
               nameLower.startsWith(searchLower);
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const search = searchLower;
        
        // Exact matches first
        if (aName === search && bName !== search) return -1;
        if (bName === search && aName !== search) return 1;
        
        // Starts with search term
        if (aName.startsWith(search) && !bName.startsWith(search)) return -1;
        if (bName.startsWith(search) && !aName.startsWith(search)) return 1;
        
        // Alphabetical order for remaining
        return aName.localeCompare(bName);
      })
      .slice(0, 8); // Show more results for better UX
  };

  const selectProductFromName = (product: Product) => {
    setNewProductUpc(product.upc);
    setNewProductName(product.name);
    setNewProductPrice(product.price.toString());
    setShowProductSuggestions(false);
    
    toast({
      title: "Product Selected",
      description: `Selected ${product.name} - AED ${product.price.toFixed(2)}`,
    });
  };

  const addNewItem = () => {
    if (!newProductUpc || !newProductName || !newProductPrice || !newProductQuantity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all product fields",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(newProductPrice);
    const quantity = parseInt(newProductQuantity);

    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    // Check if product already exists in the cart
    const existingItem = items.find(item => item.upc === newProductUpc.trim());
    if (existingItem) {
      toast({
        title: "Product Already Added",
        description: "This product is already in the invoice. Please edit the existing item instead.",
        variant: "destructive",
      });
      return;
    }

    const newItem: EditableItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      upc: newProductUpc.trim(),
      product_name: newProductName.trim(),
      price: price,
      quantity: quantity,
      isNew: true,
    };

    setItems([...items, newItem]);
    
    // Clear form
    setNewProductUpc("");
    setNewProductName("");
    setNewProductPrice("");
    setNewProductQuantity("1");
    setShowProductSuggestions(false);

    toast({
      title: "Item Added",
      description: `${newItem.product_name} added to invoice`,
    });
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
    toast({
      title: "Item Removed",
      description: "Product removed from invoice",
    });
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) return;
    
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, quantity }
        : item
    ));
  };

  const updateItemPrice = (itemId: string, price: number) => {
    if (price <= 0) return;
    
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, price }
        : item
    ));
  };

  const handleCustomerSearch = (searchTerm: string) => {
    setCustomerSearchTerm(searchTerm);
    setCustomerName(searchTerm);
    setShowCustomerSuggestions(searchTerm.length >= 1);
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerSearchTerm(customer.name);
    setCustomerMobile(customer.mobile || "");
    setCustomerAddress(customer.address || "");
    setCustomerTrn(customer.trn || "");
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
      return [];
    }

    const searchLower = customerSearchTerm.toLowerCase().trim();
    return customers
      .filter(customer => {
        const nameLower = customer.name.toLowerCase();
        const mobileLower = (customer.mobile || "").toLowerCase();
        return nameLower.includes(searchLower) || mobileLower.includes(searchLower);
      })
      .slice(0, 5);
  };

  const calculateTotals = () => {
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotal = totalAmount / 1.05; // Remove VAT to get subtotal
    const vatAmount = totalAmount - subtotal; // VAT is the difference
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    
    return { totalAmount, subtotal, vatAmount, itemCount };
  };

  const saveChanges = async () => {
    if (!transaction) {
      toast({
        title: "Error",
        description: "Transaction data is missing",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Invoice must contain at least one item",
        variant: "destructive",
      });
      return;
    }

    // Validate all items have required data
    const invalidItems = items.filter(item => 
      !item.upc || !item.product_name || item.price <= 0 || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      toast({
        title: "Invalid Items",
        description: "Some items have invalid data. Please check all products have UPC, name, valid price and quantity.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Validate transaction date before saving
      if ((isAdmin || isAccountant) && !validateTransactionDate(transactionDate)) {
        throw new Error(dateValidationError || "Invalid transaction date");
      }

      const { totalAmount, itemCount } = calculateTotals();

      // Use manual date if provided, otherwise keep original
      const saleDateTime = new Date(transactionDate);
      saleDateTime.setHours(new Date(transaction.created_at).getHours(), 
                            new Date(transaction.created_at).getMinutes(), 
                            new Date(transaction.created_at).getSeconds());
      const updatedCreatedAt = saleDateTime.toISOString();

      // Update customer information in sales records
      const customerUpdate = {
        customer_name: customerName.trim() || null,
        customer_mobile: customerMobile.trim() || null,
        customer_address: customerAddress.trim() || null,
        customer_trn: customerTrn.trim() || null,
        invoice_type: invoiceType,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || null,
        order_comment: orderComment ? orderComment.trim() : null,
        created_at: updatedCreatedAt, // Update date if changed
      };

      console.log("Starting invoice update for transaction:", transaction.transaction_id);
      console.log("Customer update data:", customerUpdate);
      console.log("Items to process:", items.length);

      // Get all current items for this transaction (before edit) for audit log
      const { data: currentSales, error: fetchError } = await supabase
        .from("sales")
        .select("*")
        .eq("transaction_id" as any, transaction.transaction_id as any);

      if (fetchError) {
        console.error("Error fetching current sales:", fetchError);
        throw new Error("Failed to fetch current invoice items");
      }

      // Store previous data for audit log
      const previousInvoiceData = {
        items: currentSales || [],
        customer_name: transaction.customer_name,
        customer_mobile: transaction.customer_mobile,
        customer_address: transaction.customer_address,
        customer_trn: transaction.customer_trn,
        invoice_type: transaction.invoice_type,
        payment_method: transaction.payment_method,
        payment_reference: transaction.payment_reference,
        order_comment: transaction.order_comment,
        created_at: transaction.created_at,
        total_amount: transaction.total_amount,
        item_count: transaction.item_count,
      };

      const currentSaleIds = (currentSales as any)?.map((sale: any) => sale.id) || [];
      const existingItemIds = items.filter(item => !item.isNew).map(item => item.id);
      const newItems = items.filter(item => item.isNew);

      console.log("Current sale IDs:", currentSaleIds);
      console.log("Existing item IDs:", existingItemIds);
      console.log("New items count:", newItems.length);

      // Delete removed items first
      const itemsToDelete = currentSaleIds.filter(id => !existingItemIds.includes(id));
      if (itemsToDelete.length > 0) {
        console.log("Deleting items:", itemsToDelete);
        const { error: deleteError } = await supabase
          .from("sales")
          .delete()
          .in("id", itemsToDelete);

        if (deleteError) {
          console.error("Error deleting items:", deleteError);
          throw new Error("Failed to remove deleted items from invoice");
        }
      }

      // Update existing items
      for (const item of items.filter(item => !item.isNew)) {
        console.log("Updating existing item:", item.id, item.product_name);
        const { error: updateError } = await supabase
          .from("sales")
          .update({
            ...customerUpdate,
            price: item.price,
            quantity: item.quantity,
            product_name: item.product_name,
            status: 'active',
          } as any)
          .eq("id" as any, item.id as any);

        if (updateError) {
          console.error("Error updating item:", updateError);
          throw new Error(`Failed to update product: ${item.product_name}`);
        }
      }

      // Insert new items
      if (newItems.length > 0) {
        console.log("Inserting new items:", newItems.length);
        
        const salesData = newItems.map(item => ({
          transaction_id: transaction.transaction_id,
          upc: item.upc,
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          seller_name: transaction.seller_name,
          status: 'active',
          ...customerUpdate,
        }));

        console.log("Sales data to insert:", salesData);

        const { error: insertError } = await supabase
          .from("sales")
          .insert(salesData as any);

        if (insertError) {
          console.error("Error inserting new items:", insertError);
          throw new Error("Failed to add new products to invoice");
        }
      }

      console.log("Invoice update completed successfully");

      // Log invoice edit to audit trail
      try {
        // Get user info - try multiple sources
        let editedBy = 'unknown';
        if (user?.username) {
          editedBy = user.username;
        } else if (user?.id) {
          editedBy = user.id;
        } else if (user?.fullName) {
          editedBy = user.fullName;
        } else {
          // Try to get from localStorage as fallback
          const storedUser = localStorage.getItem('jnk_user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              editedBy = userData.username || userData.id || userData.fullName || 'unknown';
            } catch (e) {
              console.error('Error parsing stored user:', e);
            }
          }
        }
        
        console.log('Logging invoice edit with user:', editedBy);
        
        // Get updated sales data for audit log
        const { data: updatedSales, error: fetchSalesError } = await supabase
          .from("sales")
          .select("*")
          .eq("transaction_id" as any, transaction.transaction_id as any);

        if (fetchSalesError) {
          console.error("Error fetching updated sales for log:", fetchSalesError);
        }

        const newInvoiceData = {
          items: updatedSales || [],
          customer_name: customerName.trim() || null,
          customer_mobile: customerMobile.trim() || null,
          customer_address: customerAddress.trim() || null,
          customer_trn: customerTrn.trim() || null,
          invoice_type: invoiceType,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || null,
          order_comment: orderComment ? orderComment.trim() : null,
          created_at: updatedCreatedAt,
          total_amount: totalAmount,
          item_count: itemCount,
        };

        // Calculate changes summary
        const changesSummary: string[] = [];
        
        // Check customer info changes
        if (previousInvoiceData.customer_name !== newInvoiceData.customer_name) {
          changesSummary.push(`Customer name: "${previousInvoiceData.customer_name || 'None'}" → "${newInvoiceData.customer_name || 'None'}"`);
        }
        if (previousInvoiceData.customer_mobile !== newInvoiceData.customer_mobile) {
          changesSummary.push(`Customer mobile: "${previousInvoiceData.customer_mobile || 'None'}" → "${newInvoiceData.customer_mobile || 'None'}"`);
        }
        if (previousInvoiceData.invoice_type !== newInvoiceData.invoice_type) {
          changesSummary.push(`Invoice type: "${previousInvoiceData.invoice_type}" → "${newInvoiceData.invoice_type}"`);
        }
        if (previousInvoiceData.payment_method !== newInvoiceData.payment_method) {
          changesSummary.push(`Payment method: "${previousInvoiceData.payment_method}" → "${newInvoiceData.payment_method}"`);
        }
        if (previousInvoiceData.payment_reference !== newInvoiceData.payment_reference) {
          changesSummary.push(`Payment reference updated`);
        }
        if (previousInvoiceData.order_comment !== newInvoiceData.order_comment) {
          changesSummary.push(`Order comment updated`);
        }
        if (previousInvoiceData.created_at !== newInvoiceData.created_at) {
          changesSummary.push(`Transaction date changed`);
        }

        // Check items changes
        const previousItemIds = new Set((previousInvoiceData.items || []).map((item: any) => item.id));
        const newItemIds = new Set((newInvoiceData.items || []).map((item: any) => item.id));
        const addedItems = (newInvoiceData.items || []).filter((item: any) => !previousItemIds.has(item.id));
        const removedItems = (previousInvoiceData.items || []).filter((item: any) => !newItemIds.has(item.id));
        
        if (addedItems.length > 0) {
          changesSummary.push(`Added ${addedItems.length} item(s): ${addedItems.map((item: any) => item.product_name).join(', ')}`);
        }
        if (removedItems.length > 0) {
          changesSummary.push(`Removed ${removedItems.length} item(s): ${removedItems.map((item: any) => item.product_name).join(', ')}`);
        }

        // Check for quantity/price changes in existing items
        const previousItemsMap = new Map((previousInvoiceData.items || []).map((item: any) => [item.id, item]));
        (newInvoiceData.items || []).forEach((item: any) => {
          const prevItem = previousItemsMap.get(item.id);
          if (prevItem) {
            if (prevItem.quantity !== item.quantity) {
              changesSummary.push(`${item.product_name}: Quantity ${prevItem.quantity} → ${item.quantity}`);
            }
            if (prevItem.price !== item.price) {
              changesSummary.push(`${item.product_name}: Price AED ${prevItem.price} → AED ${item.price}`);
            }
          }
        });

        if (changesSummary.length === 0) {
          changesSummary.push('No changes detected');
        }

        // Insert audit log
        const logData = {
          invoice_number: transaction.invoice_number || '',
          transaction_id: transaction.transaction_id,
          edited_by: editedBy,
          edited_at: new Date().toISOString(),
          changes_summary: changesSummary,
          previous_data: previousInvoiceData,
          new_data: newInvoiceData,
          edit_reason: null, // Can be added later if needed
        };

        console.log('Attempting to insert invoice edit log:', {
          invoice_number: logData.invoice_number,
          transaction_id: logData.transaction_id,
          edited_by: logData.edited_by,
          changes_count: changesSummary.length
        });

        const { data: logResult, error: logError } = await supabase
          .from("invoice_edit_logs")
          .insert(logData as any)
          .select();

        if (logError) {
          console.error("Error logging invoice edit:", logError);
          console.error("Error details:", JSON.stringify(logError, null, 2));
          
          // Check if table doesn't exist
          if (logError.message?.includes('relation') || logError.message?.includes('does not exist')) {
            console.error("⚠️ invoice_edit_logs table might not exist. Please run the migration: 20251212_create_invoice_edit_logs.sql");
            toast({
              title: "Warning",
              description: "Invoice edit log could not be saved. Please ensure the database migration has been applied.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Warning",
              description: "Invoice updated but edit log could not be saved: " + logError.message,
              variant: "destructive",
            });
          }
        } else {
          console.log(" Invoice edit logged successfully:", logResult);
        }
      } catch (logError: any) {
        console.error("Exception creating invoice edit log:", logError);
        console.error("Exception details:", logError?.message || logError);
        // Don't throw error, invoice update was successful
      }

      toast({
        title: "Invoice Updated",
        description: "Invoice has been successfully updated",
      });

      onSaved();
      onClose();

    } catch (error: any) {
      console.error("Error saving changes:", error);
      const errorMessage = error?.message || "Failed to save changes. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const { totalAmount, subtotal, vatAmount, itemCount } = calculateTotals();

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="w-6 h-6" />
            Edit Invoice - {transaction.invoice_number}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Edit invoice details including customer information, items, and payment details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Info */}
          <div className="bg-secondary/50 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-primary/70 font-medium">Invoice Number</p>
                <p className="font-mono text-primary">{transaction.invoice_number}</p>
              </div>
              <div>
                <p className="text-primary/70 font-medium">Original Date</p>
                <p className="text-primary">{format(new Date(transaction.created_at), "MMM dd, yyyy 'at' hh:mm a")}</p>
              </div>
              <div>
                <p className="text-primary/70 font-medium">Seller</p>
                <p className="text-primary">{transaction.seller_name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value) => {
                  setPaymentMethod(value);
                  if (value === 'cash') setPaymentReference('');
                }}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(paymentMethod === 'card' || paymentMethod === 'bank_transfer') && (
                <div className="space-y-2">
                  <Label htmlFor="paymentReference">Payment Reference</Label>
                  <Input
                    id="paymentReference"
                    placeholder="Enter reference number"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
              {/* Sales Reference / Special Comment - Optional */}
              <div className="space-y-2 col-span-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                  <Label htmlFor="salesReference" className="text-sm font-medium">
                    Sales Reference / Special Comment <span className="text-muted-foreground/70 font-normal">(Optional)</span>
                  </Label>
                </div>
                <Textarea
                  id="salesReference"
                  placeholder="Add sales reference, order notes, or special comments..."
                  value={orderComment}
                  onChange={(e) => setOrderComment(e.target.value)}
                  className="min-h-[70px] bg-muted border-border rounded-lg text-sm placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary/20"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground/70 flex justify-between">
                  <span>This will be saved with the order for reference</span>
                  <span>{orderComment.length}/500</span>
                </p>
              </div>
              {(isAdmin || isAccountant) && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editTransactionDate" className="text-sm sm:text-base">
                    Edit Transaction Date (Last 7 days)
                  </Label>
                  <Input
                    id="editTransactionDate"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => {
                      setTransactionDate(e.target.value);
                      validateTransactionDate(e.target.value);
                    }}
                    min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    className="h-10 sm:h-11 w-full text-base sm:text-lg px-3 sm:px-4 rounded-xl"
                    style={{ 
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield',
                      colorScheme: 'light'
                    }}
                  />
                  {dateValidationError && (
                    <p className="text-xs sm:text-sm text-destructive font-medium">{dateValidationError}</p>
                  )}
                  {transactionDate !== new Date().toISOString().split('T')[0] && !dateValidationError && (
                    <Alert className="bg-amber-50/80 border-amber-200 text-amber-900 py-2 sm:py-3">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <AlertDescription className="ml-2 text-xs sm:text-sm leading-relaxed">
                        Date will be changed to {new Date(transactionDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail Sale</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerMobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="customerMobile"
                    type="tel"
                    placeholder="+971XXXXXXXXX"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <div className="relative">
                  <Input
                    id="customerName"
                    placeholder="Type to search customers..."
                    value={customerSearchTerm}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => {
                      if (customerSearchTerm.length >= 1) {
                        setShowCustomerSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCustomerSuggestions(false), 200);
                    }}
                  />
                  
                  {/* Customer Suggestions */}
                  {showCustomerSuggestions && getCustomerSuggestions().length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {getCustomerSuggestions().map((customer, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="font-medium text-sm">{customer.name}</div>
                          <div className="text-xs text-gray-500">
                            {customer.mobile} {customer.address ? `• ${customer.address}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerAddress">Address</Label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Textarea
                    id="customerAddress"
                    placeholder="Enter customer address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="pl-10 min-h-[60px]"
                  />
                </div>
              </div>

              {invoiceType === "corporate" && (
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="customerTrn">Customer TRN Number</Label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="customerTrn"
                      placeholder="Enter customer TRN number"
                      value={customerTrn}
                      onChange={(e) => setCustomerTrn(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Items */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Invoice Items ({items.length})
              </h3>
            </div>
            
            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No items in this invoice</p>
                <p className="text-sm">Add products below to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.product_name}
                          {item.isNew && <Badge variant="secondary" className="ml-2">New</Badge>}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">UPC: {item.upc}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-16 h-8 text-center"
                          />
                        </div>
                        
                        <X className="text-gray-400 text-sm" />
                        
                        <div className="space-y-1">
                          <Label className="text-xs">Price</Label>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-20 h-8 text-center"
                          />
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-medium">AED {(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove "{item.product_name}" from this invoice?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeItem(item.id)} className="bg-red-600 hover:bg-red-700">
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Product */}
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Product
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newUpc">UPC/Barcode</Label>
                <div className="relative">
                  <Scan className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="newUpc"
                    placeholder="Scan or type UPC"
                    value={newProductUpc}
                    onChange={(e) => handleUpcSearch(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, getProductSuggestions())}
                    onFocus={() => {
                      if (newProductUpc.length >= 2) {
                        setShowProductSuggestions(true);
                        setSearchMode('upc');
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowProductSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }, 200);
                    }}
                    className="pl-10"
                  />
                  {isLoadingProduct && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                  
                  {/* Product Suggestions */}
                  {showProductSuggestions && searchMode === 'upc' && getProductSuggestions().length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-600 font-medium">
                        UPC Search Results • Use ↑↓ to navigate, Enter to select
                      </div>
                      {getProductSuggestions().map((product, index) => (
                        <div
                          key={index}
                          className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                            index === selectedSuggestionIndex 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => selectProduct(product)}
                        >
                          <div className="font-medium text-sm flex items-center gap-2">
                            {product.name}
                            {product.upc.toLowerCase().includes(newProductUpc.toLowerCase()) && 
                             newProductUpc.length >= 2 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">UPC Match</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            UPC: <span className="font-mono">{product.upc}</span> • AED {product.price.toFixed(2)} • Stock: {product.stock}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newName">Product Name</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="newName"
                    placeholder="Search product by name..."
                    value={newProductName}
                    onChange={(e) => handleProductNameSearch(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, getProductNameSuggestions(), true)}
                    onFocus={() => {
                      if (newProductName.length >= 1) {
                        setShowProductSuggestions(true);
                        setSearchMode('name');
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowProductSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }, 200);
                    }}
                    className="pl-10"
                  />
                  
                  {/* Product Name Suggestions */}
                  {showProductSuggestions && searchMode === 'name' && getProductNameSuggestions().length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-600 font-medium">
                        Smart Product Search Results • Use ↑↓ to navigate, Enter to select
                      </div>
                      {getProductNameSuggestions().map((product, index) => (
                        <div
                          key={index}
                          className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                            index === selectedSuggestionIndex 
                              ? 'bg-green-50 border-green-200' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => selectProductFromName(product)}
                        >
                          <div className="font-medium text-sm flex items-center justify-between">
                            <span>{product.name}</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              AED {product.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                            <span>UPC: <span className="font-mono">{product.upc}</span></span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              product.stock > 10 ? 'bg-green-100 text-green-700' : 
                              product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              Stock: {product.stock}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPrice">Price (AED)</Label>
                <Input
                  id="newPrice"
                  type="number"
                  placeholder="0.00"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newQuantity">Quantity</Label>
                <div className="flex gap-2">
                  <Input
                    id="newQuantity"
                    type="number"
                    placeholder="1"
                    value={newProductQuantity}
                    onChange={(e) => setNewProductQuantity(e.target.value)}
                    min="1"
                    className="flex-1"
                  />
                  <Button onClick={addNewItem} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-medium">{itemCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">AED {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (5%):</span>
                <span className="font-medium">AED {vatAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600">AED {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveChanges} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
