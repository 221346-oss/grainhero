# 🔧 Fix: "Signups Not Allowed for OTP" Error

## Problem
Getting error: **"Signups not allowed for otp"** when users try to sign up.

## Root Cause
Supabase Email OTP authentication is not properly configured or email confirmation is enabled without proper setup.

---

## ✅ Solution (Choose ONE):

### **Option A: Disable Email Confirmation (Quick Fix for Development)**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **Settings** → **Auth Providers**
4. Find **"Email"** provider
5. **DISABLE** the "Confirm email" toggle
6. Click **Save**

**Result:** Users can sign up immediately without email verification.

---

### **Option B: Keep Email Confirmation Enabled (Production Setup)**

If you want to keep email verification (recommended for production):

#### 1. Configure Supabase URLs

Go to **Authentication** → **URL Configuration**:

- **Site URL:** `http://localhost:8080` (development) or your production domain
- **Redirect URLs:** Add these:
  ```
  http://localhost:8080/auth/verify-otp
  http://localhost:8080/auth/callback
  https://yourdomain.com/auth/verify-otp
  https://yourdomain.com/auth/callback
  ```

#### 2. Configure Email Templates

Go to **Authentication** → **Email Templates** → **Confirm signup**

Update the template to include a proper verification link:
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

#### 3. Enable SMTP (Required for Email Sending)

Go to **Settings** → **SMTP Settings**:

- Enable custom SMTP
- Configure with your email provider (Gmail, SendGrid, Resend, etc.)

**OR** use Supabase's built-in email service (limited for free tier).

---

## 🧪 Testing

After applying the fix:

1. Open your app: `http://localhost:8080/auth/signup`
2. Try creating a new account
3. Expected behavior:
   - **Option A:** User is immediately logged in
   - **Option B:** User receives verification email → clicks link → gets logged in

---

## 📋 Current Code Changes Applied

✅ Updated `src/routes/auth.signup.tsx`:
- Added email confirmation detection
- Added redirect to verification page if confirmation is required
- Auto-confirm bypassed when email confirmation is enabled

---

## 🔍 Verify Your Settings

Check your `.env` file has these variables set:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## ❓ Still Having Issues?

1. Check Supabase Logs: **Dashboard** → **Logs** → **Auth Logs**
2. Look for errors related to "email" or "otp"
3. Verify your email provider is configured correctly (if using Option B)
4. Make sure your Supabase project is not paused/inactive

---

## 🎯 Recommended for Production

Use **Option B** (Email Confirmation Enabled) with:
- Custom SMTP configured
- Proper email templates
- SSL certificate on your domain
- Rate limiting enabled to prevent spam signups
