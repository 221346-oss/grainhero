"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/app/[locale]/providers"
import { WheatIcon as Sheep, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { config } from "@/config"
import { useTranslations } from 'next-intl';
import {
  validateLoginForm,
  validateEmail,
  createFieldValidation
} from "@/lib/validation";
import { Link, useRouter } from "@/i18n/navigation"

export default function LoginPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('AuthPage');

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Validation state
  const [fieldValidations, setFieldValidations] = useState({
    email: createFieldValidation(),
    password: createFieldValidation(),
  })

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirectingFromPayment, setIsRedirectingFromPayment] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    const normalizedEmail = email.trim().toLowerCase()

    // Validate form
    const validation = validateLoginForm(normalizedEmail, password)

    if (!validation.isValid) {
      // Mark all fields as touched and update validation state
      const updatedValidations = { ...fieldValidations }
      Object.keys(validation.errors).forEach(fieldName => {
        if (fieldName in updatedValidations) {
          updatedValidations[fieldName as keyof typeof updatedValidations] = {
            ...updatedValidations[fieldName as keyof typeof updatedValidations],
            touched: true,
            isValid: false,
            message: validation.errors[fieldName]
          }
        }
      })
      setFieldValidations(updatedValidations)
      setMessage("Please fix the errors below before submitting.")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`${config.backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password
        }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        setMessage(error?.message || "Login failed. Please check your credentials and try again.")
      } else {
        const data = await res.json()
        
        // Check if 2FA is required
        if (data.requires2FA) {
          // Store temporary token and user info for 2FA verification
          localStorage.setItem("tempToken", data.tempToken)
          localStorage.setItem("userId", data.userId)
          localStorage.setItem("email", normalizedEmail)
          
          setMessage("Two-factor authentication required. Please check your email for the verification code.")
          setTimeout(() => {
            router.push("/auth/verify-2fa")
          }, 1500)
        } else {
          // Normal login flow
          localStorage.setItem("token", data.token)
          localStorage.setItem("id", JSON.stringify(data.id))
          localStorage.setItem("email", data.email)
          localStorage.setItem("name", data.name)
          localStorage.setItem("phone", data.phone)
          localStorage.setItem("role", data.role)
          localStorage.setItem("avatar", data.avatar)
          console.log(data)
          await login(normalizedEmail, password, data)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pendingSignupEmail')
          }
          setMessage("Login successful! Redirecting...")
          setTimeout(() => router.push("/dashboard"), 1000)
        }
      }
    } catch (err) {
      setMessage("Network error. Please check your connection and try again.")
      console.log(err)
    }
    setIsLoading(false)
  }

  // Handle field changes with real-time validation
  const handleEmailChange = (value: string) => {
    setEmail(value)
    const validation = validateEmail(value)
    setFieldValidations(prev => ({
      ...prev,
      email: {
        ...prev.email,
        value,
        touched: true,
        isValid: validation.isValid,
        message: validation.message
      }
    }))
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setFieldValidations(prev => ({
      ...prev,
      password: {
        ...prev.password,
        value,
        touched: true,
        isValid: value.trim().length > 0,
        message: value.trim().length === 0 ? "Password is required" : ""
      }
    }))
  }

  useEffect(() => {
    if (!searchParams) return
    let prefillEmail = searchParams.get('prefill') || searchParams.get('email') || ""
    if (!prefillEmail && typeof window !== 'undefined') {
      prefillEmail = localStorage.getItem('pendingSignupEmail') || ""
    }
    if (prefillEmail) {
      setEmail(prefillEmail)
      const validation = validateEmail(prefillEmail)
      setFieldValidations(prev => ({
        ...prev,
        email: {
          ...prev.email,
          value: prefillEmail,
          touched: true,
          isValid: validation.isValid,
          message: validation.message
        }
      }))
    }
    
    // Show activation message if redirected from signup/payment
    if (searchParams.get('status') === 'activated' || searchParams.get('payment') === 'success') {
      setIsRedirectingFromPayment(true)
      setMessage("🎉 Your account is activated! Please sign in to access your dashboard.");
      
      // Hide the "skeleton" after a short delay to reveal the login form
      const timer = setTimeout(() => {
        setIsRedirectingFromPayment(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Check if form is valid
  const isFormValid = fieldValidations.email.isValid && fieldValidations.password.isValid &&
    email.trim() && password.trim()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <Card className={`w-full max-w-md transition-all duration-500 transform ${isRedirectingFromPayment ? 'scale-105 shadow-2xl border-green-200' : 'scale-100 shadow-xl'}`}>
        {isRedirectingFromPayment ? (
          <CardContent className="p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25" />
              <div className="relative flex items-center justify-center w-20 h-20 bg-green-50 rounded-full border-2 border-green-500">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="text-gray-600">Your GrainHero account is now active.</p>
            </div>
            <div className="space-y-4 pt-4">
              <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-md animate-pulse w-3/4 mx-auto" />
              <div className="h-12 bg-green-100 rounded-md animate-pulse" />
            </div>
            <p className="text-xs text-gray-400">Loading your login portal...</p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Sheep className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl">{t('welcomeBack')}</CardTitle>
              <CardDescription>{t('signInToAccount')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={`pr-10 ${fieldValidations.email.touched && !fieldValidations.email.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.email.touched && fieldValidations.email.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                      required
                    />
                    {fieldValidations.email.touched && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {fieldValidations.email.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {fieldValidations.email.touched && !fieldValidations.email.isValid && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldValidations.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className={`pr-10 ${fieldValidations.password.touched && !fieldValidations.password.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.password.touched && fieldValidations.password.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
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
                  {fieldValidations.password.touched && !fieldValidations.password.isValid && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldValidations.password.message}
                    </p>
                  )}
                </div>

                {/* Message */}
                {message && (
                  <div className={`text-sm rounded-md p-3 flex items-center gap-2 ${message.includes('successful') || message.includes('Redirecting')
                    ? 'text-green-600 bg-green-50 border border-green-200'
                    : 'text-red-600 bg-red-50 border border-red-200'
                    }`}>
                    {message.includes('successful') || message.includes('Redirecting') ? (
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
                  {isLoading ? 'Logging in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <Link href="/auth/forget-password" className="text-sm text-blue-600 hover:underline">
                  {t('forgotPassword')}
                </Link>
                <div className="text-sm text-gray-600">
                  New to GrainHero?{' '}
                  <Link href="/checkout" className="text-blue-600 hover:underline">
                    Get Started
                  </Link>
                </div>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
