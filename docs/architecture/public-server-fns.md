# Public (unauthenticated) Server Functions

Every `createServerFn` MUST either use `.middleware([requireSupabaseAuth])`
or be listed here with a justification. The `audit-server-fns` script
enforces this.

| File                                           | Function                        | Why public                                    |
| ---------------------------------------------- | ------------------------------- | --------------------------------------------- |
| `src/lib/waitlist.functions.ts`                | `joinWaitlist`                  | Landing page opt-in, rate-limited server-side |
| `src/lib/public-plans.functions.ts`            | `listPublicPlans`               | Public pricing page                           |
| `src/lib/lead.functions.ts`                    | `submitLead`                    | Contact / demo request form                   |
| `src/lib/auth-verification-email.functions.ts` | `sendOtpEmail`                  | Pre-login OTP delivery                        |
| `src/lib/auth-verification-email.functions.ts` | `autoConfirmUserEmail`          | Signup email confirmation flow                |
| `src/lib/checkout-emails.functions.ts`         | `sendCheckoutConfirmationEmail` | Post-checkout receipt, session-token guarded  |
| `src/lib/contact-email.functions.ts`           | `sendContactEmail`              | Public contact form                           |
| `src/lib/contact.functions.ts`                 | `sendContactEmail`              | Public contact form (legacy)                  |
| `src/lib/openweather.functions.ts`             | `geocodeCity`                   | Public onboarding wizard                      |
| `src/lib/openweather.functions.ts`             | `getWeatherBundle`              | Public marketing widget                       |
| `src/lib/stripe-checkout.functions.ts`         | `createStripeCheckoutSession`   | Public purchase flow (pre-auth allowed)       |
| `src/lib/stripe-checkout.functions.ts`         | `getCheckoutSessionSummary`     | Public thank-you page                         |

Add rows here in the same change that introduces a new public server fn.
If unsure — the fn is NOT public. Add the middleware.
