"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep, AlertCircle, CheckCircle } from "lucide-react"
import { config } from "@/config"
import { Link } from "@/i18n/navigation"

export default function Verify2FAPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()

  // Form state
  const [code, setCode] = useState("")
  const [tempToken, setTempToken] = useState("")

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)

  useEffect(() => {
    // Get temp token from localStorage or URL
    const storedToken = localStorage.getItem("tempToken")
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get("tempToken")
    
    const token = urlToken || storedToken
    
    if (!token) {
      setMessage("No verification token found. Please login again.")
      setMessageType("error")
      setTimeout(() => router.push("/auth/login"), 3000)
      return
    }
    
    setTempToken(token)
    localStorage.setItem("tempToken", token)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    setMessageType(null)

    // Validate code
    if (!code || code.length !== 6) {
      setMessage("Please enter a valid 6-digit code")
      setMessageType("error")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`${config.backendUrl}/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken,
          code: code.trim()
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data?.error || "Invalid verification code. Please try again.")
        setMessageType("error")
      } else {
        // Successful verification - store the final token
        localStorage.setItem("token", data.token)
        localStorage.setItem("id", JSON.stringify(data.id))
        localStorage.setItem("email", data.email)
        localStorage.setItem("name", data.name)
        localStorage.setItem("phone", data.phone)
        localStorage.setItem("role", data.role)
        localStorage.setItem("avatar", data.avatar)
        
        // Clean up temp token
        localStorage.removeItem("tempToken")
        
        setMessage("Verification successful! Redirecting...")
        setMessageType("success")
        setTimeout(() => router.push("/dashboard"), 1500)
      }
    } catch (err) {
      setMessage("Network error. Please check your connection and try again.")
      setMessageType("error")
      console.log(err)
    }
    setIsLoading(false)
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setMessage(null)
    setMessageType(null)

    try {
      // Resend code by calling login again with stored credentials
      const email = localStorage.getItem("email")
      // const password = localStorage.getItem("password") // This won't be available for security reasons
      
      if (!email) {
        setMessage("Session expired. Please login again.")
        setMessageType("error")
        setTimeout(() => router.push("/auth/login"), 2000)
        return
      }

      // For security, we'll redirect back to login
      setMessage("Please login again to receive a new verification code.")
      setMessageType(null)
      setTimeout(() => router.push("/auth/login"), 2000)
      
    } catch (err) {
      setMessage("Failed to resend code. Please try again.")
      setMessageType("error")
      console.log(err)
    }
    setIsLoading(false)
  }

  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    setCode(numericValue)
  }

  // Check if form is valid
  const isFormValid = code.length === 6

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sheep className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit verification code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Verification Code Field */}
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <div className="relative">
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className={`text-center text-lg font-mono tracking-widest ${
                    messageType === "error" ? 'border-red-500 focus:border-red-500' : 
                    messageType === "success" ? 'border-green-500 focus:border-green-500' : ''
                  }`}
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-sm text-gray-500">
                Check your email for the verification code
              </p>
            </div>

            {/* Message */}
            {message && (
              <div className={`text-sm rounded-md p-3 flex items-center gap-2 ${
                messageType === "success"
                  ? 'text-green-600 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
              }`}>
                {messageType === "success" ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {message}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            {/* Resend Code */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                disabled={isLoading}
              >
                Didn&apos;t receive the code? Try again
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-800">
              ← Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}