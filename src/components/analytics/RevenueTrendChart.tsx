import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, eachDayOfInterval, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Sale {
  created_at: string;
  price: number;
  quantity: number;
}

interface RevenueTrendChartProps {
  sales: Sale[];
  dateRange: { start: Date; end: Date };
}

export const RevenueTrendChart = ({ sales, dateRange }: RevenueTrendChartProps) => {
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });
      
      const revenue = daySales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0);
      const items = daySales.reduce((sum, sale) => sum + sale.quantity, 0);
      const transactions = new Set(daySales.map(s => s.created_at)).size;
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: format(day, 'yyyy-MM-dd'),
        revenue: Number(revenue.toFixed(2)),
        items,
        transactions
      };
    });
  }, [sales, dateRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
        <p className="text-sm text-muted-foreground">Daily revenue and sales performance</p>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '11px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => {
                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                return value.toString();
              }}
              width={50}
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
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2.5}
              dot={{ fill: 'hsl(var(--primary))', r: 3, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              activeDot={{ r: 5 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>Daily Revenue</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

