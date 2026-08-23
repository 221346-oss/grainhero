# Good First Issues

We are currently working towards the **Claude for Open Source** program and need 9 more unique contributors to reach our goal of 20+. These tasks are designed to be completed in 1-2 hours and have minimal dependencies.

### 🎨 UI & Accessibility (A-series)

- **[A1] High Contrast Mode**: Ensure all dashboard charts are readable in high-contrast settings.
- **[A2] Keyboard Navigation**: Verify all sidebar links are reachable via Tab.
- **[A3] Dark Mode Polish**: Fix any hardcoded white backgrounds in the Platform settings.
- **[A4] Loading States**: Add skeletons to the "Recent Activity" list in `SuperBento.tsx`.

### 🧪 Testing & Reliability (T-series)

- **[T1] Unit Test: Date Utils**: Add tests for `src/lib/utils.ts` date formatting.
- **[T2] Integration: Profile Page**: Add a Vitest check for the profile edit form.
- **[T3] Error Boundary**: Implement a custom error boundary for the Silo Map component.
- **[T4] Zod Validation**: Add more granular error messages to `ActivityLogInput`.

### 🌍 Documentation & DX (D-series)

- **[D1] Code Examples**: Add JSDoc comments to `src/lib/rbac.server.ts`.
- **[D2] Troubleshooting**: Create a `TROUBLESHOOTING.md` for common dev setup issues.
- **[D3] API Docs**: Document the `logActivity` server function parameters.
- **[D4] Contribution Guide**: Add a "How to test IoT data locally" section to `CONTRIBUTING.md`.

### 🛠 Refactoring & Small Features (R-series)

- **[R1] Icon Standardization**: Replace any remaining `lucide-react` string icons with component imports.
- **[R2] Type Safety**: Narrow the `any` types in `src/routes/_authenticated/administration.tsx`.
- **[R3] Local Storage Helper**: Create a utility for typed local storage access.
- **[R4] Toast Notifications**: Standardize "Success" messages when creating new silos.

---

**To get started:** Comment on the issue you want to take, and we'll assign it to you!
