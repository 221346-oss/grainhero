"use client"

import { useAuth } from "@/app/[locale]/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Shield, 
  AlertTriangle, 
  Home, 
  ArrowLeft,
  User,
  Crown,
  Users,
  Wrench
} from "lucide-react"
import { useRouter } from "next/navigation"
import { getRoleDisplayName } from "@/lib/auth-utils"

export default function NotAllowedPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const { user } = useAuth()
  const router = useRouter()

  const getAccessInfo = () => {
    if (!user) {
      return {
        title: "Authentication Required",
        description: "You need to be logged in to access this page.",
        icon: Shield,
        action: "Sign In",
        actionRoute: "/auth/login"
      }
    }

    const role = user.role
    const roleDisplayName = getRoleDisplayName(role)

    return {
      title: "Access Denied",
      description: `Your current role (${roleDisplayName}) does not have permission to access this page. Please contact your administrator if you believe this is an error.`,
      icon: AlertTriangle,
      action: "Go to Dashboard",
      actionRoute: "/dashboard"
    }
  }

  const getRoleFeatures = (role: string) => {
    switch (role) {
      case "super_admin":
        return [
          { name: "System Management", description: "Manage the entire platform", icon: Crown },
          { name: "Customer Management", description: "Create and manage all customers", icon: Users },
          { name: "Global Analytics", description: "View system-wide analytics", icon: Users },
          { name: "Security Center", description: "Monitor system security", icon: Shield }
        ]
      case "admin":
        return [
          { name: "User Management", description: "Manage team members", icon: Users },
          { name: "Grain Management", description: "Oversee grain operations", icon: Users },
          { name: "Reports", description: "Generate business reports", icon: Users },
          { name: "Settings", description: "Configure customer settings", icon: Wrench }
        ]
      case "manager":
        return [
          { name: "Batch Management", description: "Manage grain batches", icon: Users },
          { name: "Quality Control", description: "Monitor grain quality", icon: Users },
          { name: "Team Coordination", description: "Coordinate with technicians", icon: Users },
          { name: "Operational Reports", description: "View operational reports", icon: Users }
        ]
      case "technician":
        return [
          { name: "Quality Checks", description: "Perform grain quality checks", icon: Users },
          { name: "Sensor Monitoring", description: "Monitor IoT sensors", icon: Users },
          { name: "Maintenance Tasks", description: "Perform equipment maintenance", icon: Users },
          { name: "Data Collection", description: "Collect operational data", icon: Users }
        ]
      default:
        return []
    }
  }

  const accessInfo = getAccessInfo()
  const IconComponent = accessInfo.icon
  const roleFeatures = user ? getRoleFeatures(user.role) : []

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full space-y-6">
          {/* Main Access Denied Card */}
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <IconComponent className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-900">{accessInfo.title}</CardTitle>
              <CardDescription className="text-base">
                {accessInfo.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && (
                <div className="flex justify-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100">
                    <User className="h-4 w-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Current Role: {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  If you believe you should have access to this page, please contact your system administrator.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push(accessInfo.actionRoute)} className="w-full sm:w-auto">
                  <Home className="mr-2 h-4 w-4" />
                  {accessInfo.action}
                </Button>
                <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Role Information Card */}
          {user && roleFeatures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Your Current Access Level
                </CardTitle>
                <CardDescription>
                  Based on your role, you have access to the following features:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {roleFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <feature.icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{feature.name}</h4>
                        <p className="text-xs text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Need More Access?</h4>
                  <p className="text-sm text-blue-800">
                    If you need access to additional features, please contact your administrator to review your permissions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                If you are having trouble accessing the system, here are some things you can try:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-sm">
                    <strong>Check your login:</strong> Make sure you are logged in with the correct account.
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-sm">
                    <strong>Contact your administrator:</strong> They can help you get the right permissions.
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-sm">
                    <strong>Check your role:</strong> Your current role is {user ? getRoleDisplayName(user.role) : 'Unknown'}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
