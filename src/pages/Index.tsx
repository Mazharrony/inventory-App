/*
  JNK GENERAL TRADING LLC - Sales & Inventory Management System
  Crafted by: MAZHAR RONY
  Contact: hello@meetmazhar.site
*/

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/client";
import { DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import SaleEntryForm from "@/components/SaleEntryForm";
import SalesLogTable from "@/components/SalesLogTable";
import { AppHeader } from "@/components/AppHeader";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsAuthenticated(true);
      await loadSalesData();
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSalesData = async () => {
    try {
      const { data } = await supabase
        .from("sales")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (data) {
        setSales(data);
      }
    } catch (error) {
      console.error('Sales fetch error:', error);
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
  const todaysSales = getTodaysSales(sales);
  const todayRevenue = todaysSales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0);
  const todayItemsSold = todaysSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const todayActiveSellers = new Set(todaysSales.map((sale) => sale.seller_name)).size;

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Loading Dashboard...</h2>
          <p className="text-muted-foreground">Please wait</p>
          <div className="mt-4 flex justify-center">
            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary rounded-full animate-pulse-modern" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-primary-foreground animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Loading Dashboard...</h2>
          <p className="text-muted-foreground">Please wait while we load your sales data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <AppHeader
        title="JNK GENERAL TRADING LLC"
        subtitle="Sales Dashboard"
        icon={<DollarSign className="w-6 h-6 text-primary-foreground" />}
      />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Today's Performance</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
