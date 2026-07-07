'use client'

import Link from 'next/link'
import { Shield, KeyRound, AlertTriangle, Database, Globe, Activity, Users, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {  XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

export default function SecurityCenterPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const authEvents = [
    { hour: '00', success: 12, failed: 1 },
    { hour: '04', success: 18, failed: 0 },
    { hour: '08', success: 42, failed: 5 },
    { hour: '12', success: 53, failed: 3 },
    { hour: '16', success: 39, failed: 2 },
    { hour: '20', success: 27, failed: 1 },
  ]

  const roleSplit = [
    { name: 'Super Admin', value: 1, color: 'hsl(var(--chart-1))' },
    { name: 'Admin', value: 3, color: 'hsl(var(--chart-2))' },
    { name: 'Manager', value: 5, color: 'hsl(var(--chart-3))' },
    { name: 'Technician', value: 7, color: 'hsl(var(--chart-4))' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Security Center</h1>
        <div className="flex gap-2">
          <Link href="../system-logs" className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200">View System Logs</Link>
          <Link href="../server-monitoring" className="px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">Server Monitoring</Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Admins" value={4} icon={Users} description="Total privileged users" />
        <StatCard title="Blocked Users" value={0} icon={Lock} description="Require review" />
        <StatCard title="Failed Logins" value={12} icon={AlertTriangle} trend={{ value: 3, label: 'today', positive: false }} />
        <StatCard title="Policy Score" value="A" icon={Shield} description="Compliant" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <section className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-gray-600"/><h2 className="font-medium">Auth & Roles</h2></div>
          <h2 className="font-medium mb-2">Auth & Roles</h2>
          <p className="text-sm text-gray-600 mb-4">Overview of authentication status, role assignments and privileged users.</p>
          <div className="flex gap-2">
            <Link href="../admin-management" className="text-blue-600 hover:underline">Manage Customers</Link>
            <Link href="../plan-management" className="text-blue-600 hover:underline">Manage Plans</Link>
          </div>
        </section>

        <section className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2 mb-2"><KeyRound className="h-4 w-4 text-gray-600"/><h2 className="font-medium">Policies</h2></div>
          <p className="text-sm text-gray-600 mb-4">Password rules, session lifetimes, audit retention and API access.</p>
          <div className="text-sm text-gray-500">All policy controls are simulated for this demo.</div>
        </section>

        <section className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-gray-600"/><h2 className="font-medium">Alerts</h2></div>
          <p className="text-sm text-gray-600 mb-4">Failed logins, permission denials and unusual activity.</p>
          <Link href="../global-analytics" className="text-blue-600 hover:underline">Open Global Analytics</Link>
        </section>
        <section className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2 mb-2"><Database className="h-4 w-4 text-gray-600"/><h2 className="font-medium">Audit Trails</h2></div>
          <p className="text-sm text-gray-600 mb-4">Review sensitive configuration changes and export trails.</p>
          <Link href="../system-logs" className="text-blue-600 hover:underline">Go to System Logs</Link>
        </section>
        <section className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2 mb-2"><Globe className="h-4 w-4 text-gray-600"/><h2 className="font-medium">Domains & Webhooks</h2></div>
          <p className="text-sm text-gray-600 mb-4">Manage allowed origins and webhook endpoints.</p>
          <div className="text-sm text-gray-500">Connected: api.grainhero.local</div>
        </section>
        <section className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-gray-600"/><h2 className="font-medium">Health</h2></div>
          <p className="text-sm text-gray-600 mb-4">Service uptime and component status.</p>
          <Link href="../system-health" className="text-blue-600 hover:underline">View System Health</Link>
        </section>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Authentication Events</CardTitle>
            <CardDescription>Success vs failed sign-ins today</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ success: { label: 'Success', color: 'hsl(var(--chart-2))' }, failed: { label: 'Failed', color: 'hsl(var(--chart-1))' } }}>
              <BarChart data={authEvents} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="success" fill="var(--color-success)" radius={4} />
                <Bar dataKey="failed" fill="var(--color-failed)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Distribution across roles</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ split: { label: 'Roles', color: 'hsl(var(--chart-3))' } }}>
              <PieChart>
                <Pie data={roleSplit} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {roleSplit.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


