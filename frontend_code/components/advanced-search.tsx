"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, X, CalendarIcon, Plus, Save, Download, Share } from "lucide-react"
import { useLanguage } from "@/app/[locale]/providers"
import { format } from "date-fns"

interface SearchResult {
  id: string
  name: string
  type: string
  status: string
  [key: string]: unknown
}

interface SearchFilter {
  id: string
  field: string
  operator: string
  value: string
  type: "text" | "number" | "date" | "select"
}

interface SavedSearch {
  id: string
  name: string
  description: string
  filters: SearchFilter[]
  createdDate: string
}

const searchFields = {
  animals: [
    { value: "tagId", label: "Tag ID", type: "text" },
    { value: "breed", label: "Breed", type: "select" },
    { value: "gender", label: "Gender", type: "select" },
    { value: "dob", label: "Date of Birth", type: "date" },
    { value: "weight", label: "Weight", type: "number" },
    { value: "condition", label: "Condition", type: "select" },
    { value: "status", label: "Status", type: "select" },
    { value: "location", label: "Location", type: "select" },
  ],
  health: [
    { value: "animalTagId", label: "Animal Tag ID", type: "text" },
    { value: "healthIssue", label: "Health Issue", type: "text" },
    { value: "diagnosis", label: "Diagnosis", type: "text" },
    { value: "veterinarian", label: "Veterinarian", type: "text" },
    { value: "treatmentDate", label: "Treatment Date", type: "date" },
    { value: "severity", label: "Severity", type: "select" },
    { value: "cost", label: "Cost", type: "number" },
    { value: "status", label: "Status", type: "select" },
  ],
  breeding: [
    { value: "sireTagId", label: "Sire Tag ID", type: "text" },
    { value: "damTagId", label: "Dam Tag ID", type: "text" },
    { value: "breedingDate", label: "Breeding Date", type: "date" },
    { value: "breedingMethod", label: "Breeding Method", type: "select" },
    { value: "expectedDelivery", label: "Expected Delivery", type: "date" },
    { value: "numberOfOffspring", label: "Number of Offspring", type: "number" },
    { value: "status", label: "Status", type: "select" },
  ],
}

const operators = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
    { value: "startsWith", label: "Starts with" },
    { value: "endsWith", label: "Ends with" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "greaterThan", label: "Greater than" },
    { value: "lessThan", label: "Less than" },
    { value: "between", label: "Between" },
  ],
  date: [
    { value: "equals", label: "Equals" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "between", label: "Between" },
  ],
  select: [
    { value: "equals", label: "Equals" },
    { value: "in", label: "In" },
    { value: "notIn", label: "Not in" },
  ],
}

const savedSearches: SavedSearch[] = [
  {
    id: "SS001",
    name: "Critical Health Issues",
    description: "Animals with critical health conditions",
    filters: [
      { id: "F001", field: "severity", operator: "equals", value: "Critical", type: "select" },
      { id: "F002", field: "status", operator: "equals", value: "Pending", type: "select" },
    ],
    createdDate: "2024-01-20",
  },
  {
    id: "SS002",
    name: "Recent Breeding Activities",
    description: "Breeding records from last 30 days",
    filters: [{ id: "F003", field: "breedingDate", operator: "after", value: "2023-12-25", type: "date" }],
    createdDate: "2024-01-18",
  },
]

