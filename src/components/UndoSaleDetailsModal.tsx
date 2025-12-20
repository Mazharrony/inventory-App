import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  User, 
  Calendar, 
  DollarSign, 
  Hash, 
  CreditCard, 
  FileText,
  Undo2,
  Shield,
  AlertCircle
} from "lucide-react";

interface SaleData {
  product_name?: string;
  upc?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  seller_name?: string;
  payment_method?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_trn?: string;
  invoice_number?: string;
  transaction_id?: string;
  inventory_restored?: boolean;
  created_at?: string;
  [key: string]: any;
}

interface UndoLog {
  id: number;
  sale_id: number | null;
  sale_data: SaleData | null;
  undone_by: string | null;
  undone_at: string | null;
  reason: string | null;
}

interface UndoSaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  undoLog: UndoLog | null;
}

export const UndoSaleDetailsModal = ({ isOpen, onClose, undoLog }: UndoSaleDetailsModalProps) => {
  if (!undoLog) return null;

  const saleData = undoLog.sale_data || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-destructive" />
            Undone Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Undo Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Undo Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Undone Date & Time</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {undoLog.undone_at
                    ? format(new Date(undoLog.undone_at), "PPpp")
                    : "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Undone By</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {undoLog.undone_by || "Unknown User"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <div className="bg-background p-3 rounded border">
                  <p className="text-sm">
                    {undoLog.reason || "No reason provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Product Name</p>
                <p className="font-semibold text-lg">
                  {saleData.product_name || "Unknown Product"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">UPC / Barcode</p>
                <p className="font-mono font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  {saleData.upc || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantity Sold</p>
                <p className="font-bold text-2xl text-primary">
                  {saleData.quantity || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Unit Price</p>
                <p className="font-medium text-lg flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  AED {(saleData.unit_price || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transaction Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="font-bold text-xl text-green-600 dark:text-green-400">
                  AED {(saleData.total || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                <Badge variant="outline" className="mt-1">
                  <CreditCard className="h-3 w-3 mr-1" />
                  {saleData.payment_method || "Cash"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Seller Name</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {saleData.seller_name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invoice Number</p>
                <p className="font-mono font-medium">
                  {saleData.invoice_number || "N/A"}
                </p>
              </div>
              {saleData.transaction_id && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                  <p className="font-mono text-xs bg-background p-2 rounded border break-all">
                    {saleData.transaction_id}
                  </p>
                </div>
              )}
              {saleData.created_at && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Original Sale Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(saleData.created_at), "PPpp")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information (if available) */}
          {(saleData.customer_name || saleData.customer_phone || saleData.customer_trn) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  {saleData.customer_name && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Customer Name</p>
                      <p className="font-medium">{saleData.customer_name}</p>
                    </div>
                  )}
                  {saleData.customer_phone && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                      <p className="font-medium font-mono">{saleData.customer_phone}</p>
                    </div>
                  )}
                  {saleData.customer_trn && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Tax Registration Number (TRN)</p>
                      <p className="font-medium font-mono">{saleData.customer_trn}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Inventory Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Inventory Status
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Inventory Restoration</span>
                {saleData.inventory_restored ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                    ✓ Restored
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    ○ Not Restored
                  </Badge>
                )}
              </div>
              {saleData.inventory_restored && (
                <p className="text-xs text-muted-foreground mt-2">
                  Stock quantity of {saleData.quantity || 0} units has been added back to inventory
                </p>
              )}
            </div>
          </div>

          {/* Additional Data (if any) */}
          {Object.keys(saleData).length > 15 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Additional Information
                </h3>
                <div className="bg-muted/30 p-3 rounded text-xs font-mono overflow-auto max-h-32">
                  <pre>{JSON.stringify(saleData, null, 2)}</pre>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
