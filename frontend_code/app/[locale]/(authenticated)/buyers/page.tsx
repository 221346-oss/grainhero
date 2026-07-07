"use client"

import { useEffect, useMemo, useState, FormEvent, useCallback } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Users, Truck, Search, Phone, Mail, MapPin, Plus, Package, MoreHorizontal, Edit } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedBackground } from "@/components/animations/MotionGraphics"
import { api } from "@/lib/api"

type BuyerRecord = {
  _id: string
  name: string
  company_name?: string
  contact_person: {
    name: string
    email?: string
    phone?: string
  }
  location?: {
    city?: string
    state?: string
    country?: string
  }
  status: string
  rating?: number
  totalOrders?: number
  lastOrderDate?: string | null
}

type Summary = {
  totalBuyers: number
  activeContracts: number
  scheduledDispatches: number
  topRating?: number | null
}

type Contract = {
  id: string
  buyer: string
  grain?: string
  quantity_kg?: number
  price_per_kg?: number
  status: string
}

type Dispatch = {
  id: string
  buyer: string
  batch: string
  quantity_kg?: number
  eta?: string
  status: string
}

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "inactive", label: "Inactive" },
]

const initialFormState = {
  name: "",
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  city: "",
  status: "active",
  rating: "4",
  notes: "",
}

const formatRelativeDate = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

