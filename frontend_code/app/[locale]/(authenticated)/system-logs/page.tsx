'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function SystemLogsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const logs = [
    { level: 'info', message: 'Server started', time: 'now' },
    { level: 'warn', message: 'Low storage on node-1', time: '2m' },
    { level: 'error', message: 'Webhook retry scheduled', time: '10m' },
  ]

  const volume = [
    { t: '00:00', count: 2 },
    { t: '04:00', count: 5 },
    { t: '08:00', count: 18 },
    { t: '12:00', count: 22 },
    { t: '16:00', count: 15 },
    { t: '20:00', count: 7 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">System Logs</h1>
        <Link href="../security-center" className="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">Security Center</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Log Volume</CardTitle>
          <CardDescription>Events over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ count: { label: 'Logs', color: 'hsl(var(--chart-4))' } }}>
            <AreaChart data={volume} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.15} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="bg-white border rounded-lg divide-y">
        {logs.map((l, i) => (
          <div key={i} className="p-3 flex items-center justify-between text-sm">
            <span className="uppercase text-xs font-medium text-gray-500">{l.level}</span>
            <span className="flex-1 px-3 text-gray-800">{l.message}</span>
            <span className="text-gray-400">{l.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


