"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react"
import { config } from "@/config"
import { useTranslations } from "next-intl"
import { validatePassword, validateConfirmPassword, createFieldValidation, type FieldValidation, type PasswordStrength } from "@/lib/validation"
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator"

export default function ResetPasswordPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('AuthPage');
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false })

  // Validation state
  const [passwordValidation, setPasswordValidation] = useState<FieldValidation>(createFieldValidation())
  const [confirmPasswordValidation, setConfirmPasswordValidation] = useState<FieldValidation>(createFieldValidation())

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const handlePasswordChange = (value: string) => {
    setNewPassword(value)
    const validation = validatePassword(value)
    setPasswordValidation({
      value,
      touched: true,
      isValid: validation.isValid,
      message: validation.message
    })
    setPasswordStrength(validation.strength)

    // Re-validate confirm password if it exists
    if (confirmPassword) {
      const confirmValidation = validateConfirmPassword(value, confirmPassword)
      setConfirmPasswordValidation({
        value: confirmPassword,
        touched: true,
        isValid: confirmValidation.isValid,
        message: confirmValidation.message
      })
    }
  }

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    const validation = validateConfirmPassword(newPassword, value)
    setConfirmPasswordValidation({
      value,
      touched: true,
      isValid: validation.isValid,
      message: validation.message
    })
  }

  const isFormValid = passwordValidation.isValid && confirmPasswordValidation.isValid && token
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form before submission
    if (!isFormValid) {
      setMessage("Please fix the errors below before submitting.")
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`${config.backendUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || "Request failed. Please try again.")
      } else {
        setMessage(data?.message || "Password reset successful! You can now log in.")
        setTimeout(() => router.push("/auth/login"), 2000)
      }
    } catch {
      setMessage("Network error. Please try again.")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sheep className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('resetPassword') || "Reset Password"}</CardTitle>
          <CardDescription>{t('resetPasswordDescription') || "Enter your new password below."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('newPassword') || "New Password"}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`pr-10 ${passwordValidation.touched && !passwordValidation.isValid ? 'border-red-500 focus:border-red-500' : passwordValidation.touched && passwordValidation.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordValidation.touched && !passwordValidation.isValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {passwordValidation.message}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword') || "Confirm Password"}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className={`pr-10 ${confirmPasswordValidation.touched && !confirmPasswordValidation.isValid ? 'border-red-500 focus:border-red-500' : confirmPasswordValidation.touched && confirmPasswordValidation.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPasswordValidation.touched && !confirmPasswordValidation.isValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {confirmPasswordValidation.message}
                </p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Password Strength</Label>
                <PasswordStrengthIndicator strength={passwordStrength} />
              </div>
            )}

            {/* Error/Success Message */}
            {message && (
              <div className={`text-sm p-3 rounded-md flex items-center gap-2 ${message.includes('successful')
                  ? 'text-green-700 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
                }`}>
                {message.includes('successful') ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {message}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
              {isLoading ? t('resetting') || "Resetting..." : t('resetPassword') || "Reset Password"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
              {t('backToLogin') || "Back to Login"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 