export function AdvancedSearch() {
  const [activeModule, setActiveModule] = useState("animals")
  const [filters, setFilters] = useState<SearchFilter[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [searchName, setSearchName] = useState("")
  const [searchDescription, setSearchDescription] = useState("")
  const { t } = useLanguage()

  const addFilter = () => {
    const newFilter: SearchFilter = {
      id: `F${Date.now()}`,
      field: "",
      operator: "",
      value: "",
      type: "text",
    }
    setFilters([...filters, newFilter])
  }

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id))
  }

  const updateFilter = (id: string, updates: Partial<SearchFilter>) => {
    setFilters(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const executeSearch = async () => {
    setIsSearching(true)
    // Simulate search API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock search results
    const mockResults = [
      { id: "R001", name: "Animal G001", type: "Boer Goat", status: "Active" },
      { id: "R002", name: "Health Record H045", type: "Vaccination", status: "Completed" },
      { id: "R003", name: "Breeding B023", type: "Natural Mating", status: "Successful" },
    ]

    setSearchResults(mockResults)
    setIsSearching(false)
  }

  const saveSearch = () => {
    // Save search logic here
    console.log("Saving search:", { searchName, searchDescription, filters })
    setShowSaveDialog(false)
    setSearchName("")
    setSearchDescription("")
  }

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters)
  }

  const clearFilters = () => {
    setFilters([])
    setSearchResults([])
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>{t("advancedSearch")}</span>
        </CardTitle>
        <CardDescription>Create complex search queries across all farm management modules</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-4">
          <TabsList>
            <TabsTrigger value="animals">Animals</TabsTrigger>
            <TabsTrigger value="health">Health Records</TabsTrigger>
            <TabsTrigger value="breeding">Breeding</TabsTrigger>
            <TabsTrigger value="saved">Saved Searches</TabsTrigger>
          </TabsList>

          <TabsContent value="animals" className="space-y-4">
            <div className="space-y-4">
              {/* Search Filters */}
              <div className="space-y-3">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Select
                      value={filter.field}
                      onValueChange={(value) => {
                        const field = searchFields[activeModule as keyof typeof searchFields]?.find(
                          (f) => f.value === value,
                        )
                        updateFilter(filter.id, {
                          field: value,
                          type: field?.type as "text" | "number" | "date" | "select",
                          operator: "",
                          value: "",
                        })
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a field to search" />
                      </SelectTrigger>
                      <SelectContent>
                        {searchFields[activeModule as keyof typeof searchFields]?.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                      disabled={!filter.field}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators[filter.type]?.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {filter.type === "date" ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-[200px] justify-start text-left font-normal bg-transparent"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filter.value ? format(new Date(filter.value), "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filter.value ? new Date(filter.value) : undefined}
                            onSelect={(date) =>
                              updateFilter(filter.id, { value: date?.toISOString().split("T")[0] || "" })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input
                        placeholder="Enter search value"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        className="w-[200px]"
                        type={filter.type === "number" ? "number" : "text"}
                      />
                    )}

                    <Button variant="outline" size="sm" onClick={() => removeFilter(filter.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Filter Button */}
              <Button variant="outline" onClick={addFilter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>

              {/* Search Actions */}
              <div className="flex space-x-2">
                <Button onClick={executeSearch} disabled={filters.length === 0 || isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Search
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Search Results ({searchResults.length})</span>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{result.name}</h4>
                            <p className="text-sm text-gray-500">{result.type}</p>
                          </div>
                          <Badge variant="outline">{result.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <p className="text-gray-500">Health records search interface would be similar to animals...</p>
          </TabsContent>

          <TabsContent value="breeding" className="space-y-4">
            <p className="text-gray-500">Breeding records search interface would be similar to animals...</p>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Saved Searches</h3>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Search
                </Button>
              </div>

              <div className="space-y-3">
                {savedSearches.map((search) => (
                  <Card key={search.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{search.name}</h4>
                          <p className="text-sm text-gray-500">{search.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-400">Created: {search.createdDate}</span>
                            <span className="text-xs text-gray-400">{search.filters.length} filters</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => loadSavedSearch(search)}>
                            Load
                          </Button>
                          <Button variant="outline" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Search Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Save Search</CardTitle>
                <CardDescription>Save this search for future use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search-name">Search Name</Label>
                  <Input
                    id="search-name"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Enter a name for this search"
                  />
                </div>
                <div>
                  <Label htmlFor="search-description">Description</Label>
                  <Input
                    id="search-description"
                    value={searchDescription}
                    onChange={(e) => setSearchDescription(e.target.value)}
                    placeholder="Enter description for this search"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveSearch}>Save</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
