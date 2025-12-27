import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Sale {
  payment_method?: string;
  price: number;
  quantity: number;
}

interface PaymentMethodChartProps {
  sales: Sale[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--foreground))',
  'hsl(var(--muted))',
];

export const PaymentMethodChart = ({ sales }: PaymentMethodChartProps) => {
  const chartData = useMemo(() => {
    const methodMap = new Map<string, number>();
    
    sales.forEach(sale => {
      const method = sale.payment_method || 'cash';
      const current = methodMap.get(method) || 0;
      methodMap.set(method, current + (sale.price * sale.quantity));
    });
    
    const total = Array.from(methodMap.values()).reduce((sum, val) => sum + val, 0);
    
    return Array.from(methodMap.entries())
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
        value: Number(value.toFixed(2)),
        percentage: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No payment data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">Revenue breakdown by payment type</p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={90}
                fill="hsl(var(--primary))"
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => `AED ${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">AED {item.value.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

