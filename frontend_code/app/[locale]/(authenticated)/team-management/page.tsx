"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Users, Mail, Plus, UserCheck, Clock, AlertCircle, Edit, Trash2, Search } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/app/[locale]/providers"

interface TeamMember {
    _id: string
    name: string
    email: string
    phone?: string
    role: string
    status: string
    blocked?: boolean
    created_at: string
    emailVerified: boolean
    warehouse_id?: {
        _id: string
        name: string
        warehouse_id: string
    }
}



export default function TeamManagementPage() {
    const { user } = useAuth()
    const currentUserRole = user?.role || ''
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    const [inviteForm, setInviteForm] = useState({
        email: '',
        name: '',
        role: 'technician'
    })
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        role: ''
    })
    const [isInviting, setIsInviting] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
    
    // Update edit form when editingMember changes
    useEffect(() => {
        if (editingMember) {
            setEditForm({
                name: editingMember.name,
                phone: editingMember.phone || '',
                role: editingMember.role
            })
        }
    }, [editingMember])
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    
    const handleUpdate = async () => {
        if (!editingMember || !editForm.name) {
            toast.error('Please fill in all required fields')
            return
        }
        
        setIsUpdating(true)
        try {
            const res = await api.put(`/api/user-management/users/${editingMember._id}`, {
                name: editForm.name,
                phone: editForm.phone,
                role: editForm.role
            })
            
            if (res.ok) {
                toast.success('Team member updated successfully')
                setIsEditDialogOpen(false)
                setEditingMember(null)
                setEditForm({ name: '', phone: '', role: '' })
                fetchTeamMembers()
            } else {
                toast.error(res.error || 'Failed to update team member')
            }
        } catch (err) {
            toast.error((err as Error).message || 'Failed to update team member')
        } finally {
            setIsUpdating(false)
        }
    }

    // Check if current user can invite
    const canInvite = currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'manager'
    
    // Filter members based on search and filters
    const filteredMembers = useMemo(() => {
        return teamMembers.filter(member => {
            const matchesSearch = 
                member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (member.phone && member.phone.toLowerCase().includes(searchQuery.toLowerCase()))
            
            const matchesRole = roleFilter === 'all' || member.role === roleFilter
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && member.emailVerified && member.role !== 'pending' && !member.blocked) ||
                (statusFilter === 'pending' && member.role === 'pending') ||
                (statusFilter === 'blocked' && member.blocked) ||
                (statusFilter === 'unverified' && !member.emailVerified && member.role !== 'pending')
            
            return matchesSearch && matchesRole && matchesStatus
        })
    }, [teamMembers, searchQuery, roleFilter, statusFilter])
    
    // Check if current user can edit a specific member
    const canEdit = (member: TeamMember) => {
        if (currentUserRole === 'super_admin') return true
        if (currentUserRole === 'admin') {
            // Admin can edit managers and technicians under them, and pending invites
            return member.role === 'manager' || member.role === 'technician' || member.role === 'pending'
        }
        if (currentUserRole === 'manager') {
            // Manager can only edit technicians in their warehouse
            return member.role === 'technician'
        }
        return false // Technician can't edit anyone
    }

    // Check if current user can delete a specific member
    const canDelete = (member: TeamMember) => {
        if (currentUserRole === 'super_admin') return true
        if (currentUserRole === 'admin') {
            // Admin can delete managers and technicians under them, and pending invites
            return member.role === 'manager' || member.role === 'technician' || member.role === 'pending'
        }
        if (currentUserRole === 'manager') {
            // Manager can only delete technicians in their warehouse
            return member.role === 'technician'
        }
        return false // Technician can't delete anyone
    }

    // Get available roles for invitation based on current user role
    const getAvailableRoles = () => {
        if (currentUserRole === 'super_admin') {
            return ['admin', 'manager', 'technician']
        }
        if (currentUserRole === 'admin') {
            return ['manager', 'technician']
        }
        if (currentUserRole === 'manager') {
            return ['technician'] // Manager can only invite technicians
        }
        return []
    }

    const fetchTeamMembers = async () => {
        try {
            setIsLoading(true)
            const res = await api.get<{ users: TeamMember[] }>('/api/user-management/users?limit=100')
            if (res.ok && res.data) {
                // Filter out admin users from the list (they have their own profile)
                const filteredUsers = (res.data.users || []).filter(user => user.role !== 'admin')
                setTeamMembers(filteredUsers)
            } else {
                toast.error('Failed to fetch team members')
            }
        } catch (err) {
            console.error('Error fetching team members:', err)
            toast.error('Failed to fetch team members')
        } finally {
            setIsLoading(false)
        }
    }



    useEffect(() => {
        fetchTeamMembers()
    }, [])

    const handleInvite = async () => {
        if (!inviteForm.email || !inviteForm.role) {
            toast.error('Please fill in all required fields')
            return
        }

        // Manager can only invite technicians
        if (currentUserRole === 'manager' && inviteForm.role !== 'technician') {
            toast.error('Managers can only invite technicians')
            return
        }

        setIsInviting(true)
        try {
            const res = await api.post('/auth/invite-team-member', {
                email: inviteForm.email.trim().toLowerCase(),
                name: inviteForm.name.trim() || undefined,
                role: inviteForm.role
            })

            if (res.ok) {
                toast.success('Invitation sent successfully!')
                setInviteForm({ email: '', name: '', role: 'technician' })
                setIsInviteDialogOpen(false)
                fetchTeamMembers()
            } else {
                let errorMessage = res.error || 'Failed to send invitation';
                
                // Add helpful hint for Resend configuration issues
                if (errorMessage.toLowerCase().includes('resend') || errorMessage.toLowerCase().includes('forbidden') || errorMessage.toLowerCase().includes('403')) {
                    errorMessage += ". (Hint: If using Resend with onboarding@resend.dev, you can only invite your own email. For others, verify your domain in Resend dashboard.)";
                }
                
                toast.error(errorMessage, { duration: 6000 });
            }
        } catch (err) {
            toast.error((err as Error).message || 'Failed to send invitation')
        } finally {
            setIsInviting(false)
        }
    }

    const handleDelete = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this team member?')) {
            return
        }

        setIsDeleting(memberId)
        try {
            const res = await api.delete(`/api/user-management/users/${memberId}`)
            if (res.ok) {
                toast.success('Team member removed successfully')
                fetchTeamMembers() // Refresh the list
            } else {
                toast.error(res.error || 'Failed to remove team member')
            }
        } catch {
            toast.error('Failed to remove team member')
        } finally {
            setIsDeleting(null)
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'admin':
                return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'manager':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'technician':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getStatusBadge = (status: string, emailVerified: boolean) => {
        if (status === 'blocked') {
            return { text: 'Blocked', class: 'bg-red-100 text-red-800 border-red-200' }
        }
        if (status === 'pending') {
            return { text: 'Pending Invitation', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
        }
        if (!emailVerified) {
            return { text: 'Email Not Verified', class: 'bg-orange-100 text-orange-800 border-orange-200' }
        }
        return { text: 'Active', class: 'bg-green-100 text-green-800 border-green-200' }
    }

    const getStatusText = (status: string, emailVerified: boolean) => {
        if (status === 'blocked') {
            return 'Blocked';
        }
        if (status === 'pending') {
            return 'Pending Invitation';
        }
        if (!emailVerified) {
            return 'Email Not Verified';
        }
        return 'Active';
    }

    const stats = useMemo(() => {
        const total = teamMembers.length
        const active = teamMembers.filter(m => m.emailVerified && m.role !== 'pending' && !m.blocked).length
        const pending = teamMembers.filter(m => m.role === 'pending').length
        const unverified = teamMembers.filter(m => !m.emailVerified && m.role !== 'pending').length
        return { total, active, pending, unverified }
    }, [teamMembers])

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-gray-600 mt-2">
                        {currentUserRole === 'super_admin' && 'Manage all users globally'}
                        {currentUserRole === 'admin' && 'Manage your team members (managers and technicians)'}
                        {currentUserRole === 'manager' && 'Manage technicians in your warehouse'}
                        {currentUserRole === 'technician' && 'View team members (read-only)'}
                    </p>
                </div>

                {canInvite && (
                    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-black hover:bg-gray-800 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Invite Team Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Invite Team Member</DialogTitle>
                                <DialogDescription>
                                    Send an invitation to join your GrainHero team
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invite-email">Email Address *</Label>
                                    <Input
                                        id="invite-email"
                                        type="email"
                                        placeholder="Enter colleague's email address"
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="invite-name">Name (Optional)</Label>
                                    <Input
                                        id="invite-name"
                                        type="text"
                                        placeholder="Enter colleague's name"
                                        value={inviteForm.name}
                                        onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="invite-role">Role *</Label>
                                    <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAvailableRoles().map(role => (
                                                <SelectItem key={role} value={role}>
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsInviteDialogOpen(false)}
                                        disabled={isInviting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleInvite}
                                        disabled={isInviting || !inviteForm.email || !inviteForm.role}
                                        className="bg-black hover:bg-gray-800 text-white"
                                    >
                                        {isInviting ? (
                                            <>
                                                <Mail className="h-4 w-4 mr-2 animate-pulse" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="h-4 w-4 mr-2" />
                                                Send Invitation
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Members</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <UserCheck className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Active Members</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <Clock className="h-8 w-8 text-yellow-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending Invitations</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <AlertCircle className="h-8 w-8 text-orange-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Unverified</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.unverified}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Search & Filter</CardTitle>
                    <CardDescription>Find team members by name, email, or filter by role and status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Enter name, email, or phone to search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="technician">Technician</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="blocked">Blocked</SelectItem>
                                <SelectItem value="unverified">Unverified</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Team Members Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        {currentUserRole === 'technician' 
                            ? 'View your team members (read-only)'
                            : 'Manage your team members and their roles'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Loading team members...</p>
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No team members found</p>
                            {canInvite && (
                                <p className="text-sm text-gray-500">Invite your first team member to get started</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredMembers.map((member) => (
                                <div key={member._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-gray-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{member.name}</h3>
                                            <p className="text-sm text-gray-600">{member.email}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge className={getRoleBadge(member.role)}>
                                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </Badge>
                                                <Badge className={getStatusBadge(member.status, member.emailVerified).class}>
                                                    {getStatusText(member.status, member.emailVerified)}
                                                </Badge>
                                                {member.warehouse_id && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {member.warehouse_id.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="text-sm text-gray-500 mr-4">
                                            Joined {new Date(member.created_at).toLocaleDateString()}
                                        </div>
                                        {canEdit(member) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingMember(member)
                                                    setIsEditDialogOpen(true)
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete(member) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDelete(member._id)}
                                                disabled={isDeleting === member._id}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {isDeleting === member._id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Team Member</DialogTitle>
                        <DialogDescription>Update team member information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={editForm.phone}
                                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="technician">Technician</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={isUpdating}>
                            {isUpdating ? 'Updating...' : 'Update'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </div>
    )
}
