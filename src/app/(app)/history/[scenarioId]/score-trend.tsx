'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ScoreTrendProps {
  data: Array<{ attempt: number; score: number }>;
}

export function ScoreTrend({ data }: ScoreTrendProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis
            dataKey="attempt"
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v) => `#${v}`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: 13,
            }}
            formatter={(value: number) => [value, 'Score']}
            labelFormatter={(label: number) => `Attempt ${label}`}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
