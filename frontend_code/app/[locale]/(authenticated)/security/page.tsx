"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  //AlertTriangle, 
  //CheckCircle, 
  Clock,
  Smartphone,
  Monitor,
  MapPin,
  Calendar,
  Trash2,
  RefreshCw
} from 'lucide-react'
//import { api } from '@/lib/api'

interface SecurityLog {
  _id: string
  event_type: string
  description: string
  ip_address: string
  user_agent: string
  location: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface ActiveSession {
  _id: string
  device: string
  browser: string
  location: string
  ip_address: string
  last_activity: string
  current: boolean
}

export default function SecurityPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadSecurityData()
  }, [])

  const loadSecurityData = async () => {
    try {
      // Mock data for now - replace with actual API calls
      setTimeout(() => {
        setSecurityLogs([
          {
            _id: '1',
            event_type: 'Login',
            description: 'Successful login from Lahore, Pakistan',
            ip_address: '192.168.1.100',
            user_agent: 'Chrome 120.0.0.0',
            location: 'Lahore, Pakistan',
            timestamp: '2024-01-25T10:30:00Z',
            severity: 'low'
          },
          {
            _id: '2',
            event_type: 'Failed Login',
            description: 'Failed login attempt from unknown location',
            ip_address: '203.124.45.67',
            user_agent: 'Firefox 121.0.0.0',
            location: 'Unknown',
            timestamp: '2024-01-25T09:15:00Z',
            severity: 'medium'
          },
          {
            _id: '3',
            event_type: 'Password Change',
            description: 'Password changed successfully',
            ip_address: '192.168.1.100',
            user_agent: 'Chrome 120.0.0.0',
            location: 'Lahore, Pakistan',
            timestamp: '2024-01-24T15:45:00Z',
            severity: 'low'
          }
        ])

        setActiveSessions([
          {
            _id: '1',
            device: 'Desktop',
            browser: 'Chrome 120.0.0.0',
            location: 'Lahore, Pakistan',
            ip_address: '192.168.1.100',
            last_activity: '2024-01-25T10:30:00Z',
            current: true
          },
          {
            _id: '2',
            device: 'Mobile',
            browser: 'Safari 17.2.0',
            location: 'Karachi, Pakistan',
            ip_address: '192.168.1.101',
            last_activity: '2024-01-25T08:15:00Z',
            current: false
          }
        ])

        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to load security data:', error)
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }

    setChangingPassword(true)
    try {
      // Mock password change - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      alert('Password changed successfully')
    } catch (error) {
      console.error('Failed to change password:', error)
      alert('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) return
    
    try {
      // Mock session termination - replace with actual API call
      setActiveSessions(prev => prev.filter(session => session._id !== sessionId))
    } catch (error) {
      console.error('Failed to terminate session:', error)
    }
  }

  const getSeverityBadge = (severity: string) => {
    const severityColors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return severityColors[severity as keyof typeof severityColors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading security settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
          <p className="text-muted-foreground">
            Manage your account security and monitor access
          </p>
        </div>
      </div>

      <Tabs defaultValue="password" className="space-y-4">
        <TabsList>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
          <TabsTrigger value="two-factor">Two-Factor Auth</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>
              
              <Button 
                onClick={handlePasswordChange} 
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="gap-2"
              >
                {changingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage your active login sessions across different devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {session.device === 'Mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                          <span>{session.device}</span>
                        </div>
                      </TableCell>
                      <TableCell>{session.browser}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{session.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>{session.ip_address}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{new Date(session.last_activity).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.current ? "default" : "secondary"}>
                          {session.current ? "Current" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!session.current && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTerminateSession(session._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Activity Log
              </CardTitle>
              <CardDescription>
                Recent security events and access attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-medium">{log.event_type}</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{log.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>{log.ip_address}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityBadge(log.severity)}>
                          {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="two-factor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require a verification code in addition to your password
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="border-t pt-6">
                <h4 className="text-lg font-medium mb-4">Setup Instructions</h4>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Download an authenticator app like Google Authenticator or Authy</p>
                  <p>2. Scan the QR code with your authenticator app</p>
                  <p>3. Enter the 6-digit code from your app to verify setup</p>
                  <p>4. Save your backup codes in a secure location</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline">Generate QR Code</Button>
                <Button variant="outline">Download Backup Codes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
