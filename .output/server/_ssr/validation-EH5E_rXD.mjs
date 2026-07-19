//#region node_modules/.nitro/vite/services/ssr/assets/validation-EH5E_rXD.js
var validateEmail = (email) => {
	if (!email.trim()) return {
		isValid: false,
		message: "Email is required"
	};
	if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return {
		isValid: false,
		message: "Please enter a valid email address"
	};
	if (email.length > 254) return {
		isValid: false,
		message: "Email address is too long"
	};
	const localPart = email.split("@")[0];
	if (localPart.length > 64) return {
		isValid: false,
		message: "Email username part is too long"
	};
	if (email.includes("..")) return {
		isValid: false,
		message: "Email cannot contain consecutive dots"
	};
	if (localPart.startsWith(".") || localPart.endsWith(".")) return {
		isValid: false,
		message: "Email username cannot start or end with a dot"
	};
	return {
		isValid: true,
		message: ""
	};
};
var validateName = (name) => {
	if (!name.trim()) return {
		isValid: false,
		message: "Full name is required"
	};
	const trimmedName = name.trim();
	if (trimmedName.length < 2) return {
		isValid: false,
		message: "Name must be at least 2 characters long"
	};
	if (trimmedName.length > 50) return {
		isValid: false,
		message: "Name cannot exceed 50 characters"
	};
	if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) return {
		isValid: false,
		message: "Name can only contain letters, spaces, hyphens, and apostrophes"
	};
	const nameParts = trimmedName.split(/\s+/).filter((part) => part.length > 0);
	if (nameParts.length < 2) return {
		isValid: false,
		message: "Please enter your full name (first and last name)"
	};
	for (const part of nameParts) if (part.length < 2) return {
		isValid: false,
		message: "Each name part must be at least 2 characters long"
	};
	return {
		isValid: true,
		message: ""
	};
};
var validatePhone = (phone) => {
	if (!phone.trim()) return {
		isValid: true,
		message: ""
	};
	const cleaned = phone.replace(/[\s\-\(\)]/g, "");
	if (!cleaned.startsWith("+")) return {
		isValid: false,
		message: "Phone number must include country code (e.g., +1, +44)"
	};
	const digits = cleaned.slice(1);
	if (!/^\d+$/.test(digits)) return {
		isValid: false,
		message: "Phone number can only contain digits after country code"
	};
	if (digits.length < 7 || digits.length > 15) return {
		isValid: false,
		message: "Phone number must be between 7-15 digits"
	};
	return {
		isValid: true,
		message: ""
	};
};
var validatePassword = (password) => {
	if (!password) return {
		isValid: false,
		message: "Password is required",
		strength: {
			score: 0,
			feedback: [],
			isValid: false
		}
	};
	const feedback = [];
	let score = 0;
	if (password.length < 8) feedback.push("At least 8 characters");
	else score += 1;
	if (!/[A-Z]/.test(password)) feedback.push("One uppercase letter");
	else score += 1;
	if (!/[a-z]/.test(password)) feedback.push("One lowercase letter");
	else score += 1;
	if (!/\d/.test(password)) feedback.push("One number");
	else score += 1;
	if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) feedback.push("One special character");
	else score += 1;
	if (password.length > 128) return {
		isValid: false,
		message: "Password cannot exceed 128 characters",
		strength: {
			score,
			feedback,
			isValid: false
		}
	};
	if ([
		"password",
		"12345678",
		"qwerty123",
		"admin123"
	].includes(password.toLowerCase())) return {
		isValid: false,
		message: "This password is too common. Please choose a stronger password",
		strength: {
			score: 0,
			feedback: ["Use a unique password"],
			isValid: false
		}
	};
	const isValid = score >= 4 && feedback.length === 0;
	return {
		isValid,
		message: isValid ? "" : `Password must include: ${feedback.join(", ")}`,
		strength: {
			score,
			feedback,
			isValid
		}
	};
};
var validateConfirmPassword = (password, confirmPassword) => {
	if (!confirmPassword) return {
		isValid: false,
		message: "Please confirm your password"
	};
	if (password !== confirmPassword) return {
		isValid: false,
		message: "Passwords do not match"
	};
	return {
		isValid: true,
		message: ""
	};
};
var getPasswordStrengthColor = (score) => {
	switch (score) {
		case 0:
		case 1: return "bg-red-500";
		case 2: return "bg-orange-500";
		case 3: return "bg-yellow-500";
		case 4: return "bg-green-500";
		default: return "bg-gray-300";
	}
};
var getPasswordStrengthText = (score) => {
	switch (score) {
		case 0:
		case 1: return "Very Weak";
		case 2: return "Weak";
		case 3: return "Medium";
		case 4: return "Strong";
		default: return "";
	}
};
var validateSignupForm = (formData) => {
	const errors = {};
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
//#endregion
export { validateSignupForm as a, validatePassword as i, getPasswordStrengthText as n, validateEmail as r, getPasswordStrengthColor as t };
