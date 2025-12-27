/*
  JNK GENERAL TRADING LLC - Sales & Inventory Management System
  Crafted by: MAZHAR RONY
  Contact: hello@meetmazhar.site
*/

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/client";
import { DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { useMemo, useCallback } from "react";
import { StatsCard } from "@/components/StatsCard";
import SaleEntryForm from "@/components/SaleEntryForm";
import SalesLogTable from "@/components/SalesLogTable";
import { AppHeader } from "@/components/AppHeader";
import { logger } from "@/lib/logger";

type Sale = {
  id: string;
  upc: string;
  product_name: string | null;
  price: number;
  quantity: number;
  seller_name: string;
  created_at: string;
  status: string;
  deactivation_reason: string | null;
  deactivated_at: string | null;
};

const Index = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logger.debug('Index component mounted', { clientType: supabase?.constructor?.name }, 'Index');
    loadData();
  }, []);

  const loadData = async () => {
    try {
      logger.debug('Loading sales data', undefined, 'Index');
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Data load timeout')), 5000)
      );
      
      await Promise.race([loadSalesData(), timeoutPromise]);
      logger.debug('Sales data loaded successfully', undefined, 'Index');
    } catch (error) {
      logger.error('Failed to load sales data', error, 'Index');
      setSales([]); // Ensure sales is set even on error
    } finally {
      // Always set loading to false, even on error
      setIsLoading(false);
    }
  };

  const loadSalesData = async () => {
    try {
      const query = supabase
        .from("sales")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      const result = await query;
      const { data, error } = result;

      if (error) {
        logger.error('Sales fetch error', error, 'Index');
        setSales([]); // Set empty array on error
        return;
      }

      logger.debug('Sales data received', { count: data?.length || 0 }, 'Index');
      // Always set sales, even if empty
      setSales(data || []);
    } catch (error) {
      logger.error('Sales fetch exception', error, 'Index');
      setSales([]); // Set empty array on error
    }
  };

  const getTodaysSales = (salesData: Sale[]) => {
    const today = new Date();
    return salesData.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.toDateString() === today.toDateString();
    });
  };

  // Calculate today's stats
  const handleSaleAdded = () => {
    loadSalesData();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSalesChange = () => {
    loadSalesData();
  };
  // Memoize expensive calculations
  const todaysSales = useMemo(() => getTodaysSales(sales), [sales, getTodaysSales]);
  const todayRevenue = useMemo(() => 
    todaysSales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0),
    [todaysSales]
  );
  const todayItemsSold = useMemo(() => 
    todaysSales.reduce((sum, sale) => sum + sale.quantity, 0),
    [todaysSales]
  );
  const todayActiveSellers = useMemo(() => 
    new Set(todaysSales.map((sale) => sale.seller_name)).size,
    [todaysSales]
  );

  // Timeout fallback to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        logger.warn('Loading timeout - forcing render', undefined, 'Index');
        setIsLoading(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse" />
            <div className="absolute inset-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-xl">
              <Package className="w-10 h-10 text-primary-foreground drop-shadow-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Loading Dashboard...</h2>
            <p className="text-muted-foreground text-sm">Preparing your data</p>
          </div>
          <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-primary via-primary/70 to-primary rounded-full animate-pulse" style={{width: '60%'}} />
          </div>
        </div>
      </div>
    );
  }


  // Show loading screen while initializing (removed duplicate check)
  // Note: isAuthenticated check removed - ProtectedRoute handles auth

  // Always render something - remove try-catch from render (React doesn't support it)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <AppHeader
        title="JNK GENERAL TRADING LLC"
        subtitle="Sales Dashboard"
        icon={<DollarSign className="w-6 h-6 text-primary-foreground" />}
      />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 animate-fade-in space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Today's Performance
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground ml-15 font-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="animate-slide-in-left" style={{animationDelay: '0.1s'}}>
            <StatsCard
              title="Today's Revenue"
              value={`AED ${todayRevenue.toFixed(2)}`}
              icon={DollarSign}
              iconColor="bg-primary"
            />
          </div>
          <div className="animate-slide-in-left" style={{animationDelay: '0.2s'}}>
            <StatsCard
              title="Items Sold Today"
              value={todayItemsSold}
              icon={Package}
              iconColor="bg-primary"
            />
          </div>
          <div className="animate-slide-in-right" style={{animationDelay: '0.3s'}}>
            <StatsCard
              title="Today's Transactions"
              value={todaysSales.length}
              icon={TrendingUp}
              iconColor="bg-primary"
            />
          </div>
          <div className="animate-slide-in-right" style={{animationDelay: '0.4s'}}>
            <StatsCard
              title="Active Sellers Today"
              value={todayActiveSellers}
              icon={Users}
              iconColor="bg-primary"
            />
          </div>
        </div>

        <div className="mb-6 sm:mb-8 animate-fade-in" style={{animationDelay: '0.5s'}}>
          <SaleEntryForm onSaleAdded={handleSaleAdded} />
        </div>

        <div className="animate-fade-in" style={{animationDelay: '0.6s'}}>
          <SalesLogTable refreshTrigger={refreshTrigger} onSalesChange={handleSalesChange} />
        </div>
      </main>
    </div>
  );
};

export default Index;
