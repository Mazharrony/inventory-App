import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StockMovement {
  created_at: string;
  quantity_added: number;
  movement_type: string;
}

interface StockMovementChartProps {
  movements: StockMovement[];
  dateRange: { start: Date; end: Date };
}

export const StockMovementChart = ({ movements, dateRange }: StockMovementChartProps) => {
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayMovements = movements.filter(movement => {
        const movementDate = new Date(movement.created_at);
        return movementDate >= dayStart && movementDate <= dayEnd;
      });
      
      const totalAdded = dayMovements.reduce((sum, m) => sum + m.quantity_added, 0);
      const count = dayMovements.length;
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: format(day, 'yyyy-MM-dd'),
        quantity: totalAdded,
        movements: count
      };
    });
  }, [movements, dateRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Import Trends</CardTitle>
        <p className="text-sm text-muted-foreground">Daily stock additions over time</p>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
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
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                padding: '8px 12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [value, 'Units Added']}
              labelStyle={{ marginBottom: '4px', fontWeight: 600 }}
            />
            <Line 
              type="monotone" 
              dataKey="quantity" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2.5}
              dot={{ fill: 'hsl(var(--primary))', r: 3, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              activeDot={{ r: 5 }}
              name="Units Added"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>Daily Stock Additions</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

