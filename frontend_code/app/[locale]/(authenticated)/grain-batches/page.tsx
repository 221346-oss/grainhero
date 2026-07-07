"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Package, QrCode, AlertTriangle, Edit, Trash2, Eye, MoreVertical, Truck, Download, Camera } from 'lucide-react'
import { api } from '@/lib/api'
import { config } from '@/config'
import { toast } from 'sonner'
import QRCodeDisplay from '@/components/QRCodeDisplay'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from '@/app/[locale]/providers'
import { AnimatedBackground } from "@/components/animations/MotionGraphics"
import { Loader2, XCircle } from 'lucide-react'

interface GrainBatch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  risk_score: number
  spoilage_label: string
  intake_date: string
  silo_id: {
    _id: string
    name: string
    silo_id: string
    capacity_kg: number
  }
  farmer_name?: string
  farmer_contact?: string
  moisture_content?: number
  qr_code?: string
  variety?: string
  grade?: string
  harvest_date?: string
  notes?: string
  source_location?: string
  intake_conditions?: {
    temperature?: number
    humidity?: number
  }
  protein_content?: number
  test_weight?: number
  dispatch_details?: {
    buyer_name: string
    buyer_contact: string
    quantity: number
    dispatch_date: string
    notes?: string
  }
  purchase_price_per_kg?: number
  total_purchase_value?: number
  dispatched_quantity_kg?: number
  actual_dispatch_date?: string
  buyer_id?: {
    _id: string
    name: string
    contact_info?: string
  }
}

