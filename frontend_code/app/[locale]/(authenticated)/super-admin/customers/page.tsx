"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2, Users, Plus, Search, CheckCircle, XCircle, Eye,
  CreditCard, Calendar, TrendingUp, RefreshCw, ChevronLeft, ChevronRight,
  Mail, Phone, Shield, Warehouse, MoreVertical, UserPlus, Trash2, Activity
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface AdminUser {
  _id: string
  name: string
  email: string
  phone?: string
  business_type?: string
  status: string
  created_at: string
  lastLogin?: string
  plan?: string
  subscription_status?: string
  user_count?: number
  revenue?: number
  subscription_end?: string
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalAdmins: number
  hasNext: boolean
  hasPrev: boolean
}

export default function CustomerManagementPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, totalPages: 1, totalAdmins: 0, hasNext: false, hasPrev: false })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", password: "", business_type: "farm", plan_name: "Basic" })
  const [creating, setCreating] = useState(false)
  const [stats, setStats] = useState({ total_admins: 0, active_admins: 0, total_revenue: 0 })

  const loadAdmins = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
      const res = await api.get<{ success: boolean; data: { admins: AdminUser[]; pagination: Pagination } }>(`/api/admin-management/admins?page=${page}&limit=10${searchParam}`)
      if (res.ok && res.data?.data) {
        setAdmins(res.data.data.admins)
        setPagination(res.data.data.pagination)
      } else {
        toast.error("Failed to load customers")
      }
    } catch {
      toast.error("An error occurred loading customers")
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { total_admins: number; active_admins: number; total_revenue: number } }>("/api/admin-management/statistics")
      if (res.ok && res.data?.data) {
        setStats(res.data.data)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadAdmins(); loadStats() }, [loadAdmins, loadStats])

  const handleCreateAdmin = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error("Name, email, and password are required")
      return
    }
    try {
      setCreating(true)
      const res = await api.post<{ success: boolean }>("/api/admin-management/admins", createForm)
      if (res.ok) {
        toast.success("Customer admin created successfully!")
        setShowCreateDialog(false)
        setCreateForm({ name: "", email: "", phone: "", password: "", business_type: "farm", plan_name: "Basic" })
        loadAdmins()
        loadStats()
      } else {
        toast.error(res.error || "Failed to create admin")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this customer? This will cancel their subscription.")) return
    try {
      const res = await api.delete(`/api/admin-management/admins/${id}`)
      if (res.ok) {
        toast.success("Customer deactivated")
        loadAdmins()
        loadStats()
      } else {
        toast.error("Failed to deactivate")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const viewAdminDetail = async (admin: AdminUser) => {
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/api/admin-management/admins/${admin._id}`)
      if (res.ok && res.data?.data) {
        setSelectedAdmin({ ...admin, ...res.data.data.admin })
      } else {
        setSelectedAdmin(admin)
      }
    } catch {
      setSelectedAdmin(admin)
    }
    setShowDetail(true)
  }

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"
  const daysUntil = (d?: string) => {
    if (!d) return null
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Customer Management</h2>
          <p className="text-slate-500 mt-1">Manage all admin organizations, subscriptions, and access</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { loadAdmins(); loadStats() }} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-200">
            <UserPlus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Customers</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total_admins}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl"><Building2 className="h-6 w-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Active Customers</p>
                <p className="text-3xl font-bold text-emerald-900">{stats.active_admins}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl"><CheckCircle className="h-6 w-6 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-purple-900">Rs. {stats.total_revenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl"><TrendingUp className="h-6 w-6 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAdmins()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => loadAdmins()} className="gap-2">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse h-52" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700">No Customers Found</h3>
            <p className="text-slate-500 mt-1">No admin organizations match your search.</p>
            <Button onClick={() => setShowCreateDialog(true)} className="mt-4 bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="h-4 w-4" /> Add First Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map((admin) => {
            const subDays = daysUntil(admin.subscription_end)
            const isExpiringSoon = subDays !== null && subDays <= 7 && subDays > 0
            const isExpired = subDays !== null && subDays <= 0
            const isActive = admin.status === "active"

            return (
              <Card key={admin._id} className={`border shadow-sm hover:shadow-lg transition-all duration-200 group ${!isActive ? "opacity-70" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${
                        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {admin.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <CardTitle className="text-base">{admin.name || "Unnamed"}</CardTitle>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {admin.email}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => viewAdminDetail(admin)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(admin._id)}>
                          <Shield className="mr-2 h-4 w-4" /> Copy Admin ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDeleteAdmin(admin._id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Status & Plan Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={isActive ? "default" : "destructive"} className={isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : ""}>
                      {isActive ? <><CheckCircle className="h-3 w-3 mr-1" /> Active</> : <><XCircle className="h-3 w-3 mr-1" /> Inactive</>}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <CreditCard className="h-3 w-3" /> {admin.plan || "Free"}
                    </Badge>
                    {admin.subscription_status && (
                      <Badge variant="outline" className={
                        admin.subscription_status === "active" ? "border-green-200 text-green-700 bg-green-50" :
                        admin.subscription_status === "cancelled" ? "border-red-200 text-red-700 bg-red-50" :
                        "border-yellow-200 text-yellow-700 bg-yellow-50"
                      }>
                        {admin.subscription_status}
                      </Badge>
                    )}
                    {isExpiringSoon && <Badge className="bg-amber-100 text-amber-700 border-0">⚠ Expires in {subDays}d</Badge>}
                    {isExpired && <Badge className="bg-red-100 text-red-700 border-0">Expired</Badge>}
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-xs">Users</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800">{admin.user_count ?? 0}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-500">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span className="text-xs">Revenue</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800">Rs. {(admin.revenue || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">Joined</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{formatDate(admin.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalAdmins} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => loadAdmins(pagination.currentPage - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => loadAdmins(pagination.currentPage + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Admin Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-emerald-600" /> Create Customer Admin</DialogTitle>
            <DialogDescription>Add a new organization admin to the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Ali Hassan" value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="admin@example.com" value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={createForm.password} onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+92 3XX XXXXXXX" value={createForm.phone} onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={createForm.business_type} onValueChange={(v) => setCreateForm(f => ({ ...f, business_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="farm">Farm</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="mill">Mill</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="cooperative">Cooperative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={createForm.plan_name} onValueChange={(v) => setCreateForm(f => ({ ...f, plan_name: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basic">Basic</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateAdmin} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
              {creating ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                {selectedAdmin?.name?.[0]?.toUpperCase() || "?"}
              </div>
              {selectedAdmin?.name}
            </DialogTitle>
            <DialogDescription>Customer organization details</DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Email</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {selectedAdmin.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Phone</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {selectedAdmin.phone || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Business Type</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Warehouse className="h-3.5 w-3.5 text-slate-400" /> {selectedAdmin.business_type || "farm"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Status</p>
                  <Badge variant={selectedAdmin.status === "active" ? "default" : "destructive"}
                    className={selectedAdmin.status === "active" ? "bg-emerald-100 text-emerald-700 border-0" : ""}>
                    {selectedAdmin.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Subscription</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-slate-400" /> {selectedAdmin.plan || "Free"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Team Size</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" /> {selectedAdmin.user_count ?? 0} users</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Joined</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {formatDate(selectedAdmin.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Last Login</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-slate-400" /> {formatDate(selectedAdmin.lastLogin)}</p>
                </div>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs text-slate-400 font-mono">Admin ID: {selectedAdmin._id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
