'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function ServerMonitoringPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const cpu = [
    { t: '00', v: 30 }, { t: '04', v: 35 }, { t: '08', v: 60 }, { t: '12', v: 48 }, { t: '16', v: 52 }, { t: '20', v: 40 }
  ]
  const mem = [
    { t: '00', v: 40 }, { t: '04', v: 42 }, { t: '08', v: 70 }, { t: '12', v: 65 }, { t: '16', v: 72 }, { t: '20', v: 60 }
  ]
  const net = [
    { t: '00', v: 10 }, { t: '04', v: 12 }, { t: '08', v: 22 }, { t: '12', v: 18 }, { t: '16', v: 25 }, { t: '20', v: 16 }
  ]
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Server Monitoring</h1>
        <Link href="../system-health" className="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">System Health</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CPU</CardTitle>
            <CardDescription>Average utilization %</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ v: { label: 'CPU %', color: 'hsl(var(--chart-1))' } }}>
              <LineChart data={cpu} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="v" stroke="var(--color-v)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Memory</CardTitle>
            <CardDescription>Average usage %</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ v: { label: 'Memory %', color: 'hsl(var(--chart-2))' } }}>
              <LineChart data={mem} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="v" stroke="var(--color-v)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
            <CardDescription>Throughput MB/s</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ v: { label: 'MB/s', color: 'hsl(var(--chart-3))' } }}>
              <LineChart data={net} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="v" stroke="var(--color-v)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


