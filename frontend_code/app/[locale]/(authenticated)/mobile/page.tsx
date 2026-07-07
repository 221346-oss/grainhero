"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Smartphone,
  Download,
  Wifi,
  WifiOff,
  Camera,
  Mic,
  MapPin,
  QrCode,
  Fingerprint,
  Shield,
  HardDrive,
  RefreshCw,
  Users,
  BarChart3,
  Bell,
  CloudIcon as CloudSync,
} from "lucide-react"
import { useLanguage } from "@/app/[locale]/providers"

// Mock mobile app data
const appStats = {
  totalUsers: 24,
  activeUsers: 18,
  offlineCapable: true,
  lastSync: "2024-01-25 15:30",
  dataSize: "2.4 GB",
  offlineData: "156 MB",
}

const connectedDevices = [
  {
    id: "DEV001",
    name: "Farm Manager iPhone",
    user: "John Smith",
    lastActive: "2024-01-25 15:45",
    status: "online",
    version: "2.1.0",
    platform: "iOS",
  },
  {
    id: "DEV002",
    name: "Veterinarian Android",
    user: "Dr. Sarah Johnson",
    lastActive: "2024-01-25 14:20",
    status: "offline",
    version: "2.0.8",
    platform: "Android",
  },
  {
    id: "DEV003",
    name: "Assistant Tablet",
    user: "Mike Wilson",
    lastActive: "2024-01-25 16:10",
    status: "online",
    version: "2.1.0",
    platform: "Android",
  },
]

const mobileFeatures = [
  {
    name: "Offline Data Entry",
    description: "Record data without internet connection",
    enabled: true,
    icon: WifiOff,
    usage: "89%",
  },
  {
    name: "Photo Capture",
    description: "Take photos of animals and incidents",
    enabled: true,
    icon: Camera,
    usage: "76%",
  },
  {
    name: "Voice Recording",
    description: "Record voice notes and observations",
    enabled: false,
    icon: Mic,
    usage: "23%",
  },
  {
    name: "GPS Location",
    description: "Track location for field activities",
    enabled: true,
    icon: MapPin,
    usage: "67%",
  },
  {
    name: "QR Code Scanning",
    description: "Scan animal tags and equipment codes",
    enabled: true,
    icon: QrCode,
    usage: "92%",
  },
  {
    name: "Biometric Auth",
    description: "Fingerprint and face recognition",
    enabled: true,
    icon: Fingerprint,
    usage: "45%",
  },
]

