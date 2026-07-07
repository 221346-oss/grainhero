"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    CreditCard,
    Building2,
    Calendar,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    Clock,
    Download
} from "lucide-react"
import { api } from "@/lib/api"
import { DataTable } from "@/components/dashboard/DataTable"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Subscription {
    _id: string
    plan_name: string
    admin_id?: {
        name: string
        email: string
    }
    status: string
    price_per_month: number
    billing_cycle: string
    start_date: string
    end_date: string
    payment_status: string
    [key: string]: unknown
}

export default function SubscriptionManagementPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const [, setLoading] = useState(true)
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])

    useEffect(() => {
        loadSubscriptions()
    }, [])

    const loadSubscriptions = async () => {
        try {
            setLoading(true)
            const res = await api.get<Subscription[]>("/api/super-admin/subscriptions")
            if (res.ok && res.data) {
                setSubscriptions(res.data)
            } else {
                toast.error("Failed to load subscriptions")
            }
        } catch (_error) {
            toast.error("An error occurred loading subscriptions")
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        {
            key: "customer",
            label: "Customer",
            render: (_value: unknown, row: Subscription) => (
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{row.admin_id?.name || "Unknown Customer"}</div>
                        <div className="text-sm text-gray-500">{row.admin_id?.email || "No email"}</div>
                    </div>
                </div>
            )
        },
        {
            key: "plan",
            label: "Plan Details",
            render: (_value: unknown, row: Subscription) => (
                <div>
                    <div className="font-medium">{row.plan_name}</div>
                    <div className="text-sm text-gray-500 capitalize">{row.billing_cycle}</div>
                </div>
            )
        },
        {
            key: "price",
            label: "Amount",
            render: (_value: unknown, row: Subscription) => (
                <div className="font-medium">
                    PKR {row.price_per_month.toLocaleString()} <span className="text-gray-400 font-normal">/mo</span>
                </div>
            )
        },
        {
            key: "dates",
            label: "Subscription Period",
            render: (_value: unknown, row: Subscription) => (
                <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(row.start_date).toLocaleDateString()} - {new Date(row.end_date).toLocaleDateString()}</span>
                    </div>
                </div>
            )
        },
        {
            key: "status",
            label: "Status",
            render: (_value: unknown, row: Subscription) => (
                <div className="space-y-1">
                    <Badge variant={row.status === 'active' ? 'default' : 'secondary'}
                        className={row.status === 'active' ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}>
                        {row.status}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs">
                        {row.payment_status === 'paid' ? (
                            <span className="text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Paid</span>
                        ) : row.payment_status === 'pending' ? (
                            <span className="text-amber-600 flex items-center"><Clock className="h-3 w-3 mr-1" /> Pending</span>
                        ) : (
                            <span className="text-red-600 flex items-center"><XCircle className="h-3 w-3 mr-1" /> Failed</span>
                        )}
                    </div>
                </div>
            )
        }
    ]

    const columnsWithActions = [
        ...columns,
        {
            key: "actions",
            label: "Actions",
            render: (_value: unknown, row: Subscription) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row._id)}>
                            Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" /> Download Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={async () => {
                                const newPlan = prompt("Enter new plan name (Starter, Professional, or Enterprise):", row.plan_name)
                                if (newPlan && newPlan !== row.plan_name) {
                                    try {
                                        const res = await api.patch(`/api/super-admin/subscriptions/${row._id}`, { plan_name: newPlan })
                                        if (res.ok) {
                                            toast.success("Plan updated successfully")
                                            loadSubscriptions()
                                        } else {
                                            toast.error(res.error || "Failed to update plan")
                                        }
                                    } catch (_error) {
                                        toast.error("An error occurred")
                                    }
                                }
                            }}
                        >
                            <CreditCard className="mr-2 h-4 w-4" /> Update Plan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {row.status === 'active' && (
                            <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={async () => {
                                    if (confirm("Are you sure you want to cancel this subscription? The user's access will be revoked.")) {
                                        try {
                                            const res = await api.delete(`/api/super-admin/subscriptions/${row._id}`)
                                            if (res.ok) {
                                                toast.success("Subscription cancelled successfully")
                                                loadSubscriptions()
                                            } else {
                                                toast.error(res.error || "Failed to cancel subscription")
                                            }
                                        } catch (_error) {
                                            toast.error("An error occurred")
                                        }
                                    }
                                }}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel Subscription
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ]

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Subscription Management
                    </h2>
                    <p className="text-muted-foreground">
                        Monitor revenue and manage customer subscriptions
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md">
                        Create Plan
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-indigo-600">Total MRR</p>
                            <CreditCard className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="text-2xl font-bold text-indigo-900">PKR {subscriptions.reduce((acc, sub) => sub.status === 'active' ? acc + sub.price_per_month : acc, 0).toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-green-600">Active Subscriptions</p>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-green-900">{subscriptions.filter(s => s.status === 'active').length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-amber-600">Trials Ending Soon</p>
                            <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="text-2xl font-bold text-amber-900">0</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-red-600">Churned (This Month)</p>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="text-2xl font-bold text-red-900">0</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-md border-0 ring-1 ring-gray-200">
                <CardContent className="p-0">
                    <DataTable
                        title=""
                        data={subscriptions}
                        columns={columnsWithActions}
                        actions={[]}
                        emptyMessage="No subscriptions found"
                    />
                </CardContent>
            </Card>
        </div>
    )
}
