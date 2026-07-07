"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Users,
    Building2,
    MoreHorizontal,
    Mail,
    Shield,
    Search,
    UserCheck
} from "lucide-react"
import { api } from "@/lib/api"
import { DataTable } from "@/components/dashboard/DataTable"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface User {
    _id: string
    name: string
    email: string
    role: string
    admin_id?: {
        name: string
        _id: string
    }
    is_active: boolean
    two_factor_enabled: boolean
    last_login?: string
    [key: string]: unknown
}

export default function UserManagementPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const [, setLoading] = useState(true)
    const [users, setUsers] = useState<User[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            setLoading(true)
            const res = await api.get<User[]>("/api/super-admin/users")
            if (res.ok && res.data) {
                setUsers(res.data)
            } else {
                toast.error("Failed to load users")
            }
        } catch (_error) {
            toast.error("An error occurred loading users")
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.admin_id?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const columns = [
        {
            key: "user",
            label: "User",
            render: (_value: unknown, row: User) => (
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
                        {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-sm text-gray-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            key: "role",
            label: "Role & Access",
            render: (_value: unknown, row: User) => (
                <div className="space-y-1">
                    <Badge variant={
                        row.role === 'admin' ? 'default' :
                            row.role === 'manager' ? 'secondary' : 'outline'
                    }>
                        {row.role}
                    </Badge>
                    {row.two_factor_enabled && (
                        <div className="flex items-center text-xs text-green-600">
                            <Shield className="h-3 w-3 mr-1" /> 2FA Enabled
                        </div>
                    )}
                </div>
            )
        },
        {
            key: "customer",
            label: "Organization",
            render: (_value: unknown, row: User) => (
                <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-3 w-3 mr-2" />
                    {row.admin_id?.name || "No Organization"}
                </div>
            )
        },
        {
            key: "activity",
            label: "Last Active",
            render: (_value: unknown, row: User) => (
                <div className="text-sm text-gray-500">
                    {row.last_login ? new Date(row.last_login).toLocaleString() : "Never"}
                </div>
            )
        },
        {
            key: "status",
            label: "Status",
            render: (_value: unknown, row: User) => (
                <Badge variant={row.is_active ? "outline" : "destructive"}
                    className={row.is_active ? "text-green-600 border-green-200 bg-green-50" : ""}>
                    {row.is_active ? "Active" : "Inactive"}
                </Badge>
            )
        }
    ]

    const columnsWithActions = [
        ...columns,
        {
            key: "actions",
            label: "Actions",
            render: (_value: unknown, row: User) => (
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
                            Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className={row.is_active ? "text-red-600" : "text-green-600"}>
                            {row.is_active ? "Deactivate User" : "Activate User"}
                        </DropdownMenuItem>
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
                        User Management
                    </h2>
                    <p className="text-muted-foreground">
                        Monitor and manage users across all customers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary">
                        <Mail className="mr-2 h-4 w-4" /> Broadcast Email
                    </Button>
                </div>
            </div>

            <div className="flex items-center py-4 bg-white p-4 rounded-lg border shadow-sm space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Search users, emails, roles..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="max-w-sm border-0 focus-visible:ring-0 pl-1"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-blue-600">Total Users</p>
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{users.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-green-600">Active Now</p>
                            <UserCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                            {/* Mock data for active now in this view, real app would use websocket/presence */}
                            {Math.floor(users.length * 0.12)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-purple-600">Admins</p>
                            <Shield className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                            {users.filter(u => u.role === 'admin').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-md border-0 ring-1 ring-gray-200">
                <CardContent className="p-0">
                    <DataTable
                        title=""
                        data={filteredUsers}
                        columns={columnsWithActions}
                        actions={[]}
                        emptyMessage="No users found"
                    />
                </CardContent>
            </Card>
        </div>
    )
}
