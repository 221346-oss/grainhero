"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  QrCode,
  MapPin,
  Clock,
  Package,
  Search,
  Eye,
  Download,
  Truck,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText
} from "lucide-react"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import QRCodeDisplay from "@/components/QRCodeDisplay"

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
  dispatch_details?: {
    buyer_name: string
    buyer_contact: string
    quantity: number
    dispatch_date: string
    notes?: string
  }
}

export default function TraceabilityPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [isLoading, setIsLoading] = useState(true)
  const [batches, setBatches] = useState<GrainBatch[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBatch, setSelectedBatch] = useState<GrainBatch | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)

  const fetchBatches = async () => {
    try {
      const res = await api.get<{ batches: GrainBatch[] }>(`/api/grain-batches?limit=100`)
      if (res.ok && res.data) {
        setBatches(res.data.batches)
      } else {
        toast.error('Failed to fetch grain batches')
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
      toast.error('Failed to fetch grain batches')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  // Refresh data when page becomes visible (handles data sync issues)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBatches()
      }
    }

    const handleFocus = () => {
      fetchBatches()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.grain_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.farmer_name && batch.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'stored':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'dispatched':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'sold':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'damaged':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 70) return 'bg-red-100 text-red-800 border-red-200'
    if (riskScore >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const handleViewBatch = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setIsViewDialogOpen(true)
  }

  const handleQRCodeClick = (batch: GrainBatch) => {
    setSelectedBatch(batch)
    setIsQRDialogOpen(true)
  }

  const handleExportReport = async () => {
    try {
      // Create a comprehensive traceability report
      const reportData = {
        title: 'Grain Traceability Report',
        generatedAt: new Date().toISOString(),
        summary: {
          totalBatches: batches.length,
          stored: batches.filter(b => b.status === 'stored').length,
          dispatched: batches.filter(b => b.status === 'dispatched').length,
          highRisk: batches.filter(b => b.risk_score >= 70).length
        },
        batches: batches.map(batch => ({
          batchId: batch.batch_id,
          grainType: batch.grain_type,
          quantity: batch.quantity_kg,
          status: batch.status,
          riskScore: batch.risk_score,
          spoilageLabel: batch.spoilage_label,
          silo: batch.silo_id?.name || 'N/A',
          farmer: batch.farmer_name || 'N/A',
          intakeDate: batch.intake_date,
          dispatchDetails: batch.dispatch_details || null
        }))
      }

      // Convert to CSV format
      const csvHeaders = 'Batch ID,Grain Type,Quantity (kg),Status,Risk Score,Spoilage Label,Silo,Farmer,Intake Date,Buyer,Dispatched Date\n'
      const csvRows = reportData.batches.map(batch =>
        `${batch.batchId},${batch.grainType},${batch.quantity},${batch.status},${batch.riskScore},${batch.spoilageLabel},${batch.silo},${batch.farmer},${new Date(batch.intakeDate).toLocaleDateString()},${batch.dispatchDetails?.buyer_name || 'N/A'},${batch.dispatchDetails?.dispatch_date ? new Date(batch.dispatchDetails.dispatch_date).toLocaleDateString() : 'N/A'}`
      ).join('\n')

      const csvContent = csvHeaders + csvRows

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `grain-traceability-report-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Traceability report exported successfully')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    }
  }

  const handleDownloadPDF = async (batchId: string, batch_id_string: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/logging/batches/${batchId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `traceability-report-${batch_id_string}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF report downloaded!')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF report')
    }
  }

  const handleScanQRCode = () => {
    // For now, show a modal with instructions for QR scanning
    // In a real implementation, this would integrate with device camera
    toast.info('QR Code scanning functionality would integrate with device camera in production')

    // You could implement a file upload for QR code images here
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // Here you would process the uploaded QR code image
        toast.info('QR Code image uploaded. In production, this would decode the QR code and fetch batch details.')
      }
    }
    input.click()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#effbf7]">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-[#00a63e] animate-pulse" />
          <p className="text-gray-600 font-medium">Loading traceability data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-[#effbf7] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Grain Traceability</h2>
          <p className="text-gray-600 mt-1">Complete supply chain tracking from farm to market</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
            onClick={fetchBatches}
          >
            <Search className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button
            className="bg-[#00a63e] hover:bg-[#008a33] text-white"
            onClick={handleExportReport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            className="bg-[#00a63e] hover:bg-[#008a33] text-white"
            onClick={() => {
              if (selectedBatch) {
                handleDownloadPDF(selectedBatch._id, selectedBatch.batch_id)
              } else {
                toast.info('Please select a batch to download a detailed PDF report')
              }
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            className="border-[#00a63e] text-[#00a63e] hover:bg-[#00a63e] hover:text-white"
            onClick={handleScanQRCode}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR Code
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
              </div>
              <Package className="h-8 w-8 text-[#00a63e]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stored</p>
                <p className="text-2xl font-bold text-green-600">
                  {batches.filter(b => b.status === 'stored').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dispatched</p>
                <p className="text-2xl font-bold text-blue-600">
                  {batches.filter(b => b.status === 'dispatched').length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {batches.filter(b => b.risk_score >= 70).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter batch ID, grain type, or farmer name to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-[#00a63e] focus:ring-[#00a63e]"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] border-gray-300 focus:border-[#00a63e] focus:ring-[#00a63e]">
                <SelectValue placeholder="Filter by status" />
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
          </div>
        </CardContent>
      </Card>

      {/* Traceability Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBatches.map((batch) => (
          <Card key={batch._id} className="bg-white border-gray-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewBatch(batch)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-900">{batch.batch_id}</CardTitle>
                <Badge className={getStatusBadge(batch.status)}>
                  {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                </Badge>
              </div>
              <CardDescription className="text-gray-600">{batch.grain_type}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code Section */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <QrCode className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">QR Code</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#00a63e] text-[#00a63e] hover:bg-[#00a63e] hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQRCodeClick(batch)
                  }}
                >
                  View QR
                </Button>
              </div>

              {/* Location */}
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {batch.silo_id?.name || 'No location assigned'}
                </span>
              </div>

              {/* Quantity */}
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {batch.quantity_kg.toLocaleString()} kg
                </span>
              </div>

              {/* Risk Assessment */}
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-gray-400" />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Risk:</span>
                  <Badge className={getRiskBadge(batch.risk_score)}>
                    {batch.spoilage_label} ({batch.risk_score}%)
                  </Badge>
                </div>
              </div>

              {/* Intake Date */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Intake: {new Date(batch.intake_date).toLocaleDateString()}
                </span>
              </div>

              {/* Dispatch Status */}
              {batch.dispatch_details && (
                <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Dispatched to: {batch.dispatch_details.buyer_name}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-[#00a63e] text-[#00a63e] hover:bg-[#00a63e] hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewBatch(batch)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View History
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadPDF(batch._id, batch.batch_id)
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredBatches.length === 0 && (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No batches found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
          </CardContent>
        </Card>
      )}

      {/* View Batch Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#00a63e]">
              <Package className="h-5 w-5" />
              Complete Traceability History
            </DialogTitle>
            <DialogDescription>
              Full supply chain traceability for batch {selectedBatch?.batch_id}
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="py-4 space-y-6">
              {/* Batch Information Card */}
              <Card className="border-[#00a63e] bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Package className="h-10 w-10 text-[#00a63e]" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800 text-lg">{selectedBatch.batch_id}</h4>
                      <p className="text-sm text-green-600">
                        {selectedBatch.grain_type} • {selectedBatch.quantity_kg.toLocaleString()} kg
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Grade: {selectedBatch.grade || 'N/A'} • Variety: {selectedBatch.variety || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusBadge(selectedBatch.status)}>
                        {selectedBatch.status.charAt(0).toUpperCase() + selectedBatch.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Complete Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Complete Supply Chain Timeline
                  </CardTitle>
                  <CardDescription>
                    Every step from farm intake to final destination
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Farm Intake */}
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-blue-900">Farm Intake</h4>
                          <span className="text-xs text-blue-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Batch {selectedBatch.batch_id} received from farm
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-blue-600">
                          <div>
                            <span className="font-medium">Farmer:</span> {selectedBatch.farmer_name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Contact:</span> {selectedBatch.farmer_contact || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Quantity:</span> {selectedBatch.quantity_kg.toLocaleString()} kg
                          </div>
                          <div>
                            <span className="font-medium">Harvest Date:</span> {selectedBatch.harvest_date ? new Date(selectedBatch.harvest_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quality Assessment */}
                    <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <Thermometer className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-green-900">Quality Assessment</h4>
                          <span className="text-xs text-green-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-green-700">
                          Pre-storage quality testing and grading
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-green-600">
                          <div>
                            <span className="font-medium">Moisture:</span> {selectedBatch.moisture_content || 'N/A'}%
                          </div>
                          <div>
                            <span className="font-medium">Grade:</span> {selectedBatch.grade || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Variety:</span> {selectedBatch.variety || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> Quality Approved
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Storage Assignment */}
                    <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-purple-900">Storage Assignment</h4>
                          <span className="text-xs text-purple-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-purple-700">
                          Assigned to storage facility
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-purple-600">
                          <div>
                            <span className="font-medium">Silo:</span> {selectedBatch.silo_id?.name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Capacity:</span> {selectedBatch.silo_id?.capacity_kg?.toLocaleString() || 'N/A'} kg
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> Storage Facility
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> Stored
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-orange-900">Risk Assessment</h4>
                          <span className="text-xs text-orange-600">
                            {new Date(selectedBatch.intake_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-orange-700">
                          AI-powered spoilage risk evaluation
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-orange-600">
                          <div>
                            <span className="font-medium">Risk Level:</span> {selectedBatch.spoilage_label}
                          </div>
                          <div>
                            <span className="font-medium">Risk Score:</span> {selectedBatch.risk_score}%
                          </div>
                          <div>
                            <span className="font-medium">Assessment:</span> {selectedBatch.risk_score >= 70 ? 'High Risk' : selectedBatch.risk_score >= 40 ? 'Medium Risk' : 'Low Risk'}
                          </div>
                          <div>
                            <span className="font-medium">Monitoring:</span> Active
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dispatch Event (if dispatched) */}
                    {selectedBatch.status === 'dispatched' && selectedBatch.dispatch_details ? (
                      <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                          <Truck className="h-5 w-5 text-white" />
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
                            Dispatched to buyer
                          </p>
                          <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-green-600">
                            <div>
                              <span className="font-medium">Buyer:</span> {selectedBatch.dispatch_details.buyer_name}
                            </div>
                            <div>
                              <span className="font-medium">Contact:</span> {selectedBatch.dispatch_details.buyer_contact}
                            </div>
                            <div>
                              <span className="font-medium">Quantity:</span> {selectedBatch.dispatch_details.quantity} kg
                            </div>
                            <div>
                              <span className="font-medium">Status:</span> Delivered
                            </div>
                          </div>
                          {selectedBatch.dispatch_details.notes && (
                            <div className="mt-2 p-2 bg-white rounded text-xs text-green-700">
                              <span className="font-medium">Notes:</span> {selectedBatch.dispatch_details.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedBatch.status !== 'dispatched' ? (
                      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                          <Truck className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-700">Pending Dispatch</h4>
                          <p className="text-sm text-gray-600">
                            Batch is ready for dispatch to buyer
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* Notes */}
                    {selectedBatch.notes && (
                      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-700">Additional Notes</h4>
                          <p className="text-sm text-gray-600">{selectedBatch.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
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
  )
}
