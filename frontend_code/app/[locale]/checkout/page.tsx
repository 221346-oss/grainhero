"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Check, CreditCard, Shield, Clock, Users, Globe, Cpu,
  ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff, AlertCircle, CheckCircle
} from "lucide-react"
import pricingData from '../pricing-data.js'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  validateField,
  validatePassword,
  createFieldValidation,
  type PasswordStrength
} from "@/lib/validation"
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator"

export default function CheckoutPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const searchParams = useSearchParams()
  const [selectedPlan, setSelectedPlan] = useState<string | null>('intermediate')
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [iotQuantity, setIotQuantity] = useState(1)
  const router = useRouter()

  // Account info state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false })
  const [fieldValidations, setFieldValidations] = useState({
    name: createFieldValidation(),
    email: createFieldValidation(),
    phone: createFieldValidation(),
    password: createFieldValidation(),
    confirmPassword: createFieldValidation(),
  })

  // Step state: 1 = Plan Selection, 2 = Account Info
  const [step, setStep] = useState(1)

  useEffect(() => {
    const email = searchParams.get('email') || localStorage.getItem('signupEmail')
    if (email) {
      setFormData(prev => ({ ...prev, email }))
    }
    const preselectedPlan = localStorage.getItem('selectedPlanId')
    if (preselectedPlan) {
      setSelectedPlan(preselectedPlan)
      localStorage.removeItem('selectedPlanId')
    }
  }, [searchParams])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    const validation = validateField(field, value)

    if (field === 'confirmPassword') {
      const passwordsMatch = formData.password === value
      setFieldValidations(prev => ({
        ...prev,
        confirmPassword: {
          ...prev.confirmPassword,
          value,
          touched: true,
          isValid: value ? passwordsMatch : false,
          message: value ? (passwordsMatch ? "" : "Passwords do not match") : "Confirm password is required"
        }
      }))
    } else {
      setFieldValidations(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev],
          value,
          touched: true,
          isValid: validation.isValid,
          message: validation.message
        }
      }))
    }

    if (field === 'password') {
      const passwordValidation = validatePassword(value)
      setPasswordStrength(passwordValidation.strength)
      // Re-validate confirm if already filled
      if (formData.confirmPassword) {
        const match = value === formData.confirmPassword
        setFieldValidations(prev => ({
          ...prev,
          confirmPassword: {
            ...prev.confirmPassword,
            isValid: match,
            message: match ? "" : "Passwords do not match"
          }
        }))
      }
    }
  }

  const isAccountFormValid =
    formData.name.trim().length >= 2 &&
    formData.email.trim().length > 0 &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword

  const handlePayment = async () => {
    if (!selectedPlan || !isAccountFormValid) return

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const plan = pricingData.find((p: { id: string }) => p.id === selectedPlan)
      if (!plan) {
        setErrorMessage('Selected plan not found.')
        setIsProcessing(false)
        return
      }

      localStorage.setItem('checkoutData', JSON.stringify({
        planId: selectedPlan,
        userEmail: formData.email,
        timestamp: new Date().toISOString()
      }))

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: formData.email.trim().toLowerCase(),
          planId: selectedPlan,
          userName: formData.name.trim(),
          userPassword: formData.password,
          userPhone: formData.phone.trim() || undefined,
          iotQuantity: iotQuantity,
        })
      })

      const data = await response.json()

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setErrorMessage(data.message || 'Payment initialization failed. Please try again.')
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setErrorMessage('Network error. Please try again later.')
      setIsProcessing(false)
    }
  }

  const selectedPlanData = pricingData.find((p: { id: string }) => p.id === selectedPlan)
  const siloCount = selectedPlanData?.limits?.silos || 3

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Started with GrainHero
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {step === 1
              ? "Choose a plan that best fits your grain storage needs"
              : "Complete your account information to proceed"
            }
          </p>
          {/* Step indicator */}
          <div className="flex items-center justify-center mt-6 gap-4">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 1 ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'}`}>1</div>
              Select Plan
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
              Account Info
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-gray-200 text-gray-500">3</div>
              Payment
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Step Content */}
          <div className="lg:col-span-2">
            {step === 1 ? (
              /* STEP 1: Plan Selection */
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <CreditCard className="h-6 w-6 text-green-600" />
                    Select Your Plan
                  </CardTitle>
                  <CardDescription>
                    Choose the plan that best fits your grain storage requirements. You can change plans anytime from your dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pricingData.filter((p: { id: string }) => p.id !== 'custom').map((plan: { id: string; name: string; description: string; price: number; interval: string; popular: boolean; features: string[]; limits: { users: number; warehouses: number; silos: number }; iotCharge: number; iotChargeLabel: string }) => (
                      <label
                        key={plan.id}
                        className={`block rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedPlan === plan.id
                          ? 'border-green-500 bg-green-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-green-300'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="radio"
                            name="plan"
                            value={plan.id}
                            checked={selectedPlan === plan.id}
                            onChange={() => handlePlanSelect(plan.id)}
                            className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                  {plan.name}
                                  {plan.popular && (
                                    <Badge className="bg-green-600 text-white text-xs">
                                      Most Popular
                                    </Badge>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                              </div>
                            </div>

                            <div className="flex justify-between items-end mb-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <Users className="h-4 w-4 text-green-600" />
                                  <span>{plan.limits?.users === -1 ? 'Unlimited' : plan.limits?.users} Staff</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <Globe className="h-4 w-4 text-green-600" />
                                  <span>{plan.limits?.warehouses} Warehouse{plan.limits?.warehouses > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <Cpu className="h-4 w-4 text-amber-600" />
                                  <span>{plan.limits?.silos} Silos ({plan.limits?.silos} × IoT devices)</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  Rs. {plan.price?.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">per {plan.interval}</div>
                              </div>
                            </div>

                            {/* Collapsible Features */}
                            <div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setExpandedPlans(prev => ({ ...prev, [plan.id]: !prev[plan.id] }))
                                }}
                                className="flex items-center gap-1 text-sm text-green-600 font-medium hover:text-green-700 transition-colors"
                              >
                                {expandedPlans[plan.id] ? (
                                  <>Hide Features <ChevronUp className="h-3 w-3" /></>
                                ) : (
                                  <>View Features <ChevronDown className="h-3 w-3" /></>
                                )}
                              </button>
                              {expandedPlans[plan.id] && (
                                <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <ul className="space-y-2">
                                    {plan.features.map((feature: string, index: number) => (
                                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                        <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                        <span>{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Continue to Step 2 */}
                  <div className="mt-8">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedPlan}
                      className="w-full py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                    >
                      Continue to Account Setup →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* STEP 2: Account Information */
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Shield className="h-6 w-6 text-green-600" />
                    Create Your Account
                  </CardTitle>
                  <CardDescription>
                    Fill in your details to set up your GrainHero admin account. You&apos;ll be redirected to secure payment after this.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <div className="relative">
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          className={`pr-10 ${fieldValidations.name.touched && !fieldValidations.name.isValid ? 'border-red-500' : fieldValidations.name.touched && fieldValidations.name.isValid ? 'border-green-500' : ''}`}
                        />
                        {fieldValidations.name.touched && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {fieldValidations.name.isValid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        )}
                      </div>
                      {fieldValidations.name.touched && !fieldValidations.name.isValid && (
                        <p className="text-sm text-red-600">{fieldValidations.name.message}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          className={`pr-10 ${fieldValidations.email.touched && !fieldValidations.email.isValid ? 'border-red-500' : fieldValidations.email.touched && fieldValidations.email.isValid ? 'border-green-500' : ''}`}
                        />
                        {fieldValidations.email.touched && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {fieldValidations.email.isValid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number <span className="text-gray-400 text-sm">(optional)</span></Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                      />
                    </div>

                    {/* Passwords */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => handleChange("password", e.target.value)}
                            className={`pr-10 ${fieldValidations.password.touched && !fieldValidations.password.isValid ? 'border-red-500' : fieldValidations.password.touched && fieldValidations.password.isValid ? 'border-green-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange("confirmPassword", e.target.value)}
                            className={`pr-10 ${fieldValidations.confirmPassword.touched && !fieldValidations.confirmPassword.isValid ? 'border-red-500' : fieldValidations.confirmPassword.touched && fieldValidations.confirmPassword.isValid ? 'border-green-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {fieldValidations.confirmPassword.touched && !fieldValidations.confirmPassword.isValid && (
                          <p className="text-sm text-red-600">{fieldValidations.confirmPassword.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Password strength */}
                    {formData.password && (
                      <PasswordStrengthIndicator strength={passwordStrength} />
                    )}

                    {/* Error */}
                    {errorMessage && (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    {/* Back + Proceed */}
                    <div className="flex gap-4 mt-8">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2">
                        <ArrowLeft className="h-4 w-4" /> Change Plan
                      </Button>
                      <Button
                        onClick={handlePayment}
                        disabled={!isAccountFormValid || isProcessing}
                        className="flex-1 py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        {isProcessing ? 'Processing...' : 'Proceed to Payment'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Order Summary (always visible) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedPlanData ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{selectedPlanData.name}</h4>
                          <p className="text-sm text-gray-600">{selectedPlanData.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">Rs. {selectedPlanData.price?.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">per {selectedPlanData.interval}</div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">What&apos;s included:</h5>
                        <ul className="space-y-1">
                          {selectedPlanData.features.slice(0, 4).map((feature: string, index: number) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                              <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                          {selectedPlanData.features.length > 4 && (
                            <li className="text-sm text-gray-500">
                              +{selectedPlanData.features.length - 4} more features
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    {/* IoT Device Quantity */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900 flex items-center gap-1">
                        <Cpu className="w-4 h-4 text-amber-600" />
                        IoT Devices (One-time fee)
                      </h5>
                      <p className="text-xs text-gray-500">
                        Rs. 7,000 per device · Max {siloCount} for this plan
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIotQuantity(q => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          disabled={iotQuantity <= 1}
                        >−</button>
                        <span className="text-lg font-semibold w-8 text-center">{iotQuantity}</span>
                        <button
                          type="button"
                          onClick={() => setIotQuantity(q => Math.min(siloCount, q + 1))}
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          disabled={iotQuantity >= siloCount}
                        >+</button>
                      </div>
                    </div>

                    <Separator />

                    {/* Pricing Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Monthly Subscription</span>
                        <span>Rs. {selectedPlanData.price?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-amber-600" />
                          IoT Setup ({iotQuantity} × Rs. 7,000)
                        </span>
                        <span>Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        One-time charge · billed separately after subscription
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Subscription</span>
                        <span>Rs. {selectedPlanData.price?.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between text-sm text-amber-700">
                        <span>+ IoT Setup (one-time)</span>
                        <span>Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span>Secure payment via Stripe</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span>Instant activation after payment</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span>Change plans anytime from dashboard</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      By proceeding, you agree to our Terms of Service. Cancel anytime.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select a plan to see order details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back to Pricing */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/pricing')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing
          </Button>
        </div>
      </div>
    </div>
  )
}