interface BuyerRecord {
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

interface DispatchData {
  buyer_id?: string
  sell_price_per_kg: number
  dispatched_quantity_kg?: number
  dispatch_details: {
    vehicle_number?: string
    driver_name?: string
    driver_contact?: string
    destination?: string
  }
}

interface LogEventResponse {
  event: {
    event_id: string
  }
}

interface Silo {
  _id: string
  name: string
  silo_id: string
  capacity_kg: number
  current_occupancy_kg: number
}

export default function GrainBatchesPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const { user } = useAuth()
  const userRole = user?.role || 'technician'
  const [batches, setBatches] = useState<GrainBatch[]>([])
  const [silos, setSilos] = useState<Silo[]>([])
  const [availableSilos, setAvailableSilos] = useState<Silo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [grainTypeFilter, setGrainTypeFilter] = useState('all')

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<GrainBatch | null>(null)
  const [isSpoilageDialogOpen, setIsSpoilageDialogOpen] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    batch_id: '',
    grain_type: '',
    quantity_kg: '',
    silo_id: '',
    farmer_name: '',
    farmer_contact: '',
    variety: '',
    grade: 'Standard',
    harvest_date: '',
    notes: '',
    // Module 1: Grain Procurement & Intake - Additional fields
    source_type: 'private', // 'passco', 'cooperative', 'private'
    source_location: '',
    purchase_price_per_kg: '',
    intake_temperature: '',
    intake_humidity: '',
    expected_storage_duration_days: '',
    protein_content: '',
    test_weight: ''
  })

  // Dispatch form data - Module 8: Final Dispatch & Buyer Trace
  const [dispatchData, setDispatchData] = useState({
    buyer_id: '',
    buyer_name: '',
    buyer_email: '',
    buyer_contact: '',
    quantity_dispatched: '',
    dispatch_date: '',
    sell_price_per_kg: '', // Changed from price_per_kg
    vehicle_number: '',
    driver_name: '',
    driver_contact: '',
    destination: '',
    notes: ''
  })

  // Spoilage form state
  const [spoilageData, setSpoilageData] = useState({
    type: 'pests',
    severity: 'low',
    description: '',
    estimated_loss_kg: '',
    temperature: '',
    humidity: '',
    action_taken: ''
  })
  const [spoilagePhotos, setSpoilagePhotos] = useState<File[]>([])
  const [availableBuyers, setAvailableBuyers] = useState<BuyerRecord[]>([])

  const fetchBatches = async () => {
    try {
      console.log('Fetching batches...')
      const res = await api.get<{ batches: GrainBatch[] }>(`/api/grain-batches?limit=50`)
      console.log('Fetch response:', res)

      if (res.ok && res.data) {
        setBatches(res.data.batches as unknown as GrainBatch[])
        console.log('Batches loaded:', res.data.batches.length)
      } else {
        console.error('Fetch error:', res.error)
        toast.error(`Failed to fetch grain batches: ${res.error || 'Unknown error'}`)
      }


    } catch (error) {
      console.error('Error fetching batches:', error)
      toast.error(`Failed to fetch grain batches: ${(error as Error).message || 'Network error'}`)
    }
  }

  const fetchSilos = async () => {
    try {
      const res = await api.get<{ silos: Silo[] }>(`/api/silos`)
      if (res.ok && res.data) {
        setSilos(res.data.silos as unknown as Silo[])
      }
    } catch (error) {
      console.error('Error fetching silos:', error)
    }
  }

  useEffect(() => {
    let mounted = true
      ; (async () => {
        // Check if user is authenticated
        const token = localStorage.getItem('token')
        if (!token) {
          console.error('No authentication token found')
          toast.error('Please log in to access grain batches')
          setLoading(false)
          return
        }

        console.log('User authenticated, fetching data...')
        await Promise.all([fetchBatches(), fetchSilos()])
        if (mounted) {
          setLoading(false)
        }
      })()
    return () => {
      mounted = false
    }
  }, [])

  // Generate batch ID when grain type is selected
  const generateBatchId = async (grainType: string) => {
    try {
      type BatchIdResponse = { batch_id: string; sequence: number; grain_type: string; year: number }
      const res = await api.get<BatchIdResponse>(`/api/grain-batches/generate-id/${grainType}`)
      if (res.ok && res.data?.batch_id) {
        setFormData(prev => ({ ...prev, batch_id: res.data!.batch_id }))
      } else {
        toast.error('Failed to generate batch ID')
      }

      // Fetch available silos for this grain type
      const silosRes = await api.get<{ silos: Silo[] }>(`/api/grain-batches/available-silos/${grainType}`)
      if (silosRes.ok && silosRes.data?.silos) {
        setAvailableSilos(silosRes.data.silos as unknown as Silo[])
      } else {
        // Fallback to all silos if endpoint fails
        setAvailableSilos(silos)
      }
    } catch (error) {
      console.error('Error generating batch ID:', error)
      toast.error('Failed to generate batch ID')
    }
  }

  // CRUD Operations
  const handleAddBatch = async () => {
    try {
      // Get logged-in user's information from token
      let userName = 'Unknown User';
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userName = payload.user?.name || payload.user?.email || 'Unknown User';
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }

      // Convert numeric fields to numbers and add user information
      const dataToSend = {
        ...formData,
        quantity_kg: Number(formData.quantity_kg),
        farmer_name: userName, // Use logged-in user's name instead of manual input
        farmer_contact: '', // Leave contact empty or could be obtained from user profile
      }
      console.log('Creating batch with data:', dataToSend)

      // Check if user is authenticated
      const token = localStorage.getItem('token')
      console.log('Token from localStorage:', token ? 'Token exists' : 'No token found')

      if (!token) {
        toast.error('Please log in to create grain batches')
        return
      }

      // Log the full request details
      console.log('Making API request to:', `${config.backendUrl}/grain-batches`)
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })

      const res = await api.post('/api/grain-batches', dataToSend)
      console.log('Full API Response:', res)
      console.log('Response status:', res.status)
      console.log('Response data:', res.data)
      console.log('Response error:', res.error)

      if (res.ok) {
        toast.success('Grain batch created successfully')
        setIsAddDialogOpen(false)
        resetForm()
        await fetchBatches()
      } else {
        console.error('API Error Details:', {
          status: res.status,
          error: res.error,
          response: res
        })
        toast.error(`Failed to create grain batch: ${res.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Network/Request Error:', error)
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      })
      toast.error(`Failed to create grain batch: ${(error as Error).message || 'Network error'}`)
    }
  }

  const handleEditBatch = async () => {
    if (!selectedBatch) return
    try {
      // Convert numeric fields to numbers
      const dataToSend = {
        ...formData,
        quantity_kg: Number(formData.quantity_kg)
      }
      const res = await api.put(`/api/grain-batches/${selectedBatch._id}`, dataToSend)
      if (res.ok) {
        toast.success('Grain batch updated successfully')
        setIsEditDialogOpen(false)
        resetForm()
        await fetchBatches()
      } else {
        toast.error('Failed to update grain batch')
      }
    } catch (error) {
      console.error('Error updating batch:', error)
      toast.error('Failed to update grain batch')
    }
  }

  const handleDeleteBatch = async () => {
    if (!selectedBatch) return
    try {
      const res = await api.delete(`/api/grain-batches/${selectedBatch._id}`)
      if (res.ok) {
        toast.success('Grain batch deleted successfully')
        setIsDeleteDialogOpen(false)
        await fetchBatches()
      } else {
        toast.error('Failed to delete grain batch')
      }
    } catch (error) {
      console.error('Error deleting batch:', error)
      toast.error('Failed to delete grain batch')
    }
  }

  // Fetch buyers for dispatch - Module 8: Final Dispatch & Buyer Trace
  const fetchBuyersForDispatch = async (batchId: string) => {
    try {
      const res = await api.get<{ buyers?: BuyerRecord[] }>(`/api/grain-batches/${batchId}/buyers`)
      if (res.ok && res.data) {
        setAvailableBuyers(res.data.buyers || [])
      }
    } catch (error) {
      console.error('Error fetching buyers:', error)
    }
  }

  const handleDispatchBatch = async () => {
    if (!selectedBatch) return
    try {
      // Module 8: Use new dispatch endpoint with buyer_id and sell_price_per_kg
      if (!dispatchData.buyer_id && !dispatchData.buyer_name) {
        toast.error('Please select a buyer or enter buyer details')
        return
      }
      if (!dispatchData.sell_price_per_kg) {
        toast.error('Sell price per kg is required')
        return
      }

      const dataToSend: DispatchData = {
        buyer_id: dispatchData.buyer_id || undefined,
        sell_price_per_kg: Number(dispatchData.sell_price_per_kg),
        dispatched_quantity_kg: dispatchData.quantity_dispatched ? Number(dispatchData.quantity_dispatched) : undefined,
        dispatch_details: {
          vehicle_number: dispatchData.vehicle_number || undefined,
          driver_name: dispatchData.driver_name || undefined,
          driver_contact: dispatchData.driver_contact || undefined,
          destination: dispatchData.destination || undefined
        }
      }

      // If no buyer_id, use dispatch-simple endpoint
      let res
      if (!dispatchData.buyer_id) {
        res = await api.post(`/api/grain-batches/${selectedBatch._id}/dispatch-simple`, {
          buyer_name: dispatchData.buyer_name,
          buyer_email: dispatchData.buyer_email,
          buyer_contact: dispatchData.buyer_contact,
          quantity_dispatched: dispatchData.quantity_dispatched,
          sell_price_per_kg: dispatchData.sell_price_per_kg,
          dispatch_date: dispatchData.dispatch_date,
          notes: dispatchData.notes
        })
      } else {
        res = await api.post(`/api/grain-batches/${selectedBatch._id}/dispatch`, dataToSend)
      }
      if (res.ok) {
        toast.success('Grain batch dispatched successfully')
        setIsDispatchDialogOpen(false)
        // Trigger buyers page refresh if it's open (via window event)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('buyers-refresh'))
        }
        setDispatchData({
          buyer_id: '',
          buyer_name: '',
          buyer_email: '',
          buyer_contact: '',
          quantity_dispatched: '',
          dispatch_date: '',
          sell_price_per_kg: '',
          vehicle_number: '',
          driver_name: '',
          driver_contact: '',
          destination: '',
          notes: ''
        })
        await fetchBatches()
      } else {
        toast.error('Failed to dispatch grain batch')
      }
    } catch (error) {
      console.error('Error dispatching batch:', error)
      toast.error('Failed to dispatch grain batch')
    }
  }

  const handleLogSpoilage = async () => {
    if (!selectedBatch) return
    try {
      const res = await api.post(`/api/logging/batches/${selectedBatch._id}/spoilage-events`, {
        ...spoilageData,
        estimated_loss_kg: spoilageData.estimated_loss_kg ? Number(spoilageData.estimated_loss_kg) : 0,
        environmental_conditions: {
          temperature: spoilageData.temperature ? Number(spoilageData.temperature) : undefined,
          humidity: spoilageData.humidity ? Number(spoilageData.humidity) : undefined
        }
      })

      if (res.ok && res.data) {
        toast.success('Spoilage event logged successfully')
        const eventId = (res.data as unknown as LogEventResponse).event.event_id

        // Upload photos if any
        if (spoilagePhotos.length > 0) {
          setIsUploadingPhoto(true)
          for (const photo of spoilagePhotos) {
            const formData = new FormData()
            formData.append('photos', photo)

            const token = localStorage.getItem('token')
            const uploadRes = await fetch(`/api/logging/batches/${selectedBatch._id}/spoilage-events/${eventId}/photos`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: formData
            })

            if (!uploadRes.ok) {
              toast.error('Failed to upload some photos')
            }
          }
          setIsUploadingPhoto(false)
        }

        setIsSpoilageDialogOpen(false)
        setSpoilageData({
          type: 'pests',
          severity: 'low',
          description: '',
          estimated_loss_kg: '',
          temperature: '',
          humidity: '',
          action_taken: ''
        })
        setSpoilagePhotos([])
        await fetchBatches()
      } else {
        toast.error('Failed to log spoilage event')
      }
    } catch (error) {
      console.error('Error logging spoilage:', error)
      toast.error('Failed to log spoilage event')
    }
  }

  const openDispatchDialog = async (batch: GrainBatch) => {
    setSelectedBatch(batch)
    // Fetch available buyers
    await fetchBuyersForDispatch(batch._id)
    setDispatchData({
      buyer_id: '',
      buyer_name: '',
      buyer_email: '',
      buyer_contact: '',
      quantity_dispatched: (batch.quantity_kg - (batch.dispatched_quantity_kg || 0)).toString(),
      dispatch_date: new Date().toISOString().split('T')[0],
      sell_price_per_kg: '',
      vehicle_number: '',
      driver_name: '',
      driver_contact: '',
      destination: '',
      notes: ''
    })
    setIsDispatchDialogOpen(true)
  }

  const handleViewBatch = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setIsViewDialogOpen(true)
  }

  const handleEditClick = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setFormData({
      batch_id: batch.batch_id,
      grain_type: batch.grain_type,
      quantity_kg: batch.quantity_kg.toString(),
      silo_id: batch.silo_id?._id || '',
      farmer_name: batch.farmer_name || '',
      farmer_contact: batch.farmer_contact || '',
      variety: batch.variety || '',
      grade: batch.grade || 'Standard',
      harvest_date: batch.harvest_date || '',
      notes: batch.notes || '',
      source_type: 'private',
      source_location: batch.source_location || '',
      purchase_price_per_kg: batch.purchase_price_per_kg?.toString() || '',
      intake_temperature: batch.intake_conditions?.temperature?.toString() || '',
      intake_humidity: batch.intake_conditions?.humidity?.toString() || '',
      expected_storage_duration_days: '',
      protein_content: batch.protein_content?.toString() || '',
      test_weight: batch.test_weight?.toString() || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setIsDeleteDialogOpen(true)
  }

  const handleQRCodeClick = (batch: GrainBatch) => {
    if (batch.qr_code) {
      setSelectedBatch(batch)
      setIsQRDialogOpen(true)
    } else {
      toast.error('No QR code available for this batch')
    }
  }

  const resetForm = () => {
    setFormData({
      batch_id: '',
      grain_type: '',
      quantity_kg: '',
      silo_id: '',
      farmer_name: '',
      farmer_contact: '',
      variety: '',
      grade: 'Standard',
      harvest_date: '',
      notes: '',
      source_type: 'private',
      source_location: '',
      purchase_price_per_kg: '',
      intake_temperature: '',
      intake_humidity: '',
      expected_storage_duration_days: '',
      protein_content: '',
      test_weight: ''
    })
    setAvailableSilos([])
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      stored: 'bg-blue-100 text-blue-800',
      dispatched: 'bg-green-100 text-green-800',
      sold: 'bg-purple-100 text-purple-800',
      damaged: 'bg-red-100 text-red-800',
      on_hold: 'bg-yellow-100 text-yellow-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getRiskBadge = (riskScore: number, spoilageLabel: string) => {
    if (spoilageLabel === 'Safe') return 'bg-green-100 text-green-800'
    if (spoilageLabel === 'Risky') return 'bg-yellow-100 text-yellow-800'
    if (spoilageLabel === 'Spoiled') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.grain_type.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'dispatched') {
      // Dispatched batches are those that have any dispatched quantity
      matchesStatus = (batch.dispatched_quantity_kg || 0) > 0;
    } else if (statusFilter === 'sold') {
      // Sold batches are those with zero remaining quantity
      matchesStatus = (batch.quantity_kg - (batch.dispatched_quantity_kg || 0)) === 0;
    } else {
      matchesStatus = batch.status === statusFilter;
    }

    const matchesGrainType = grainTypeFilter === 'all' || batch.grain_type === grainTypeFilter
    return matchesSearch && matchesStatus && matchesGrainType
  })

  if (loading) {
    return (
      <AnimatedBackground className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading grain batches...</p>
          </div>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground className="min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Grain Batches</h1>
              <p className="text-muted-foreground">
                Manage and track grain batches
              </p>
            </div>
            {(userRole === 'admin' || userRole === 'super_admin' || userRole === 'manager') && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-black hover:bg-gray-800">
                    <Plus className="h-4 w-4" />
                    Add New Batch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-black" />
                      Add New Grain Batch
                    </DialogTitle>
                    <DialogDescription>
                      Create a new grain batch
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Consolidated Grain Batch Information */}
                    <Card>
                      {/* <CardHeader>
                    //<CardTitle className="text-lg">Grain Batch Information</CardTitle>
                  </CardHeader> */}
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="batch_id" className="text-sm font-medium">Batch ID</Label>
                              <Input
                                id="batch_id"
                                value={formData.batch_id}
                                readOnly
                                disabled
                                placeholder="Select grain type"
                                className="mt-1 bg-gray-100 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <Label htmlFor="grain_type" className="text-sm font-medium">Grain Type</Label>
                              <Select value={formData.grain_type} onValueChange={(value) => {
                                setFormData({ ...formData, grain_type: value })
                                generateBatchId(value)
                              }}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select grain type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Wheat">Wheat</SelectItem>
                                  <SelectItem value="Rice">Rice</SelectItem>
                                  <SelectItem value="Maize">Maize</SelectItem>
                                  <SelectItem value="Corn">Corn</SelectItem>
                                  <SelectItem value="Barley">Barley</SelectItem>
                                  <SelectItem value="Sorghum">Sorghum</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="quantity_kg" className="text-sm font-medium">Quantity (kg)</Label>
                              <Input
                                id="quantity_kg"
                                type="number"
                                value={formData.quantity_kg}
                                onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                                placeholder="Enter quantity"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="silo_id" className="text-sm font-medium">Silo Assignment</Label>
                              <Select value={formData.silo_id} onValueChange={(value) => setFormData({ ...formData, silo_id: value })}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder={formData.grain_type ? "Select compatible silo" : "Select grain type first"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSilos.map((silo) => (
                                    <SelectItem key={silo._id} value={silo._id}>
                                      {silo.name} (Available: {(silo.capacity_kg - (silo.current_occupancy_kg || 0)).toLocaleString()} kg)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="purchase_price_per_kg" className="text-sm font-medium">Purchase Price (PKR/kg)</Label>
                              <Input
                                id="purchase_price_per_kg"
                                type="number"
                                step="0.01"
                                value={formData.purchase_price_per_kg}
                                onChange={(e) => setFormData({ ...formData, purchase_price_per_kg: e.target.value })}
                                placeholder="Enter purchase price per kg"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="grade" className="text-sm font-medium">Grade</Label>
                              <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Premium">Premium</SelectItem>
                                  <SelectItem value="Standard">Standard</SelectItem>
                                  <SelectItem value="A">Grade A</SelectItem>
                                  <SelectItem value="B">Grade B</SelectItem>
                                  <SelectItem value="C">Grade C</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                              <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes about this batch"
                                className="mt-1 h-24"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddBatch} className="bg-black hover:bg-gray-800 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Batch
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batches.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active grain batches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {batches.reduce((sum, batch) => sum + (batch.quantity_kg - (batch.dispatched_quantity_kg || 0)), 0).toLocaleString()} kg
                </div>
                <p className="text-xs text-muted-foreground">
                  Grain in storage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {batches.filter(b => b.spoilage_label === 'Risky' || b.spoilage_label === 'Spoiled').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Batches need attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(batches.reduce((sum, batch) => sum + batch.risk_score, 0) / batches.length)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  AI risk assessment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            {/* <CardHeader>
          <CardTitle>Filter Batches</CardTitle>
          <CardDescription>Search and filter grain batches</CardDescription>
        </CardHeader> */}
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by batch ID or grain type "
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="stored">Stored</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={grainTypeFilter} onValueChange={setGrainTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Grain Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grains</SelectItem>
                    <SelectItem value="Wheat">Wheat</SelectItem>
                    <SelectItem value="Rice">Rice</SelectItem>
                    <SelectItem value="Maize">Maize</SelectItem>
                    <SelectItem value="Corn">Corn</SelectItem>
                    <SelectItem value="Barley">Barley</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Batches Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {statusFilter === 'stored' ? 'Stored Batches' :
                  statusFilter === 'dispatched' ? 'Dispatched Batches' :
                    statusFilter === 'sold' ? 'Sold Batches' : 'Grain Batches'}
              </CardTitle>
              <CardDescription>
                {statusFilter === 'stored' ? 'List of stored grain batches' :
                  statusFilter === 'dispatched' ? 'List of dispatched grain batches' :
                    statusFilter === 'sold' ? 'List of sold grain batches' : 'Complete list of grain batches'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {statusFilter === 'dispatched' || statusFilter === 'sold' ? (
                      <>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Grain Type</TableHead>
                        <TableHead>Dispatched Qty</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Dispatch Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Grain Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Added by</TableHead>
                        <TableHead>Silo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Intake Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow key={batch._id}>
                      {statusFilter === 'dispatched' || statusFilter === 'sold' ? (
                        <>
                          <TableCell className="font-medium">{batch.batch_id}</TableCell>
                          <TableCell>{batch.grain_type}</TableCell>
                          <TableCell>{batch.dispatched_quantity_kg?.toLocaleString() || batch.quantity_kg.toLocaleString()} kg</TableCell>
                          <TableCell>{batch.dispatch_details?.buyer_name || batch.buyer_id?.name || 'N/A'}</TableCell>
                          <TableCell>{batch.actual_dispatch_date ? new Date(batch.actual_dispatch_date).toLocaleDateString() : batch.dispatch_details?.dispatch_date ? new Date(batch.dispatch_details.dispatch_date).toLocaleDateString() : new Date(batch.intake_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              Dispatched
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleQRCodeClick(batch)}
                                  className="cursor-pointer"
                                >
                                  <QrCode className="h-4 w-4 mr-2" />
                                  View QR Code
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleViewBatch(batch)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const token = localStorage.getItem('token')
                                    fetch(`/api/logging/batches/${batch._id}/report`, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    }).then(res => res.blob()).then(blob => {
                                      const url = URL.createObjectURL(blob)
                                      const a = document.createElement('a')
                                      a.href = url
                                      a.download = `batch-report-${batch.batch_id}.pdf`
                                      a.click()
                                      URL.revokeObjectURL(url)
                                      toast.success('Report downloaded!')
                                    }).catch(() => toast.error('Failed to download report'))
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">{batch.batch_id}</TableCell>
                          <TableCell>{batch.grain_type}</TableCell>
                          <TableCell>{(batch.quantity_kg - (batch.dispatched_quantity_kg || 0)).toLocaleString()} kg</TableCell>
                          <TableCell>{batch.farmer_name || 'N/A'}</TableCell>
                          <TableCell>{batch.silo_id?.name || 'No Silo Assigned'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(batch.status)}>
                              {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRiskBadge(batch.risk_score, batch.spoilage_label)}>
                              {batch.spoilage_label} ({batch.risk_score}%)
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(batch.intake_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleQRCodeClick(batch)}
                                  className="cursor-pointer"
                                >
                                  <QrCode className="h-4 w-4 mr-2" />
                                  View QR Code
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleViewBatch(batch)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {(userRole === 'admin' || userRole === 'super_admin' || userRole === 'manager') && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleEditClick(batch)}
                                      className="cursor-pointer"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Batch
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openDispatchDialog(batch)}
                                      className="cursor-pointer"
                                      disabled={batch.status === 'dispatched' || batch.status === 'sold'}
                                    >
                                      <Truck className="h-4 w-4 mr-2" />
                                      Dispatch Batch
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteClick(batch)}
                                      className="cursor-pointer text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Batch
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedBatch(batch)
                                    setIsSpoilageDialogOpen(true)
                                  }}
                                  className="cursor-pointer text-orange-600 focus:text-orange-600"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Log Spoilage
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const token = localStorage.getItem('token')
                                    fetch(`/api/logging/batches/${batch._id}/report`, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    }).then(res => res.blob()).then(blob => {
                                      const url = URL.createObjectURL(blob)
                                      const a = document.createElement('a')
                                      a.href = url
                                      a.download = `batch-report-${batch.batch_id}.pdf`
                                      a.click()
                                      URL.revokeObjectURL(url)
                                      toast.success('Report downloaded!')
                                    }).catch(() => toast.error('Failed to download report'))
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredBatches.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No grain batches found matching your filters</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* View Batch Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Batch Details - {selectedBatch?.batch_id}
                </DialogTitle>
                <DialogDescription>
                  Complete information about this grain batch
                </DialogDescription>
              </DialogHeader>
              {selectedBatch && (
                <div className="space-y-6 py-4">
                  {/* Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <Badge className={getStatusBadge(selectedBatch.status)}>
                              {selectedBatch.status.charAt(0).toUpperCase() + selectedBatch.status.slice(1)}
                            </Badge>
                          </div>
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                            <Badge className={getRiskBadge(selectedBatch.risk_score, selectedBatch.spoilage_label)}>
                              {selectedBatch.spoilage_label} ({selectedBatch.risk_score}%)
                            </Badge>
                          </div>
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                            <p className="text-lg font-semibold">{selectedBatch.quantity_kg.toLocaleString()} kg</p>
                          </div>
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Consolidated Batch Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Batch Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="font-semibold">Batch ID</Label>
                            <p className="text-sm text-muted-foreground font-mono">{selectedBatch.batch_id}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Grain Type</Label>
                            <p className="text-sm text-muted-foreground">{selectedBatch.grain_type}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Grade</Label>
                            <p className="text-sm text-muted-foreground">{selectedBatch.grade || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Moisture Content</Label>
                            <p className="text-sm text-muted-foreground">{selectedBatch.moisture_content ? `${selectedBatch.moisture_content}%` : 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Silo</Label>
                            <p className="text-sm text-muted-foreground">{selectedBatch.silo_id?.name || 'No Silo Assigned'}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label className="font-semibold">Added By</Label>
                            <p className="text-sm text-muted-foreground">{selectedBatch.farmer_name || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Contact</Label>
                            <p className="text-sm text-muted-foreground">{selectedBatch.farmer_contact || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Intake Date</Label>
                            <p className="text-sm text-muted-foreground">{new Date(selectedBatch.intake_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">QR Code</Label>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-mono text-muted-foreground">{selectedBatch.qr_code || 'Not generated'}</p>
                              {selectedBatch.qr_code && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setIsViewDialogOpen(false)
                                    handleQRCodeClick(selectedBatch)
                                  }}
                                  className="ml-2"
                                >
                                  <QrCode className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                          {selectedBatch.notes && (
                            <div>
                              <Label className="font-semibold">Notes</Label>
                              <p className="text-sm text-muted-foreground">{selectedBatch.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Batch History/Traceability Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Batch History & Traceability
                      </CardTitle>
                      <CardDescription>
                        Timeline of events for this grain batch
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Intake Event */}
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-blue-900">Batch Intake</h4>
                              <span className="text-xs text-blue-600">
                                {new Date(selectedBatch.intake_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-blue-700">
                              Batch {selectedBatch.batch_id} created with {selectedBatch.quantity_kg.toLocaleString()} kg of {selectedBatch.grain_type}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Added by: {selectedBatch.farmer_name || 'N/A'} • Contact: {selectedBatch.farmer_contact || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Quality Recording Event */}
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-green-900">Quality Assessment</h4>
                              <span className="text-xs text-green-600">
                                {new Date(selectedBatch.intake_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-green-700">
                              Moisture Content: {selectedBatch.moisture_content || 'N/A'}% • Grade: {selectedBatch.grade || 'N/A'}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Quality tests recorded during intake
                            </p>
                          </div>
                        </div>

                        {/* Storage Assignment Event */}
                        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-purple-900">Storage Assignment</h4>
                              <span className="text-xs text-purple-600">
                                {new Date(selectedBatch.intake_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-purple-700">
                              Assigned to Silo: {selectedBatch.silo_id?.name || 'No Silo Assigned'}
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                              Storage capacity: {selectedBatch.silo_id?.capacity_kg?.toLocaleString() || 'N/A'} kg
                            </p>
                          </div>
                        </div>

                        {/* Risk Assessment Event */}
                        <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-orange-900">Risk Assessment</h4>
                              <span className="text-xs text-orange-600">
                                {new Date(selectedBatch.intake_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-orange-700">
                              Risk Level: {selectedBatch.spoilage_label} ({selectedBatch.risk_score}%)
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              Current status: {selectedBatch.status}
                            </p>
                          </div>
                        </div>

                        {/* Dispatch Event (if dispatched) */}
                        {selectedBatch.dispatch_details && (
                          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                              <Truck className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-green-900">Batch Dispatch</h4>
                                <span className="text-xs text-green-600">
                                  {selectedBatch.dispatch_details.dispatch_date ?
                                    new Date(selectedBatch.dispatch_details.dispatch_date).toLocaleDateString() :
                                    'N/A'
                                  }
                                </span>
                              </div>
                              <p className="text-sm text-green-700">
                                Dispatched to: {selectedBatch.dispatch_details.buyer_name || 'N/A'}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                Quantity: {selectedBatch.dispatch_details.quantity || 'N/A'} kg •
                                Contact: {selectedBatch.dispatch_details.buyer_contact || 'N/A'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* No additional events message */}
                        {!selectedBatch.dispatch_details && (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No additional events recorded yet</p>
                            <p className="text-xs">Dispatch and other events will appear here</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Batch Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-600" />
                  Edit Grain Batch
                </DialogTitle>
                <DialogDescription>
                  Update grain batch information with comprehensive details and quality metrics
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Consolidated Grain Batch Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Grain Batch Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit_batch_id" className="text-sm font-medium">Batch ID</Label>
                          <Input
                            id="edit_batch_id"
                            value={formData.batch_id}
                            onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                            placeholder="e.g., GH-2024-001"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit_grain_type" className="text-sm font-medium">Grain Type</Label>
                          <Select value={formData.grain_type} onValueChange={(value) => setFormData({ ...formData, grain_type: value })}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select grain type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Wheat">Wheat</SelectItem>
                              <SelectItem value="Rice">Rice</SelectItem>
                              <SelectItem value="Maize">Maize</SelectItem>
                              <SelectItem value="Corn">Corn</SelectItem>
                              <SelectItem value="Barley">Barley</SelectItem>
                              <SelectItem value="Sorghum">Sorghum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="edit_quantity_kg" className="text-sm font-medium">Quantity (kg)</Label>
                          <Input
                            id="edit_quantity_kg"
                            type="number"
                            value={formData.quantity_kg}
                            onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                            placeholder="Enter quantity"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit_silo_id" className="text-sm font-medium">Silo Assignment</Label>
                          <Select value={formData.silo_id} onValueChange={(value) => setFormData({ ...formData, silo_id: value })}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select silo" />
                            </SelectTrigger>
                            <SelectContent>
                              {silos.map((silo) => (
                                <SelectItem key={silo._id} value={silo._id}>
                                  {silo.name} (Available: {(silo.capacity_kg - (silo.current_occupancy_kg || 0)).toLocaleString()} kg)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit_grade" className="text-sm font-medium">Grade</Label>
                          <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Premium">Premium</SelectItem>
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="A">Grade A</SelectItem>
                              <SelectItem value="B">Grade B</SelectItem>
                              <SelectItem value="C">Grade C</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="edit_notes" className="text-sm font-medium">Notes</Label>
                          <Textarea
                            id="edit_notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes about this batch"
                            className="mt-1 h-24"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditBatch} className="bg-black hover:bg-gray-800 text-white">
                  <Edit className="h-4 w-4 mr-2" />
                  Update Batch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Batch Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Delete Grain Batch
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the grain batch and remove it from storage.
                </DialogDescription>
              </DialogHeader>
              {selectedBatch && (
                <div className="py-4">
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full">
                          <Package className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-800">Batch {selectedBatch.batch_id}</p>
                          <p className="text-sm text-red-600">
                            {selectedBatch.grain_type} • {selectedBatch.quantity_kg.toLocaleString()} kg
                          </p>
                          <p className="text-xs text-red-500 mt-1">
                            Stored in: {selectedBatch.silo_id?.name || 'No Silo Assigned'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteBatch} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Batch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* QR Code Dialog */}
          {/* Dispatch Batch Dialog */}
          <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <Truck className="h-5 w-5" />
                  Dispatch Grain Batch
                </DialogTitle>
                <DialogDescription>
                  Dispatch this grain batch
                </DialogDescription>
              </DialogHeader>

              {selectedBatch && (
                <div className="py-4 space-y-6">
                  {/* Module 8: Final Dispatch & Buyer Trace */}
                  <div className="space-y-4">
                    {/* Batch Information */}
                    <Card className="p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            {selectedBatch.batch_id} - {selectedBatch.grain_type} ({selectedBatch.quantity_kg.toLocaleString()} kg)
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Dispatch Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Buyer Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="buyer_id">Select Buyer *</Label>
                          <Select
                            value={dispatchData.buyer_id}
                            onValueChange={(value) => {
                              const buyer = availableBuyers.find(b => b._id === value)
                              setDispatchData({
                                ...dispatchData,
                                buyer_id: value,
                                buyer_name: buyer?.name || '',
                                buyer_email: buyer?.contact_person?.email || '',
                                buyer_contact: buyer?.contact_person?.phone || ''
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select buyer from existing list" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableBuyers.map((buyer) => (
                                <SelectItem key={buyer._id} value={buyer._id}>
                                  {buyer.name} {buyer.company_name ? `(${buyer.company_name})` : ''} - {buyer.contact_person?.phone || buyer.contact_person?.email || ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity and Pricing */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="quantity_dispatched">Quantity (kg) *</Label>
                            <Input
                              id="quantity_dispatched"
                              type="number"
                              step="0.01"
                              value={dispatchData.quantity_dispatched}
                              onChange={(e) => setDispatchData({ ...dispatchData, quantity_dispatched: e.target.value })}
                              placeholder="Enter quantity"
                              max={selectedBatch.quantity_kg - (selectedBatch.dispatched_quantity_kg || 0)}
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground">
                              Available: {(selectedBatch.quantity_kg - (selectedBatch.dispatched_quantity_kg || 0)).toLocaleString()} kg
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sell_price_per_kg">Price (PKR/kg) *</Label>
                            <Input
                              id="sell_price_per_kg"
                              type="number"
                              step="0.01"
                              value={dispatchData.sell_price_per_kg}
                              onChange={(e) => setDispatchData({ ...dispatchData, sell_price_per_kg: e.target.value })}
                              placeholder="Enter price per kg"
                              className="mt-1"
                            />
                            {selectedBatch.purchase_price_per_kg && dispatchData.sell_price_per_kg && (
                              <p className="text-xs text-green-600">
                                Profit: PKR {((Number(dispatchData.sell_price_per_kg) - selectedBatch.purchase_price_per_kg) * Number(dispatchData.quantity_dispatched || 0)).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Date and Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="dispatch_date">Dispatch Date *</Label>
                            <Input
                              id="dispatch_date"
                              type="date"
                              value={dispatchData.dispatch_date}
                              onChange={(e) => setDispatchData({ ...dispatchData, dispatch_date: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dispatch_notes">Notes</Label>
                            <Textarea
                              id="dispatch_notes"
                              value={dispatchData.notes}
                              onChange={(e) => setDispatchData({ ...dispatchData, notes: e.target.value })}
                              placeholder="Add dispatch notes"
                              className="mt-1 h-16"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDispatchDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDispatchBatch}
                  className="bg-black hover:bg-gray-800 text-white"
                  disabled={(!dispatchData.buyer_id && !dispatchData.buyer_name) || (!dispatchData.buyer_id && !dispatchData.buyer_contact) || !dispatchData.quantity_dispatched || !dispatchData.sell_price_per_kg || !dispatchData.dispatch_date}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Dispatch Batch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Spoilage Event Dialog */}
          <Dialog open={isSpoilageDialogOpen} onOpenChange={setIsSpoilageDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  Log Spoilage Event - {selectedBatch?.batch_id}
                </DialogTitle>
                <DialogDescription>
                  Report spoilage or quality issues for this batch. This will notify managers.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={spoilageData.type} onValueChange={(v) => setSpoilageData({ ...spoilageData, type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pests">Pest Infestation</SelectItem>
                        <SelectItem value="mold">Mold / Fungi</SelectItem>
                        <SelectItem value="moisture">High Moisture</SelectItem>
                        <SelectItem value="heat">Overheating</SelectItem>
                        <SelectItem value="smell">Abnormal Smell</SelectItem>
                        <SelectItem value="contamination">Contamination</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={spoilageData.severity} onValueChange={(v) => setSpoilageData({ ...spoilageData, severity: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Minor issue)</SelectItem>
                        <SelectItem value="medium">Medium (Requires attention)</SelectItem>
                        <SelectItem value="high">High (Significant loss)</SelectItem>
                        <SelectItem value="critical">Critical (Batch at risk)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Loss (kg)</Label>
                  <Input
                    type="number"
                    placeholder="How much grain is affected?"
                    value={spoilageData.estimated_loss_kg}
                    onChange={(e) => setSpoilageData({ ...spoilageData, estimated_loss_kg: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the issue in detail..."
                    value={spoilageData.description}
                    onChange={(e) => setSpoilageData({ ...spoilageData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperature (°C)</Label>
                    <Input
                      type="number"
                      placeholder="Internal temp"
                      value={spoilageData.temperature}
                      onChange={(e) => setSpoilageData({ ...spoilageData, temperature: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Humidity (%)</Label>
                    <Input
                      type="number"
                      placeholder="Internal humidity"
                      value={spoilageData.humidity}
                      onChange={(e) => setSpoilageData({ ...spoilageData, humidity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Immediate Action Taken</Label>
                  <Input
                    placeholder="e.g. Fumigated, Moved to drying, No action yet"
                    value={spoilageData.action_taken}
                    onChange={(e) => setSpoilageData({ ...spoilageData, action_taken: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photos of Damage</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {spoilagePhotos.map((f, i) => (
                      <Badge key={i} variant="secondary" className="pr-1 gap-1">
                        {f.name.substring(0, 15)}...
                        <XCircle
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => setSpoilagePhotos(prev => prev.filter((_, idx) => idx !== i))}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('spoilage-photo-input')?.click()}
                      className="w-full border-dashed"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Add Photos
                    </Button>
                    <input
                      id="spoilage-photo-input"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setSpoilagePhotos(prev => [...prev, ...Array.from(e.target.files!)])
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSpoilageDialogOpen(false)}>Cancel</Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleLogSpoilage}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Log Spoilage Event"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          {selectedBatch && (
            <QRCodeDisplay
              qrCode={selectedBatch.qr_code || ''}
              batchId={selectedBatch.batch_id}
              grainType={selectedBatch.grain_type}
              isOpen={isQRDialogOpen}
              onClose={() => setIsQRDialogOpen(false)}
            />
          )}
        </div>
      </div>
    </AnimatedBackground>
  )
}
