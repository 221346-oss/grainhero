// Comprehensive validation utilities for professional forms

export interface ValidationResult {
    isValid: boolean;
    message: string;
}

export interface FieldValidation {
    value: string;
    isValid: boolean;
    message: string;
    touched: boolean;
}

// Email validation with comprehensive checks
export const validateEmail = (email: string): ValidationResult => {
    if (!email.trim()) {
        return { isValid: false, message: "Email is required" };
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, message: "Please enter a valid email address" };
    }

    // Additional checks for professional email validation
    if (email.length > 254) {
        return { isValid: false, message: "Email address is too long" };
    }

    const localPart = email.split('@')[0];
    if (localPart.length > 64) {
        return { isValid: false, message: "Email username part is too long" };
    }

    // Check for consecutive dots
    if (email.includes('..')) {
        return { isValid: false, message: "Email cannot contain consecutive dots" };
    }

    // Check for leading/trailing dots
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
        return { isValid: false, message: "Email username cannot start or end with a dot" };
    }

    return { isValid: true, message: "" };
};

// Name validation (full name)
export const validateName = (name: string): ValidationResult => {
    if (!name.trim()) {
        return { isValid: false, message: "Full name is required" };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
        return { isValid: false, message: "Name must be at least 2 characters long" };
    }

    if (trimmedName.length > 50) {
        return { isValid: false, message: "Name cannot exceed 50 characters" };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(trimmedName)) {
        return { isValid: false, message: "Name can only contain letters, spaces, hyphens, and apostrophes" };
    }

    // Check for at least one space (first and last name)
    const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);
    if (nameParts.length < 2) {
        return { isValid: false, message: "Please enter your full name (first and last name)" };
    }

    // Check each name part is at least 2 characters
    for (const part of nameParts) {
        if (part.length < 2) {
            return { isValid: false, message: "Each name part must be at least 2 characters long" };
        }
    }

    return { isValid: true, message: "" };
};

// Phone number validation (international format)
export const validatePhone = (phone: string): ValidationResult => {
    if (!phone.trim()) {
        return { isValid: true, message: "" }; // Phone is optional
    }

    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Check if it starts with + for international format
    if (!cleaned.startsWith('+')) {
        return { isValid: false, message: "Phone number must include country code (e.g., +1, +44)" };
    }

    // Remove the + and check if remaining are digits
    const digits = cleaned.slice(1);
    if (!/^\d+$/.test(digits)) {
        return { isValid: false, message: "Phone number can only contain digits after country code" };
    }

    // Check length (7-15 digits is international standard)
    if (digits.length < 7 || digits.length > 15) {
        return { isValid: false, message: "Phone number must be between 7-15 digits" };
    }

    return { isValid: true, message: "" };
};

// Password strength validation
export interface PasswordStrength {
    score: number; // 0-4
    feedback: string[];
    isValid: boolean;
}

export const validatePassword = (password: string): ValidationResult & { strength: PasswordStrength } => {
    if (!password) {
        return {
            isValid: false,
            message: "Password is required",
            strength: { score: 0, feedback: [], isValid: false }
        };
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
        feedback.push("At least 8 characters");
    } else {
        score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
        feedback.push("One uppercase letter");
    } else {
        score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
        feedback.push("One lowercase letter");
    } else {
        score += 1;
    }

    // Number check
    if (!/\d/.test(password)) {
        feedback.push("One number");
    } else {
        score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        feedback.push("One special character");
    } else {
        score += 1;
    }

    // Maximum length check
    if (password.length > 128) {
        return {
            isValid: false,
            message: "Password cannot exceed 128 characters",
            strength: { score, feedback, isValid: false }
        };
    }

    // Common password check (basic)
    const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
    if (commonPasswords.includes(password.toLowerCase())) {
        return {
            isValid: false,
            message: "This password is too common. Please choose a stronger password",
            strength: { score: 0, feedback: ["Use a unique password"], isValid: false }
        };
    }

    const isValid = score >= 4 && feedback.length === 0;

    return {
        isValid,
        message: isValid ? "" : `Password must include: ${feedback.join(', ')}`,
        strength: { score, feedback, isValid }
    };
};

// Confirm password validation
export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
    if (!confirmPassword) {
        return { isValid: false, message: "Please confirm your password" };
    }

    if (password !== confirmPassword) {
        return { isValid: false, message: "Passwords do not match" };
    }

    return { isValid: true, message: "" };
};

// Form validation state management
export const createFieldValidation = (value: string = "", touched: boolean = false): FieldValidation => ({
    value,
    isValid: true,
    message: "",
    touched
});

// Real-time validation helper
export const validateField = (fieldName: string, value: string): ValidationResult => {
    switch (fieldName) {
        case 'name':
            return validateName(value);
        case 'email':
            return validateEmail(value);
        case 'phone':
            return validatePhone(value);
        case 'password':
            return validatePassword(value);
        default:
            return { isValid: true, message: "" };
    }
};

// Password strength color helper
export const getPasswordStrengthColor = (score: number): string => {
    switch (score) {
        case 0:
        case 1:
            return 'bg-red-500';
        case 2:
            return 'bg-orange-500';
        case 3:
            return 'bg-yellow-500';
        case 4:
            return 'bg-green-500';
        default:
            return 'bg-gray-300';
    }
};

// Password strength text helper
export const getPasswordStrengthText = (score: number): string => {
    switch (score) {
        case 0:
        case 1:
            return 'Very Weak';
        case 2:
            return 'Weak';
        case 3:
            return 'Medium';
        case 4:
            return 'Strong';
        default:
            return '';
    }
};

// Form submission validation
export const validateSignupForm = (formData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
}) => {
    const errors: Record<string, string> = {};

    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) errors.name = nameValidation.message;

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) errors.email = emailValidation.message;

    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.isValid) errors.phone = phoneValidation.message;

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) errors.password = passwordValidation.message;

    const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (!confirmPasswordValidation.isValid) errors.confirmPassword = confirmPasswordValidation.message;

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const validateLoginForm = (email: string, password: string) => {
    const errors: Record<string, string> = {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) errors.email = emailValidation.message;

    if (!password.trim()) {
        errors.password = "Password is required";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
