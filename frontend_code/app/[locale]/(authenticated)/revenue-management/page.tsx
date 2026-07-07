'use client'

import Link from 'next/link'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Bar, BarChart, Pie, PieChart, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RevenueManagementPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const mrrData = [
    { month: 'Jan', mrr: 0 },
    { month: 'Feb', mrr: 0 },
    { month: 'Mar', mrr: 0 },
    { month: 'Apr', mrr: 0 },
    { month: 'May', mrr: 0 },
    { month: 'Jun', mrr: 0 },
  ]

  const subscribersData = [
    { plan: 'Starter', users: 0 },
    { plan: 'Professional', users: 0 },
    { plan: 'Enterprise', users: 0 },
  ]

  const planSplit = [
    { name: 'Starter', value: 1, color: 'hsl(var(--chart-1))' },
    { name: 'Professional', value: 1, color: 'hsl(var(--chart-2))' },
    { name: 'Enterprise', value: 1, color: 'hsl(var(--chart-3))' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Revenue Management</h1>
        <Link href="../plan-management" className="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">Manage Plans</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="font-medium mb-2">MRR</h2>
          <p className="text-3xl font-semibold">Rs. 0</p>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="font-medium mb-2">Active Subscribers</h2>
          <p className="text-3xl font-semibold">0</p>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="font-medium mb-2">Churn</h2>
          <p className="text-3xl font-semibold">0%</p>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="font-medium mb-2">ARPU</h2>
          <p className="text-3xl font-semibold">Rs. 0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>MRR Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ mrr: { label: 'MRR', color: 'hsl(var(--chart-1))' } }}>
              <LineChart data={mrrData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="mrr" stroke="var(--color-mrr)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscribers by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ users: { label: 'Users', color: 'hsl(var(--chart-2))' } }}>
              <BarChart data={subscribersData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="plan" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ split: { label: 'Plan', color: 'hsl(var(--chart-1))' } }}>
            <PieChart>
              <Pie data={planSplit} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                {planSplit.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="bg-white border rounded-lg">
        <div className="px-4 py-3 border-b font-medium">Recent Subscriptions</div>
        <div className="divide-y text-sm">
          <div className="px-4 py-3 flex justify-between"><span>Acme Farm</span><span className="text-gray-500">Enterprise • Rs. 5,999/mo</span></div>
          <div className="px-4 py-3 flex justify-between"><span>Green Co-op</span><span className="text-gray-500">Starter • Rs. 1,499/mo</span></div>
        </div>
      </div>
    </div>
  )
}


