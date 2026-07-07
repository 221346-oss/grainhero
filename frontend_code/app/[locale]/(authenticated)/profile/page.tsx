"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/[locale]/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Bell, 
  Globe, 
  Camera,
  Save,
  AlertCircle,
  CheckCircle,
  Key,
  Eye,
  EyeOff
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  role: "super_admin" | "admin" | "manager" | "technician"
  location?: string
  language: string
  preferences: {
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
    }
    timezone: string
    language: string
  }
  hasAccess: string
  created_at: string
  lastLogin?: string
}

export default function ProfilePage({ params: _params }: { params: Promise<{ locale: string }> }) {
  // Collapsible state for Notification Preferences
  const [showNotifications, setShowNotifications] = useState(false)
  // Collapsible state for Basic Information
  const [showBasicInfo, setShowBasicInfo] = useState(false)
  const { user: currentUser, refreshUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  // Local avatar state for instant UI update
  const [avatar, setAvatar] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    location: "",
    language: "en"
  })
  
  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  
  // Notification preferences (email only)
  const [notifications, setNotifications] = useState({
    email: true
  })

  // Fetch user profile
  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get("/auth/me")
      
      if (response.ok && response.data) {
        // Type the response data as UserProfile
        const typedResponseData = response.data as UserProfile;
        // Only update fields if they exist, otherwise keep previous
        setProfile(prev => {
          if (!prev) return typedResponseData;
          return {
            ...prev,
            name: typedResponseData.name || prev.name,
            phone: typedResponseData.phone !== undefined ? typedResponseData.phone : prev.phone,
            location: typedResponseData.location !== undefined ? typedResponseData.location : prev.location,
            language: typedResponseData.language || prev.language
          };
        });
        setProfileData(prev => ({
          name: typedResponseData.name || prev.name || "",
          phone: typedResponseData.phone !== undefined ? typedResponseData.phone : prev.phone || "",
          location: typedResponseData.location !== undefined ? typedResponseData.location : prev.location || "",
          language: typedResponseData.language || prev.language || "en"
        }))
        setNotifications(typedResponseData.preferences?.notifications || { email: true })
        setError(null)
      } else {
        setError(response.error || "Failed to fetch profile")
      }
    } catch (err) {
      setError("Failed to fetch profile")
      console.error("Error fetching profile:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchProfile()
    }
  }, [currentUser])

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      // Only send editable fields (name, phone, location, language)
      const response = await api.patch("/auth/profile", {
        name: profileData.name,
        phone: profileData.phone,
        location: profileData.location,
        language: profileData.language
      })
      if (response.ok && response.data) {
        toast.success("Profile updated successfully")
        // Update local profile state for instant UI feedback
        setProfile(prev => prev ? {
          ...prev,
          name: profileData.name,
          phone: profileData.phone,
          location: profileData.location,
          language: profileData.language,
          avatar: avatar !== undefined ? avatar : prev.avatar
        } : prev)
        await refreshUser()
        fetchProfile()
      } else {
        toast.error(response.error || "Failed to update profile")
      }
    } catch (err) {
      toast.error("Failed to update profile")
      console.error("Error updating profile:", err)
    } finally {
      setSaving(false)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long")
      return
    }

    try {
      setSaving(true)
      const response = await api.patch("/auth/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      if (response.ok) {
        toast.success("Password changed successfully")
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        })
        setShowPasswordForm(false)
      } else {
        toast.error(response.error || "Failed to change password")
      }
    } catch (err) {
      toast.error("Failed to change password")
      console.error("Error changing password:", err)
    } finally {
      setSaving(false)
    }
  }

  // Upload avatar
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("File size must be less than 5MB")
      return
    }

    try {
      setSaving(true)
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/upload-profilePic`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Avatar updated successfully")
        setAvatar(data.avatar) // Update local avatar for instant UI
        setProfile(prev => prev ? { ...prev, avatar: data.avatar } : prev)
        await refreshUser()
        fetchProfile()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to upload avatar")
      }
    } catch (err) {
      toast.error("Failed to upload avatar")
      console.error("Error uploading avatar:", err)
    } finally {
      setSaving(false)
    }
  }

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800"
      case "admin":
        return "bg-blue-100 text-blue-800"
      case "manager":
        return "bg-green-100 text-green-800"
      case "technician":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Get access badge color
  const getAccessBadgeColor = (access: string) => {
    switch (access) {
      case "pro":
        return "bg-purple-100 text-purple-800"
      case "intermediate":
        return "bg-blue-100 text-blue-800"
      case "basic":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatar !== undefined ? avatar : profile.avatar} alt={profileData.name} />
                    <AvatarFallback className="text-lg">
                      {(profileData.name || profile.name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer hover:bg-blue-600">
                    <Camera className="h-3 w-3" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{profileData.name || profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <div className="flex justify-center space-x-2 mt-2">
                    <Badge className={getRoleBadgeColor(profile.role)}>
                      {profile.role.replace('_', ' ')}
                    </Badge>
                    <Badge className={getAccessBadgeColor(profile.hasAccess)}>
                      {profile.hasAccess}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{profileData.phone ? profileData.phone : 'Not set'}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{profileData.location ? profileData.location : 'Not set'}</span>
                </div>
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{profileData.language ? profileData.language.toUpperCase() : 'Not set'}</span>
                </div>
              </div>
              
              {profile.lastLogin && (
                <>
                  <Separator />
                  <div className="text-sm text-muted-foreground">
                    <p>Last login: {new Date(profile.lastLogin).toLocaleDateString()}</p>
                    <p>Member since: {new Date(profile.created_at).toLocaleDateString()}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Settings */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information (Collapsible) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Basic Information
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowBasicInfo(v => !v)}>
                  {showBasicInfo ? 'Collapse' : 'Expand'}
                </Button>
              </div>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            {showBasicInfo && (
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      placeholder="Enter your location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={profileData.language} onValueChange={(value) => setProfileData({ ...profileData, language: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ur">Urdu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="button" onClick={handleSaveProfile} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Change Password</h4>
                  <p className="text-sm text-muted-foreground">
                    Update your password to keep your account secure
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>

              {showPasswordForm && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleChangePassword} disabled={saving}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {saving ? "Updating..." : "Update Password"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences (Email Only, Collapsible) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Preferences
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowNotifications(v => !v)}>
                  {showNotifications ? 'Collapse' : 'Expand'}
                </Button>
              </div>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            {showNotifications && (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>
                <Button type="button" onClick={handleSaveProfile} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}