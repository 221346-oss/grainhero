Final Summary Table (src/ only)
#	Issue	File	Real Issue?
1	Review & Pay incomplete	checkout.index.tsx	✅ Yes — 3 fields missing
2	Total amount missing	checkout.index.tsx	✅ Yes — no grand total
3	Popup + features lock	checkout.success.tsx + silos.tsx	✅ Yes — both issues
4	Placeholders	checkout.index.tsx, auth.signup.tsx	✅ Yes
5	Email prefill	auth.signup.tsx	✅ Sahi hai — rakhna hai
6	Form validation	checkout.index.tsx	✅ Yes — validation.ts hai but not used
7	Activation redirect	checkout.success.tsx	✅ Yes — card instead of navigate
8	Success page steps	checkout.success.tsx	✅ Yes — email verify step + allDone bug
9	Tour issues	OnboardingTour.tsx	✅ Yes — timing, placement, roles
10	Role flow	team-settings-insurance.functions.ts	✅ Works — minor: unbranded invite email
11	Pending page	PendingDashboard.tsx	✅ Yes — bare minimum
12	Loading page	skeletons.tsx, router.tsx	✅ Yes — no branding/interaction
+	Hero button wrong URL	HeroSection.tsx	✅ Yes — /auth nahi exists
+	Navbar missing links	GlassNav.tsx	✅ Yes — #how-it-works + no contact
+	Pending role has dashboard	route.tsx	✅ Yes — no role check
Ab batao — implement shuru karun?