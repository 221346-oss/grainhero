"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Download, Edit, Trash2, Eye, Wrench, Settings, Calendar, AlertTriangle } from "lucide-react"

// Mock data for grain equipment maintenance
const maintenanceData = [
  {
    id: "MNT001",
    equipment: "Grain Conveyor Belt #1",
    type: "Conveyor System",
    location: "Storage Area A",
    lastMaintenance: "2024-01-10",
    nextMaintenance: "2024-04-10",
    status: "Operational",
    priority: "Medium",
    technician: "Hassan Sheikh",
    description: "Routine belt inspection and lubrication"
  },
  {
    id: "MNT002", 
    equipment: "Temperature Control Unit",
    type: "HVAC System",
    location: "Silo B",
    lastMaintenance: "2024-01-05",
    nextMaintenance: "2024-03-05",
    status: "Maintenance Required",
    priority: "High",
    technician: "Aisha Malik",
    description: "Thermostat calibration and filter replacement"
  },
  {
    id: "MNT003",
    equipment: "Grain Dryer Unit #2",
    type: "Drying System", 
    location: "Processing Area",
    lastMaintenance: "2024-01-15",
    nextMaintenance: "2024-07-15",
    status: "Operational",
    priority: "Low",
    technician: "Hassan Sheikh",
    description: "Heat exchanger cleaning and inspection"
  },
  {
    id: "MNT004",
    equipment: "Moisture Sensor Array",
    type: "IoT Sensors",
    location: "Silo C",
    lastMaintenance: "2024-01-12",
    nextMaintenance: "2024-02-12",
    status: "Overdue",
    priority: "Critical",
    technician: "Aisha Malik",
    description: "Sensor calibration and battery replacement"
  },
  {
    id: "MNT005",
    equipment: "Ventilation Fan System",
    type: "Air Circulation",
    location: "Warehouse",
    lastMaintenance: "2024-01-08",
    nextMaintenance: "2024-05-08",
    status: "Operational",
    priority: "Medium",
    technician: "Hassan Sheikh",
    description: "Fan blade cleaning and motor inspection"
  }
]

export default function MaintenancePage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [records] = useState(maintenanceData)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 10

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational": return "default"
      case "maintenance required": return "secondary"
      case "overdue": return "destructive"
      default: return "outline"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical": return "destructive"
      case "high": return "secondary"
      case "medium": return "outline"
      case "low": return "default"
      default: return "outline"
    }
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.technician.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || record.type === filterType
    const matchesStatus = filterStatus === "all" || record.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage)

  const upcomingMaintenance = records.filter(record => {
    const nextDate = new Date(record.nextMaintenance)
    const today = new Date()
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 30 && daysUntil >= 0
  }).length

  const overdueMaintenance = records.filter(record => record.status === "Overdue").length

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Equipment Maintenance</h2>
          <p className="text-muted-foreground">
            Manage maintenance schedules for grain processing and storage equipment
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link href="/maintenance/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Maintenance
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
            <p className="text-xs text-muted-foreground">Active equipment units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingMaintenance}</div>
            <p className="text-xs text-muted-foreground">Due within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueMaintenance}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {records.filter(r => r.status === "Operational").length}
            </div>
            <p className="text-xs text-muted-foreground">Running normally</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Maintenance Records</CardTitle>
          <CardDescription>Track and manage maintenance schedules for all grain processing equipment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment, location, or technician..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Conveyor System">Conveyor System</SelectItem>
                <SelectItem value="HVAC System">HVAC System</SelectItem>
                <SelectItem value="Drying System">Drying System</SelectItem>
                <SelectItem value="IoT Sensors">IoT Sensors</SelectItem>
                <SelectItem value="Air Circulation">Air Circulation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Operational">Operational</SelectItem>
                <SelectItem value="Maintenance Required">Maintenance Required</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Records Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Next Maintenance</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map((record) => (
                  <TableRow key={record.id}>
                      <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{record.equipment}</div>
                        <div className="text-sm text-muted-foreground">{record.id}</div>
                        </div>
                      </TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>{record.location}</TableCell>
                      <TableCell>
                      <Badge variant={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                      </TableCell>
                      <TableCell>
                      <Badge variant={getPriorityColor(record.priority)}>
                        {record.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.nextMaintenance}</TableCell>
                    <TableCell>{record.technician}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + recordsPerPage, filteredRecords.length)} of {filteredRecords.length} records
            </div>
              <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
              >
                  Previous
              </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
              <Button
                variant="outline"
                size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
              >
                  Next
              </Button>
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}