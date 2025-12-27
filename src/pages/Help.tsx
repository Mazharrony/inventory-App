import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Settings, 
  Upload, 
  Download,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Info,
  BookOpen
} from "lucide-react";

export default function Help() {
  return (
    <>
      <AppHeader 
        title="Help & Documentation" 
        subtitle="Complete guide to using the JNK Nutrition Sales & Inventory System"
        icon={<BookOpen className="h-8 w-8" />}
      />
      <div className="container mx-auto px-6 py-8 max-w-7xl">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Info className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Info className="h-6 w-6 text-primary" />
                Getting Started
              </CardTitle>
              <CardDescription className="text-base">Quick introduction to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <div className="h-1 w-1 bg-primary rounded-full"></div>
                  What is this system?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  JNK Nutrition Sales & Inventory System is a complete solution for managing your nutrition supplement sales, 
                  tracking inventory, generating invoices, and analyzing business performance.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <div className="h-1 w-1 bg-primary rounded-full"></div>
                  User Roles
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Badge variant="default" className="mt-0.5">Admin</Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">Full access to all features including user management, settings, and inventory control</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-secondary">
                    <Badge variant="secondary" className="mt-0.5">Seller</Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">Can create sales, view analytics, and manage their own profile</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <Badge variant="outline" className="mt-0.5">Accounts</Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">View-only access to sales data and analytics for financial reporting</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <div className="h-1 w-1 bg-primary rounded-full"></div>
                  Navigation
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <div>
                      <strong className="text-foreground">Dashboard:</strong>
                      <span className="ml-2">Main sales interface and recent transactions</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <div>
                      <strong className="text-foreground">Analytics:</strong>
                      <span className="ml-2">Sales reports, charts, and business insights</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <strong className="text-foreground">Inventory:</strong>
                      <span className="ml-2">Product management and stock control (Admin only)</span>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Settings className="h-5 w-5 text-primary" />
                    <div>
                      <strong className="text-foreground">Settings:</strong>
                      <span className="ml-2">User management and system configuration (Admin only)</span>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6 animate-in fade-in-50">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ShoppingCart className="h-6 w-6 text-primary" />
                Creating Sales
              </CardTitle>
              <CardDescription className="text-base">Step-by-step guide to processing transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Step 1: Add Products to Cart</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Scan the product barcode or search by name in the search box</li>
                  <li>Select the product from the dropdown suggestions</li>
                  <li>Product is automatically added to the cart with quantity 1</li>
                  <li>Adjust quantity using the +/- buttons in the cart</li>
                  <li>Remove items by clicking the trash icon</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Step 2: Enter Customer Information (Optional)</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>Customer Name:</strong> Full name for invoice</li>
                  <li><strong>Mobile Number:</strong> Contact information (used for customer lookup)</li>
                  <li><strong>Address:</strong> Delivery or billing address</li>
                  <li><strong>TRN:</strong> Tax Registration Number for business customers</li>
                </ul>
                <div className="mt-2 p-3 bg-secondary/50 border border-primary/20 rounded-md">
                  <p className="text-sm text-primary">
                    <Info className="h-4 w-4 inline mr-1" />
                    Customer info is auto-filled if the mobile number matches an existing customer
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Step 3: Select Payment Method</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex items-start gap-3">
                    <Badge>Cash</Badge>
                    <p className="text-sm text-muted-foreground">Default payment method</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge>Card</Badge>
                    <p className="text-sm text-muted-foreground">Credit/Debit card payment - requires payment reference</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge>Bank Transfer</Badge>
                    <p className="text-sm text-muted-foreground">Direct bank transfer - requires payment reference</p>
                  </div>
                </div>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    For Card/Bank Transfer, enter the transaction reference number in the Payment Reference field
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Step 4: Complete Sale</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Review the cart total and all details</li>
                  <li>Click "Complete Sale" button</li>
                  <li>Invoice is automatically generated with a unique invoice number (JNK-XXXX)</li>
                  <li>View or print the invoice from the popup</li>
                  <li>Cart is cleared for the next sale</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Managing Sales Log</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>View Invoice:</strong> Click the eye icon to view/print invoice</li>
                  <li><strong>Edit Invoice:</strong> Click the edit icon to modify customer details</li>
                  <li><strong>Undo Sale:</strong> Click the undo icon to reverse a transaction (updates stock)</li>
                  <li><strong>Search:</strong> Use the search box to filter sales by customer, product, or invoice number</li>
                  <li><strong>Export:</strong> Download sales data as CSV for reporting</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Undo Sales Transaction</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Locate the sale you want to reverse in the Sales Log table</li>
                  <li>Click the undo icon (curved arrow) next to the sale</li>
                  <li>Enter a reason for undoing the sale (required for audit trail)</li>
                  <li>Confirm the undo operation</li>
                  <li>The system will:
                    <ul className="ml-6 mt-2 space-y-1 list-disc">
                      <li>Restore the product stock to inventory</li>
                      <li>Mark the sale as "undone" in the database</li>
                      <li>Record the undo action in the System Analytics log</li>
                      <li>Track who undid the sale and when</li>
                    </ul>
                  </li>
                </ol>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    <strong>Important:</strong> Undone sales cannot be reversed. This permanently marks the transaction as cancelled and restores inventory.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                Invoice Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="default">Tax Invoice</Badge>
                <p className="text-sm text-muted-foreground">
                  Generated when customer TRN is provided. Includes full tax details for VAT compliance.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">Sales Invoice</Badge>
                <p className="text-sm text-muted-foreground">
                  Standard invoice without TRN. Used for regular retail sales.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6 animate-in fade-in-50">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Package className="h-6 w-6 text-primary" />
                Managing Inventory
              </CardTitle>
              <CardDescription className="text-base">Product and stock management (Admin only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Adding Products Manually</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Product Name:</strong> Enter descriptive product name</li>
                  <li><strong>UPC/Barcode:</strong> Scan or type the product barcode (required, must be unique)</li>
                  <li><strong>Price (AED):</strong> Set the retail price</li>
                  <li><strong>Stock Quantity:</strong> Enter initial stock count</li>
                  <li>Click "Add to Inventory" to save</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Bulk Import - Adding New Products</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Click "Download Template" to get the Excel/CSV template</li>
                  <li>Fill in the template with: name, price, stock (required), upc (optional)</li>
                  <li>Save the file as Excel (.xlsx) or CSV (.csv)</li>
                  <li>Click "Choose File" and select your file</li>
                  <li>Click "Import" to add all products at once</li>
                </ol>
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    INSERT mode: File without product names or partial data will create new products
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Bulk Update - Modifying Existing Products</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Export:</strong> Click "Export" button to download current inventory</li>
                  <li><strong>Edit:</strong> Open the exported file and modify UPC, price, or stock values</li>
                  <li><strong>Keep Product Names:</strong> Do NOT change product names - they identify products</li>
                  <li><strong>Upload:</strong> Import the edited file using "Choose File" → "Import"</li>
                  <li>System matches by Product Name and updates UPC, price, stock</li>
                </ol>
                <div className="mt-2 p-3 bg-secondary/50 border border-primary/20 rounded-md">
                  <p className="text-sm text-primary">
                    <Info className="h-4 w-4 inline mr-1" />
                    UPDATE mode: When all rows have product names, system updates existing products only
                  </p>
                </div>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    <strong>Important:</strong> Product Name is the identifier. Don't change names or products won't be found!
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Editing Products</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li>Click the edit icon (pencil) next to any product</li>
                  <li>Modify name, UPC, price, or stock quantity</li>
                  <li>Click the save icon (checkmark) to confirm changes</li>
                  <li>Click the X icon to cancel editing</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Stock Filters</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>All Stock:</strong> Display all products</li>
                  <li><strong>Low Stock:</strong> Products with less than 10 units (highlighted in yellow)</li>
                  <li><strong>Out of Stock:</strong> Products with 0 stock</li>
                  <li><strong>Negative Stock:</strong> Products with negative quantities (needs attention)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Bulk Update Best Practices</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li> Always export before making bulk changes</li>
                  <li> Keep a backup copy of the exported file</li>
                  <li> Test with 2-3 products first before updating all</li>
                  <li> Use Product Name to identify products (don't change it)</li>
                  <li> You can safely change UPC, price, and stock</li>
                  <li>Don't modify product names in bulk updates</li>
                  <li>Don't add new products with different names</li>
                  <li>Don't use currency symbols (use 25, not $25)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Upload className="h-5 w-5 text-primary" />
                Import File Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  <strong>For Adding New Products (INSERT mode):</strong>
                </p>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  name,upc,price,stock<br/>
                  Protein Powder,1234567890,60,100<br/>
                  Pre-Workout,9876543210,55,50
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  <strong>For Updating Existing Products (UPDATE mode):</strong>
                </p>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  name,upc,price,stock<br/>
                  Protein Powder,NEW-UPC-999,65,80<br/>
                  Pre-Workout,888888,58,45
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  System matches by product name and updates UPC, price, and stock
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 animate-in fade-in-50">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="h-6 w-6 text-primary" />
                Understanding Analytics
              </CardTitle>
              <CardDescription className="text-base">Sales reports and business insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Dashboard Overview</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>Total Sales:</strong> Sum of all completed sales for selected period</li>
                  <li><strong>Transactions:</strong> Number of individual sales transactions</li>
                  <li><strong>Products Sold:</strong> Total quantity of items sold</li>
                  <li><strong>Average Sale:</strong> Average transaction value</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Date Filters</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>Today:</strong> Current day's sales only</li>
                  <li><strong>Yesterday:</strong> Previous day's performance</li>
                  <li><strong>This Week:</strong> Last 7 days of sales data</li>
                  <li><strong>This Month:</strong> Current month from the 1st</li>
                  <li><strong>Last Month:</strong> Previous calendar month</li>
                  <li><strong>Custom Range:</strong> Select specific start and end dates</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Charts & Visualizations</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>Sales Trend Chart:</strong> Daily sales over time</li>
                  <li><strong>Top Products:</strong> Best-selling items by quantity</li>
                  <li><strong>Revenue by Product:</strong> Products generating most revenue</li>
                  <li><strong>Payment Methods:</strong> Distribution of payment types</li>
                  <li><strong>Seller Performance:</strong> Sales breakdown by team member (Admin view)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">System Analytics Tab</h3>
                <p className="text-muted-foreground mb-3">Track all undone sales transactions and system activities</p>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>Undo Logs Table:</strong> Complete history of all reversed transactions</li>
                  <li><strong>Columns Displayed:</strong>
                    <ul className="ml-6 mt-2 space-y-1 list-disc">
                      <li>Product Name - item that was sold and reversed</li>
                      <li>Quantity - number of units reversed</li>
                      <li>Total Amount - refunded sale value</li>
                      <li>Seller Name - who made the original sale</li>
                      <li>Undone By - user who reversed the transaction</li>
                      <li>Reason - explanation for undoing the sale</li>
                      <li>Original Sale Date - when the sale was made</li>
                      <li>Undone At - when the reversal occurred</li>
                      <li>Inventory Restored - stock quantity added back</li>
                    </ul>
                  </li>
                  <li><strong>Seller Stats:</strong> Performance metrics showing sales vs undone transactions by seller</li>
                  <li><strong>Audit Trail:</strong> Complete accountability for all financial reversals</li>
                </ul>
                <div className="mt-3 p-3 bg-secondary/50 border border-primary/20 rounded-md">
                  <p className="text-sm text-primary">
                    <Info className="h-4 w-4 inline mr-1" />
                    All users (Admin, Accountant, Seller) can view undo logs for transparency and audit purposes.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Exporting Reports</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Select the desired date range using filters</li>
                  <li>Click the "Export" button</li>
                  <li>Data is downloaded as CSV file</li>
                  <li>Open in Excel/Google Sheets for further analysis</li>
                  <li>File includes: date, product, quantity, price, total, seller, payment method</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6 animate-in fade-in-50">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Settings className="h-6 w-6 text-primary" />
                User Management (Admin)
              </CardTitle>
              <CardDescription className="text-base">Manage users, roles, and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">Adding New Users</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Navigate to Settings page (Admin only)</li>
                  <li>Enter user's email address</li>
                  <li>Set initial password (user can change later)</li>
                  <li>Assign role: Admin, Seller, or Accounts</li>
                  <li>Click "Add User" to send invitation</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Managing Users</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li><strong>Change Role:</strong> Click edit icon to modify user permissions</li>
                  <li><strong>Deactivate:</strong> Disable user access without deleting account</li>
                  <li><strong>Delete:</strong> Permanently remove user (use with caution)</li>
                  <li><strong>Password Reset:</strong> Users can reset via profile page</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertCircle className="h-5 w-5 text-primary" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Product not found when scanning barcode</h3>
                <p className="text-sm text-muted-foreground">
                  ✓ Ensure the product exists in inventory<br/>
                  ✓ Check if UPC was entered correctly<br/>
                  ✓ Try searching by product name instead
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Bulk import shows "not found" errors</h3>
                <p className="text-sm text-muted-foreground">
                  ✓ Verify Product Name matches exactly (case-insensitive)<br/>
                  ✓ Check for extra spaces in product names<br/>
                  ✓ Ensure you're using the exported file format<br/>
                  ✓ Review console (F12) for detailed error messages
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Stock showing negative numbers</h3>
                <p className="text-sm text-muted-foreground">
                  ✓ Sales were made when stock was already at 0<br/>
                  ✓ Adjust stock quantity in inventory to correct amount<br/>
                  ✓ Use negative stock filter to find affected products
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Can't access certain pages</h3>
                <p className="text-sm text-muted-foreground">
                  ✓ Check your user role (some pages are Admin-only)<br/>
                  ✓ Ensure you're logged in<br/>
                  ✓ Contact admin to verify your permissions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                Keyboard Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Focus search/barcode scanner</span>
                  <Badge variant="outline">Ctrl + K</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">Complete sale</span>
                  <Badge variant="outline">Ctrl + Enter</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm">Clear cart</span>
                  <Badge variant="outline">Ctrl + Delete</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                💻 System Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">Recommended Browsers</h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>✓ Google Chrome (latest version)</li>
                  <li>✓ Microsoft Edge (latest version)</li>
                  <li>✓ Firefox (latest version)</li>
                  <li>✓ Safari 14+ (macOS)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Hardware</h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>✓ Barcode scanner (USB or Bluetooth)</li>
                  <li>✓ Printer for invoices (optional)</li>
                  <li>✓ Stable internet connection</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/10">
              <CardTitle className="flex items-center gap-2 text-xl">
                📧 Support & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                For technical support or feature requests, please contact:
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> hello@meetmazhar.site
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}