export default function MobilePage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [syncInProgress, setSyncInProgress] = useState(false)
  const { t } = useLanguage()

  const handleSync = () => {
    setSyncInProgress(true)
    setTimeout(() => setSyncInProgress(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("mobileApp")}</h1>
          <p className="text-gray-600">{t("mobileOptimization")}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSync} disabled={syncInProgress}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncInProgress ? "animate-spin" : ""}`} />
            {syncInProgress ? "Syncing..." : "Sync Now"}
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download App
          </Button>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{appStats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Now</p>
                <p className="text-2xl font-bold text-green-600">{appStats.activeUsers}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Size</p>
                <p className="text-2xl font-bold">{appStats.dataSize}</p>
              </div>
              <HardDrive className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offline Data</p>
                <p className="text-2xl font-bold">{appStats.offlineData}</p>
              </div>
              <CloudSync className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Connected Devices</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="offline">Offline Mode</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* App Performance */}
            <Card>
              <CardHeader>
                <CardTitle>App Performance</CardTitle>
                <CardDescription>Mobile application usage and performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Active Users</span>
                    <span>18/24 (75%)</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Data Sync Success</span>
                    <span>98.5%</span>
                  </div>
                  <Progress value={98.5} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Offline Capability</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>User Satisfaction</span>
                    <span>4.7/5.0</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common mobile app management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col bg-transparent">
                    <CloudSync className="h-6 w-6 mb-2" />
                    Force Sync
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-transparent">
                    <Bell className="h-6 w-6 mb-2" />
                    Push Alert
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-transparent">
                    <Shield className="h-6 w-6 mb-2" />
                    Security Check
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-transparent">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    Usage Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Mobile Activity</CardTitle>
              <CardDescription>Latest activities from mobile app users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    user: "John Smith",
                    action: "Added health record for G001",
                    time: "5 minutes ago",
                    device: "iPhone",
                    status: "synced",
                  },
                  {
                    user: "Dr. Sarah Johnson",
                    action: "Completed vaccination for 12 animals",
                    time: "1 hour ago",
                    device: "Android",
                    status: "synced",
                  },
                  {
                    user: "Mike Wilson",
                    action: "Recorded breeding activity",
                    time: "2 hours ago",
                    device: "Tablet",
                    status: "pending",
                  },
                  {
                    user: "John Smith",
                    action: "Captured incident photos",
                    time: "3 hours ago",
                    device: "iPhone",
                    status: "synced",
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-500">
                          {activity.user} • {activity.device} • {activity.time}
                        </p>
                      </div>
                    </div>
                    <Badge variant={activity.status === "synced" ? "default" : "secondary"}>{activity.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Devices</CardTitle>
              <CardDescription>Mobile devices connected to the farm management system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectedDevices.map((device) => (
                  <div key={device.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Smartphone className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{device.name}</h4>
                          <p className="text-sm text-gray-500">{device.user}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {device.platform} • v{device.version}
                            </span>
                            <span className="text-xs text-gray-500">Last active: {device.lastActive}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={device.status === "online" ? "default" : "secondary"}>
                          {device.status === "online" ? (
                            <Wifi className="h-3 w-3 mr-1" />
                          ) : (
                            <WifiOff className="h-3 w-3 mr-1" />
                          )}
                          {device.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Features</CardTitle>
              <CardDescription>Configure and monitor mobile app features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {mobileFeatures.map((feature, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <feature.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{feature.name}</h4>
                          <p className="text-sm text-gray-500">{feature.description}</p>
                        </div>
                      </div>
                      <Switch checked={feature.enabled} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span>{feature.usage}</span>
                      </div>
                      <Progress value={Number.parseInt(feature.usage)} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Offline Configuration</CardTitle>
                <CardDescription>Configure offline data storage and sync settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Offline Mode</Label>
                    <p className="text-sm text-gray-500">Allow data entry without internet</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Sync</Label>
                    <p className="text-sm text-gray-500">Automatically sync when online</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Conflict Resolution</Label>
                    <p className="text-sm text-gray-500">Handle data conflicts automatically</p>
                  </div>
                  <Switch />
                </div>

                <div>
                  <Label>Offline Storage Limit</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used: 156 MB</span>
                      <span>Limit: 500 MB</span>
                    </div>
                    <Progress value={31.2} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Status</CardTitle>
                <CardDescription>Monitor data synchronization status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { module: "Animals", pending: 0, synced: 247, status: "up-to-date" },
                    { module: "Health Records", pending: 2, synced: 156, status: "pending" },
                    { module: "Vaccinations", pending: 0, synced: 89, status: "up-to-date" },
                    { module: "Breeding", pending: 1, synced: 34, status: "pending" },
                    { module: "Maintenance", pending: 0, synced: 23, status: "up-to-date" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.module}</h4>
                        <p className="text-sm text-gray-500">
                          {item.synced} synced, {item.pending} pending
                        </p>
                      </div>
                      <Badge variant={item.status === "up-to-date" ? "default" : "secondary"}>
                        {item.status === "up-to-date" ? (
                          <CloudSync className="h-3 w-3 mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>App Configuration</CardTitle>
                <CardDescription>Configure mobile app settings and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="app-name">App Name</Label>
                  <Input id="app-name" defaultValue="Farm Home Mobile" />
                </div>

                <div>
                  <Label htmlFor="app-version">Current Version</Label>
                  <Input id="app-version" defaultValue="2.1.0" readOnly />
                </div>

                <div>
                  <Label htmlFor="min-version">Minimum Required Version</Label>
                  <Input id="min-version" defaultValue="2.0.0" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Force Update</Label>
                    <p className="text-sm text-gray-500">Require users to update to latest version</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Beta Features</Label>
                    <p className="text-sm text-gray-500">Enable experimental features</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure mobile app security and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Biometric Authentication</Label>
                    <p className="text-sm text-gray-500">Require fingerprint or face ID</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div>
                  <Label htmlFor="timeout-duration">Timeout Duration (minutes)</Label>
                  <Input id="timeout-duration" type="number" defaultValue="30" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Device Registration</Label>
                    <p className="text-sm text-gray-500">Require device registration</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Remote Wipe</Label>
                    <p className="text-sm text-gray-500">Enable remote data wipe capability</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
