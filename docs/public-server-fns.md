# Public (unauthenticated) Server Functions

Every `createServerFn` MUST either use `.middleware([requireSupabaseAuth])`
or be listed here with a justification. The `audit-server-fns` script
enforces this.

| File | Function | Why public |
|---|---|---|
| `src/lib/waitlist.functions.ts` | `joinWaitlist` | Landing page opt-in, rate-limited server-side |
| `src/lib/public-plans.functions.ts` | `listPublicPlans` | Public pricing page |
| `src/lib/lead.functions.ts` | `submitLead` | Contact / demo request form |

Add rows here in the same change that introduces a new public server fn.
If unsure — the fn is NOT public. Add the middleware.
