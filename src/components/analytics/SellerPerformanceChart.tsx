import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SellerStat {
  seller_name: string;
  total_sales: number;
  total_revenue: number;
  total_items: number;
  avg_sale_value: number;
  undo_count: number;
}

interface SellerPerformanceChartProps {
  sellerStats: SellerStat[];
  metric: 'revenue' | 'sales' | 'items';
}

export const SellerPerformanceChart = ({ sellerStats, metric }: SellerPerformanceChartProps) => {
  const chartData = useMemo(() => {
    return sellerStats
      .slice(0, 10)
      .map(stat => ({
        name: stat.seller_name.length > 15 ? stat.seller_name.substring(0, 15) + '...' : stat.seller_name,
        fullName: stat.seller_name,
        revenue: Number(stat.total_revenue.toFixed(2)),
        sales: stat.total_sales,
        items: stat.total_items
      }))
      .sort((a, b) => {
        if (metric === 'revenue') return b.revenue - a.revenue;
        if (metric === 'sales') return b.sales - a.sales;
        return b.items - a.items;
      });
  }, [sellerStats, metric]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seller Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No seller data available</p>
        </CardContent>
      </Card>
    );
  }

  const getMetricLabel = () => {
    if (metric === 'revenue') return 'Revenue (AED)';
    if (metric === 'sales') return 'Total Sales';
    return 'Items Sold';
  };

  const getDataKey = () => {
    if (metric === 'revenue') return 'revenue';
    if (metric === 'sales') return 'sales';
    return 'items';
  };

  const formatValue = (value: number) => {
    if (metric === 'revenue') return `AED ${value.toFixed(2)}`;
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Sellers by {getMetricLabel()}</CardTitle>
        <p className="text-sm text-muted-foreground">Performance comparison</p>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => {
                if (metric === 'revenue' && value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                return value.toString();
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                padding: '8px 12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [formatValue(value), getMetricLabel()]}
              labelStyle={{ marginBottom: '4px', fontWeight: 600 }}
            />
            <Bar 
              dataKey={getDataKey()} 
              fill="hsl(var(--primary))" 
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