const buyerStatusClass = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800"
    case "paused":
      return "bg-yellow-100 text-yellow-800"
    case "inactive":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const contractStatusClass = (status: string) => {
  switch (status) {
    case "running":
    case "processing":
      return "bg-blue-100 text-blue-800"
    case "negotiating":
    case "on_hold":
      return "bg-yellow-100 text-yellow-800"
    case "completed":
    case "sold":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const dispatchStatusClass = (status: string) => {
  switch (status) {
    case "confirmed":
    case "dispatched":
      return "bg-green-100 text-green-800"
    case "scheduled":
    case "processing":
      return "bg-yellow-100 text-yellow-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function BuyersPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [buyers, setBuyers] = useState<BuyerRecord[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recentContracts, setRecentContracts] = useState<Contract[]>([])
  const [upcomingDispatches, setUpcomingDispatches] = useState<Dispatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerRecord | null>(null)
  const [formState, setFormState] = useState(initialFormState)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSavingBuyer, setIsSavingBuyer] = useState(false)
  const [isDeletingBuyer, setIsDeletingBuyer] = useState(false)

  type CreateBuyerResponse = { buyer?: BuyerRecord; isNew?: boolean; message?: string }

  const isCreateBuyerResponse = (value: unknown): value is CreateBuyerResponse => {
    if (!value || typeof value !== "object") return false
    const v = value as Record<string, unknown>
    if ("isNew" in v && typeof v.isNew !== "boolean") return false
    if ("message" in v && typeof v.message !== "string") return false
    if ("buyer" in v && v.buyer !== undefined && (typeof v.buyer !== "object" || v.buyer === null)) return false
    return true
  }

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (searchQuery) params.append("q", searchQuery)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (cityFilter !== "all") params.append("city", cityFilter)

      const res = await api.get<{
        buyers: BuyerRecord[]
        summary: Summary | null
        recentContracts: Contract[]
        upcomingDispatches: Dispatch[]
      }>(`/api/buyers/dashboard?${params.toString()}`)

      if (!res.ok || !res.data) {
        throw new Error(res.error || "Failed to fetch buyers")
      }

      const payload = res.data
      setBuyers(payload.buyers || [])
      setSummary(payload.summary || null)
      setRecentContracts(payload.recentContracts || [])
      setUpcomingDispatches(payload.upcomingDispatches || [])

      const cities = new Set<string>()
        ; (payload.buyers || []).forEach((buyer: BuyerRecord) => {
          if (buyer.location?.city) {
            cities.add(buyer.location.city)
          }
        })
      setCityOptions(Array.from(cities))
    } catch (err) {
      console.error(err)
      setError("Unable to load buyers. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, cityFilter])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Listen for refresh events from other pages (e.g., after dispatch)
  useEffect(() => {
    const handleRefresh = () => {
      fetchDashboard()
    }
    window.addEventListener('buyers-refresh', handleRefresh)
    return () => {
      window.removeEventListener('buyers-refresh', handleRefresh)
    }
  }, [fetchDashboard])

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const handleAddBuyer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setIsSavingBuyer(true)

    try {
      const res = await api.post<unknown>(`/api/buyers`, {
        name: formState.name,
        companyName: formState.companyName || undefined,
        contactPerson: {
          name: formState.contactName,
          email: formState.contactEmail || undefined,
          phone: formState.contactPhone || undefined,
        },
        location: {
          city: formState.city || undefined,
        },
        status: formState.status,
        rating: Number(formState.rating) || 4,
        notes: formState.notes || undefined,
      })

      const data = isCreateBuyerResponse(res.data) ? res.data : {}

      if (!res.ok) {
        // Check if it's a duplicate buyer response (200 with isNew: false)
        if (res.status === 200 && data.isNew === false) {
          setFormError(`Buyer already exists: ${data.buyer?.name}. Would you like to update this buyer instead?`)
          setSelectedBuyer(data.buyer || null)
          setIsDialogOpen(false)
          setIsEditDialogOpen(true)
          return
        }
        throw new Error(data.message || res.error || "Failed to create buyer")
      }

      // Handle duplicate detection response
      if (data.isNew === false && data.buyer) {
        setFormError(`Buyer already exists: ${data.buyer.name}. Would you like to update this buyer instead?`)
        setSelectedBuyer(data.buyer)
        setIsDialogOpen(false)
        setIsEditDialogOpen(true)
        return
      }

      setFormState(initialFormState)
      setIsDialogOpen(false)
      fetchDashboard()
      
      // Trigger buyers page refresh for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('buyers-refresh'))
      }
    } catch (err) {
      setFormError((err as Error).message || "Unable to save buyer")
    } finally {
      setIsSavingBuyer(false)
    }
  }

  const handleEditBuyer = (buyer: BuyerRecord) => {
    setSelectedBuyer(buyer)
    setFormState({
      name: buyer.name,
      companyName: buyer.company_name || "",
      contactName: buyer.contact_person?.name || "",
      contactEmail: buyer.contact_person?.email || "",
      contactPhone: buyer.contact_person?.phone || "",
      city: buyer.location?.city || "",
      status: buyer.status,
      rating: String(buyer.rating || 4),
      notes: "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateBuyer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBuyer) return

    setFormError(null)
    setIsSavingBuyer(true)

    try {
      const res = await api.put(`/api/buyers/${selectedBuyer._id}`, {
        name: formState.name,
        companyName: formState.companyName || undefined,
        contactPerson: {
          name: formState.contactName,
          email: formState.contactEmail || undefined,
          phone: formState.contactPhone || undefined,
        },
        location: {
          city: formState.city || undefined,
        },
        status: formState.status,
        rating: Number(formState.rating) || 4,
        notes: formState.notes || undefined,
      })

      if (!res.ok) throw new Error(res.error || "Failed to update buyer")

      setFormState(initialFormState)
      setSelectedBuyer(null)
      setIsEditDialogOpen(false)
      fetchDashboard()
      
      // Trigger buyers page refresh for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('buyers-refresh'))
      }
    } catch (err) {
      setFormError((err as Error).message || "Unable to update buyer")
    } finally {
      setIsSavingBuyer(false)
    }
  }

  const handleDeleteBuyer = async () => {
    if (!selectedBuyer) return

    setIsDeletingBuyer(true)
    try {
      const res = await api.delete(`/api/buyers/${selectedBuyer._id}`)
      if (!res.ok) throw new Error(res.error || "Failed to delete buyer")

      setSelectedBuyer(null)
      setIsDeleteDialogOpen(false)
      fetchDashboard()
      
      // Trigger buyers page refresh for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('buyers-refresh'))
      }
    } catch (err) {
      setFormError((err as Error).message || "Unable to delete buyer")
    } finally {
      setIsDeletingBuyer(false)
    }
  }

  const ordersTotal = useMemo(
    () => buyers.reduce((sum, buyer) => sum + (buyer.totalOrders || 0), 0),
    [buyers]
  )

  const filteredBuyers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return buyers.filter((buyer) => {
      if (statusFilter !== "all" && buyer.status !== statusFilter) {
        return false
      }
      if (cityFilter !== "all" && buyer.location?.city?.toLowerCase() !== cityFilter.toLowerCase()) {
        return false
      }
      if (!normalizedQuery) return true
      const haystack = [
        buyer.name,
        buyer.company_name,
        buyer.contact_person?.name,
        buyer.contact_person?.email,
        buyer.contact_person?.phone,
        buyer.location?.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [buyers, searchQuery, statusFilter, cityFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading buyers...</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedBackground className="min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyers Management</h1>
          <p className="text-muted-foreground">
            Manage grain buyers, contracts and dispatches
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Buyer
          </Button>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <div className="max-h-[80vh] overflow-y-auto">
              <div className="border-b px-6 py-4">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Buyer
                  </DialogTitle>
                  <DialogDescription>
                    Capture buyer details.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleAddBuyer}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyer-name">Buyer name *</Label>
                    <Input
                      id="buyer-name"
                      value={formState.name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter buyer or company name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company / Brand</Label>
                    <Input
                      id="company-name"
                      value={formState.companyName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Enter brand name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact person *</Label>
                    <Input
                      value={formState.contactName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contactName: e.target.value }))}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formState.contactPhone}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="+92 300 0000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formState.contactEmail}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formState.city}
                      onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Lahore, Karachi..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formState.status}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Active" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions
                          .filter((option) => option.value !== "all")
                          .map((option) => (
                            <SelectItem value={option.value} key={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rating (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formState.rating}
                      onChange={(e) => setFormState((prev) => ({ ...prev, rating: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-span-full space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={formState.notes}
                    onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add preferences, payment terms, or reminders"
                  />
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}
                <DialogFooter className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSavingBuyer}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingBuyer}>
                    {isSavingBuyer ? "Saving..." : "Save buyer"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Buyers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBuyers}</div>
              <p className="text-xs text-muted-foreground">Across this Admin</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeContracts}</div>
              <p className="text-xs text-muted-foreground">Running</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Dispatches</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.scheduledDispatches}</div>
              <p className="text-xs text-muted-foreground">Upcoming deliveries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.topRating ?? "—"}</div>
              <p className="text-xs text-muted-foreground">Best partner score</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search Buyers</CardTitle>
          <CardDescription>
            Search, narrow by status or city, and view live data coming from your batches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <form className="flex gap-2" onSubmit={handleSearchSubmit}>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by buyer, email or phone "
                  className="pl-8"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cityOptions.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buyers Directory</CardTitle>
          <CardDescription>
            Contacts, locations and live order history (linked with grain batches)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuyers.map((buyer) => (
                  <TableRow key={buyer._id}>
                    <TableCell>
                      <div className="font-medium">{buyer.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {buyer.contact_person?.email || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {buyer.contact_person?.name}
                          {buyer.contact_person?.phone ? ` • ${buyer.contact_person.phone}` : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{buyer.location?.city || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{buyer.totalOrders ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDate(buyer.lastOrderDate)}
                    </TableCell>
                    <TableCell>
                      <Badge className={buyerStatusClass(buyer.status)}>
                        {buyer.status ? buyer.status.charAt(0).toUpperCase() + buyer.status.slice(1) : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditBuyer(buyer)}>
                            Edit buyer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setSelectedBuyer(buyer)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            Delete buyer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBuyers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {buyers.length === 0
                          ? "No buyers found. Use the Add Buyer button to get started."
                          : "No buyers match this search/filter."}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <span>Total tracked orders: {ordersTotal}</span>
          <span>Displaying {filteredBuyers.length} buyers</span>
        </CardFooter>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Contracts</CardTitle>
            <CardDescription>Live data derived from dispatched grain batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentContracts.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent contracts.</p>
              )}
              {recentContracts.map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {contract.id} • {contract.buyer}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {contract.grain || "—"} •{" "}
                      {contract.quantity_kg ? `${Math.round(contract.quantity_kg).toLocaleString()} kg` : "—"}{" "}
                      • {contract.price_per_kg ? `$${contract.price_per_kg}/kg` : "N/A"}
                    </div>
                  </div>
                  <Badge className={contractStatusClass(contract.status)}>
                    {contract.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Dispatches</CardTitle>
            <CardDescription>Based on expected dispatch dates in grain batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDispatches.length === 0 && (
                <p className="text-sm text-muted-foreground">No upcoming dispatches.</p>
              )}
              {upcomingDispatches.map((dispatch) => (
                <div key={dispatch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {dispatch.id} • {dispatch.buyer}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dispatch.batch} •{" "}
                      {dispatch.quantity_kg ? `${Math.round(dispatch.quantity_kg).toLocaleString()} kg` : "—"} •{" "}
                      {dispatch.eta ? new Date(dispatch.eta).toLocaleString() : "—"}
                    </div>
                  </div>
                  <Badge className={dispatchStatusClass(dispatch.status)}>
                    {dispatch.status.charAt(0).toUpperCase() + dispatch.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Buyer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="border-b px-6 py-4">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Buyer
                </DialogTitle>
                <DialogDescription>
                  Update buyer details and information
                </DialogDescription>
              </DialogHeader>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleUpdateBuyer}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-buyer-name">Buyer name *</Label>
                  <Input
                    id="edit-buyer-name"
                    value={formState.name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter buyer or company name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company-name">Company / Brand</Label>
                  <Input
                    id="edit-company-name"
                    value={formState.companyName}
                    onChange={(e) => setFormState((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter brand name"
                  /></div>
                <div className="space-y-2">
                  <Label>Contact person *</Label>
                  <Input
                    value={formState.contactName}
                    onChange={(e) => setFormState((prev) => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formState.contactPhone}
                    onChange={(e) => setFormState((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+92 300 0000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formState.contactEmail}
                    onChange={(e) => setFormState((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formState.city}
                    onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Lahore, Karachi..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formState.status}
                      onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Active" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions
                          .filter((option) => option.value !== "all")
                          .map((option) => (
                            <SelectItem value={option.value} key={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rating (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formState.rating}
                      onChange={(e) => setFormState((prev) => ({ ...prev, rating: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-full space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={formState.notes}
                  onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add preferences, payment terms, or reminders"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <DialogFooter className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSavingBuyer}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingBuyer}>
                  {isSavingBuyer ? "Updating..." : "Update buyer"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Buyer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedBuyer?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingBuyer}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBuyer}
              disabled={isDeletingBuyer}
            >
              {isDeletingBuyer ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </AnimatedBackground>
  )
}
