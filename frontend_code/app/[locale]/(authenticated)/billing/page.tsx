"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
    CreditCard,
    Receipt,
    Calendar,
    DollarSign,
    Package,
    Users,
    Download,
    ArrowLeft,
    //CheckCircle2,
    //AlertCircle
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface PlanInfo {
    name: string
    price: number
    billingCycle: string
    features: Record<string, boolean>
    limits: {
        users: { total: number | string }
        grain_batches: { total: number | string }
        storage_gb: { total: number | string }
    }
}

interface UsageStats {
    users: {
        managers: number
        technicians: number
        total: number
    }
    grain_batches: number
    storage_gb: number
    api_calls_this_month: number
}

interface BillingHistory {
    id: string
    date: string
    amount: number
    status: 'paid' | 'pending' | 'failed'
    description: string
}

export default function BillingPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
    const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])

    useEffect(() => {
        const fetchBillingData = async () => {
            try {
                setLoading(true)
                const [planRes] = await Promise.all([
                    api.get<{ plan: PlanInfo; usage: UsageStats }>("/api/plan-management/plan-info")
                ])

                if (planRes.ok && planRes.data) {
                    setPlanInfo(planRes.data.plan)
                    setUsageStats(planRes.data.usage)

                    // Mock billing history - replace with real API call when available
                    setBillingHistory([
                        {
                            id: '1',
                            date: new Date().toISOString(),
                            amount: planRes.data.plan.price,
                            status: 'paid',
                            description: `${planRes.data.plan.name} - ${planRes.data.plan.billingCycle}`
                        }
                    ])
                }
            } catch (error) {
                console.error('Error fetching billing data:', error)
                toast.error('Failed to load billing information')
            } finally {
                setLoading(false)
            }
        }

        fetchBillingData()
    }, [])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'PKR'
        }).format(amount)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading billing information...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
                        <p className="text-muted-foreground">
                            Manage your subscription, view usage, and billing history
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Current Plan */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Current Plan
                        </CardTitle>
                        <CardDescription>
                            Your active subscription details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {planInfo && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold">{planInfo.name}</h3>
                                        <p className="text-muted-foreground">
                                            {formatCurrency(planInfo.price)}/{planInfo.billingCycle}
                                        </p>
                                    </div>
                                    <Badge variant="default" className="text-lg px-4 py-2">
                                        Active
                                    </Badge>
                                </div>

                                <Separator />

                                {/* Usage Stats */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold">Current Usage</h4>

                                    {usageStats && (
                                        <>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        Users
                                                    </span>
                                                    <span>
                                                        {usageStats.users.total} / {planInfo.limits.users.total === 'unlimited' ? '∞' : planInfo.limits.users.total}
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={
                                                        planInfo.limits.users.total === 'unlimited' ? 0 :
                                                            typeof planInfo.limits.users.total === 'number'
                                                                ? (usageStats.users.total / planInfo.limits.users.total) * 100
                                                                : 0
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="flex items-center gap-2">
                                                        <Package className="h-4 w-4" />
                                                        Grain Batches
                                                    </span>
                                                    <span>
                                                        {usageStats.grain_batches} / {planInfo.limits.grain_batches.total === 'unlimited' ? '∞' : planInfo.limits.grain_batches.total}
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={
                                                        planInfo.limits.grain_batches.total === 'unlimited' ? 0 :
                                                            typeof planInfo.limits.grain_batches.total === 'number'
                                                                ? (usageStats.grain_batches / planInfo.limits.grain_batches.total) * 100
                                                                : 0
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="flex items-center gap-2">
                                                        <DollarSign className="h-4 w-4" />
                                                        Storage
                                                    </span>
                                                    <span>
                                                        {usageStats.storage_gb.toFixed(1)} GB / {planInfo.limits.storage_gb.total === 'unlimited' ? '∞' : planInfo.limits.storage_gb.total} GB
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={
                                                        planInfo.limits.storage_gb.total === 'unlimited' ? 0 :
                                                            typeof planInfo.limits.storage_gb.total === 'number'
                                                                ? (usageStats.storage_gb / planInfo.limits.storage_gb.total) * 100
                                                                : 0
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <Separator />

                                <div className="flex gap-2">
                                    <Button onClick={() => router.push('/plans')}>
                                        Upgrade Plan
                                    </Button>
                                    <Button variant="outline" onClick={() => router.push('/dashboard?tab=usage')}>
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/plans')}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Change Plan
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Payment method management coming soon')}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Payment Method
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Invoice download coming soon')}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Invoice
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Billing History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Billing History
                    </CardTitle>
                    <CardDescription>
                        Your recent invoices and payments
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {billingHistory.length > 0 ? (
                        <div className="space-y-4">
                            {billingHistory.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.description}</p>
                                            <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(item.amount)}</p>
                                            <Badge
                                                variant={
                                                    item.status === 'paid' ? 'default' :
                                                        item.status === 'pending' ? 'secondary' :
                                                            'destructive'
                                                }
                                                className="mt-1"
                                            >
                                                {item.status}
                                            </Badge>
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-muted-foreground">No billing history available</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

