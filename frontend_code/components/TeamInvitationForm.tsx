"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Mail, Users } from 'lucide-react';
import { validateEmail, createFieldValidation, type FieldValidation } from '@/lib/validation';
import { config } from '@/config';

interface TeamInvitationFormProps {
    onInviteSent?: () => void;
}

export const TeamInvitationForm: React.FC<TeamInvitationFormProps> = ({ onInviteSent }) => {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'technician' as 'manager' | 'technician'
    });

    const [emailValidation, setEmailValidation] = useState<FieldValidation>(createFieldValidation());
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleEmailChange = (value: string) => {
        setFormData(prev => ({ ...prev, email: value }));
        const validation = validateEmail(value);
        setEmailValidation({
            value,
            touched: true,
            isValid: validation.isValid,
            message: validation.message
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!emailValidation.isValid) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setMessage({ type: 'error', text: 'Please log in to send invitations' });
                setIsLoading(false);
                return;
            }

            const res = await fetch(`${config.backendUrl}/auth/invite-team-member`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: formData.email.trim().toLowerCase(),
                    name: formData.name.trim() || undefined,
                    role: formData.role
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: 'error', text: data.error || 'Failed to send invitation' });
            } else {
                setMessage({ type: 'success', text: 'Invitation sent successfully!' });
                setFormData({ email: '', name: '', role: 'technician' });
                setEmailValidation(createFieldValidation());
                onInviteSent?.();
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        }

        setIsLoading(false);
    };

    const isFormValid = emailValidation.isValid && formData.email.trim();

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-green-600" />
                    <div>
                        <CardTitle className="text-xl">Invite Team Member</CardTitle>
                        <CardDescription>Send an invitation to join your team</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Field */}
                    <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <div className="relative">
                            <Input
                                id="invite-email"
                                type="email"
                                placeholder="Enter colleague's email address"
                                value={formData.email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                className={`pr-10 ${emailValidation.touched && !emailValidation.isValid ? 'border-red-500 focus:border-red-500' : emailValidation.touched && emailValidation.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                                required
                            />
                            {emailValidation.touched && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {emailValidation.isValid ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                        {emailValidation.touched && !emailValidation.isValid && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {emailValidation.message}
                            </p>
                        )}
                    </div>

                    {/* Name Field */}
                    <div className="space-y-2">
                        <Label htmlFor="invite-name">Name (Optional)</Label>
                        <Input
                            id="invite-name"
                            type="text"
                            placeholder="Enter colleague's name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={formData.role} onValueChange={(value: 'manager' | 'technician') => setFormData(prev => ({ ...prev, role: value }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="technician">Technician</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`text-sm p-3 rounded-md flex items-center gap-2 ${message.type === 'success'
                            ? 'text-green-700 bg-green-50 border border-green-200'
                            : 'text-red-600 bg-red-50 border border-red-200'
                            }`}>
                            {message.type === 'success' ? (
                                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            )}
                            {message.text}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
                        {isLoading ? (
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
                </form>
            </CardContent>
        </Card>
    );
};
