"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Download, Edit, Trash2, Eye, AlertTriangle, Clock, CheckCircle } from "lucide-react"

// Mock data for grain-related incidents
const incidentData = [
  {
    id: "INC001",
    title: "Temperature Spike in Silo B",
    type: "Environmental",
    severity: "High",
    status: "Investigating",
    location: "Silo B",
    reportedBy: "Hassan Sheikh",
    reportedDate: "2024-01-15",
    description: "Temperature sensors detected readings above 30°C in Silo B, potential spoilage risk",
    affectedBatch: "GH002",
    estimatedLoss: 5000 // PKR
  },
  {
    id: "INC002", 
    title: "Moisture Content Anomaly",
    type: "Quality Control",
    severity: "Medium",
    status: "Resolved",
    location: "Processing Area",
    reportedBy: "Fatima Ali",
    reportedDate: "2024-01-12",
    description: "Batch GH001 showed moisture levels above acceptable range during quality check",
    affectedBatch: "GH001",
    estimatedLoss: 2500
  },
  {
    id: "INC003",
    title: "Conveyor Belt Malfunction",
    type: "Equipment",
    severity: "Critical",
    status: "In Progress",
    location: "Storage Area A",
    reportedBy: "Aisha Malik",
    reportedDate: "2024-01-14",
    description: "Main conveyor belt stopped working during grain transfer, causing production delay",
    affectedBatch: "GH003",
    estimatedLoss: 15000
  },
  {
    id: "INC004",
    title: "Pest Infestation Alert",
    type: "Contamination",
    severity: "High",
    status: "Open",
    location: "Warehouse Section C",
    reportedBy: "Hassan Sheikh",
    reportedDate: "2024-01-13",
    description: "Grain weevils detected in stored wheat inventory, immediate fumigation required",
    affectedBatch: "GH004",
    estimatedLoss: 8000
  },
  {
    id: "INC005",
    title: "Power Outage Impact",
    type: "Infrastructure",
    severity: "Medium",
    status: "Resolved",
    location: "Entire Facility",
    reportedBy: "Facility Manager",
    reportedDate: "2024-01-10",
    description: "2-hour power outage affected climate control systems",
    affectedBatch: "Multiple",
    estimatedLoss: 3000
  }
]

export default function IncidentsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [incidents] = useState(incidentData)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 10



  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "destructive"
      case "high": return "secondary"
      case "medium": return "outline"
      case "low": return "default"
      default: return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "resolved": return "default"
      case "in progress": case "investigating": return "secondary"
      case "open": return "destructive"
      default: return "outline"
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.reportedBy.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || incident.type === filterType
    const matchesSeverity = filterSeverity === "all" || incident.severity === filterSeverity
    const matchesStatus = filterStatus === "all" || incident.status === filterStatus
    return matchesSearch && matchesType && matchesSeverity && matchesStatus
  })

  const totalPages = Math.ceil(filteredIncidents.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const paginatedIncidents = filteredIncidents.slice(startIndex, startIndex + recordsPerPage)

  const openIncidents = incidents.filter(i => i.status === "Open" || i.status === "In Progress").length
  const resolvedIncidents = incidents.filter(i => i.status === "Resolved").length
  const totalLoss = incidents.reduce((sum, incident) => sum + incident.estimatedLoss, 0)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Incident Management</h2>
          <p className="text-muted-foreground">
            Track and manage grain storage and processing incidents
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Link href="/incidents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Report Incident
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Cases</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{openIncidents}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedIncidents}</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Loss</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">PKR {totalLoss.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total impact</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Records</CardTitle>
          <CardDescription>Monitor and track all grain-related incidents and their resolution status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search incidents, location, or reporter..."
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
                <SelectItem value="Environmental">Environmental</SelectItem>
                <SelectItem value="Quality Control">Quality Control</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Contamination">Contamination</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Investigating">Investigating</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Incidents Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Est. Loss</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{incident.title}</div>
                        <div className="text-sm text-muted-foreground">{incident.id}</div>
                        </div>
                      </TableCell>
                    <TableCell>{incident.type}</TableCell>
                      <TableCell>
                      <Badge variant={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                      </TableCell>
                      <TableCell>
                      <Badge variant={getStatusColor(incident.status)}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{incident.location}</TableCell>
                    <TableCell>{incident.reportedBy}</TableCell>
                    <TableCell>{incident.reportedDate}</TableCell>
                    <TableCell className="text-red-600 font-medium">
                      PKR {incident.estimatedLoss.toLocaleString()}
                      </TableCell>
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
                Showing {startIndex + 1} to {Math.min(startIndex + recordsPerPage, filteredIncidents.length)} of {filteredIncidents.length} incidents
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