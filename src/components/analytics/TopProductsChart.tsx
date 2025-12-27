import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Sale {
  product_name: string | null;
  price: number;
  quantity: number;
}

interface TopProductsChartProps {
  sales: Sale[];
  limit?: number;
}

export const TopProductsChart = ({ sales, limit = 10 }: TopProductsChartProps) => {
  const chartData = useMemo(() => {
    const productMap = new Map<string, { revenue: number; quantity: number }>();
    
    sales.forEach(sale => {
      const productName = sale.product_name || 'Unknown Product';
      const current = productMap.get(productName) || { revenue: 0, quantity: 0 };
      productMap.set(productName, {
        revenue: current.revenue + (sale.price * sale.quantity),
        quantity: current.quantity + sale.quantity
      });
    });
    
    return Array.from(productMap.entries())
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        revenue: Number(data.revenue.toFixed(2)),
        quantity: data.quantity
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }, [sales, limit]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No product data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products by Revenue</CardTitle>
        <p className="text-sm text-muted-foreground">Best performing products</p>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 120, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => {
                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                return value.toString();
              }}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={120}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                padding: '8px 12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`AED ${value.toFixed(2)}`, 'Revenue']}
              labelStyle={{ marginBottom: '4px', fontWeight: 600 }}
            />
            <Bar 
              dataKey="revenue" 
              fill="hsl(var(--primary))" 
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-3 h-3 rounded bg-primary"></div>
            <span>Top {chartData.length} Products</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

