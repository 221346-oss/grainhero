import { o as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $ as Plus, K as Save, S as Trash2, an as Check, cn as Camera, dt as MapPin, f as User, hn as Bell, ht as LoaderCircle, it as Palette, n as X, z as ShieldAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { r as FormSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { a as numberType, c as stringType, n as booleanType, o as objectType, s as recordType } from "../_libs/zod.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-BPuF5-mq.mjs";
import { t as PageHeader } from "../_shared-CXvP2OQF.mjs";
import { t as useIsSuperAdmin } from "./useIsSuperAdmin-bJ_EKAEZ.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BgKcOzjx.mjs";
import { l as updateMySettings, r as getMySettings } from "./team-settings-insurance.functions-B-NzOE-L.mjs";
import { i as initialsOf, n as applyTheme, r as getStoredTheme, t as THEMES } from "./useMyProfile-B74TGC27.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-DNniE1Hq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Switch$1.displayName;
var getPlatformSettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("20a5a6762755201e06f04062d7354e12f8225eff47615ebb8eb8cf21f69364d8"));
var configSchema = objectType({
	maintenance_mode: booleanType(),
	feature_flags: recordType(stringType(), booleanType()),
	default_thresholds: recordType(stringType(), numberType())
});
var updatePlatformSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => configSchema.parse(data)).handler(createSsrRpc("1e7676f46551fd59b2c5a298b73ff3b18ac3454cf7194f48a4077c32ce542c4c"));
function SettingsPage() {
	const qc = useQueryClient();
	const getFn = useServerFn(getMySettings);
	const saveFn = useServerFn(updateMySettings);
	const isSuperAdmin = useIsSuperAdmin();
	const { data, isLoading } = useQuery({
		queryKey: ["my-settings"],
		queryFn: () => getFn()
	});
	const [theme, setTheme] = (0, import_react.useState)(() => getStoredTheme());
	function selectTheme(id) {
		setTheme(id);
		applyTheme(id);
	}
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		phone: "",
		business_type: "farm",
		avatar: null,
		address: "",
		city: "",
		country: "",
		prefs: {
			email_alerts: true,
			sms_alerts: false,
			push_notifications: true,
			weekly_reports: true,
			expiry_email_alerts: true,
			expiry_push_alerts: true
		}
	});
	const fileRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!data) return;
		const addr = data.address ?? {};
		const prefs = data.preferences ?? {};
		setForm({
			name: data.name ?? "",
			phone: data.phone ?? "",
			business_type: data.business_type ?? "farm",
			avatar: data.avatar ?? null,
			address: addr.address ?? "",
			city: addr.city ?? "",
			country: addr.country ?? "",
			prefs: {
				email_alerts: prefs.email_alerts ?? true,
				sms_alerts: prefs.sms_alerts ?? false,
				push_notifications: prefs.push_notifications ?? true,
				weekly_reports: prefs.weekly_reports ?? true,
				expiry_email_alerts: prefs.expiry_email_alerts ?? true,
				expiry_push_alerts: prefs.expiry_push_alerts ?? true
			}
		});
	}, [data]);
	const save = useMutation({
		mutationFn: () => saveFn({ data: {
			name: form.name,
			phone: form.phone,
			business_type: form.business_type,
			avatar: form.avatar,
			address: {
				address: form.address,
				city: form.city,
				country: form.country
			},
			preferences: form.prefs
		} }),
		onSuccess: () => {
			toast.success("Settings saved");
			qc.invalidateQueries({ queryKey: ["my-settings"] });
		},
		onError: (e) => toast.error(e.message)
	});
	async function handleFile(file) {
		if (!file.type.startsWith("image/")) {
			toast.error("Please choose an image");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toast.error("Image must be under 5MB");
			return;
		}
		const dataUrl = await new Promise((resolve, reject) => {
			const r = new FileReader();
			r.onload = () => resolve(String(r.result));
			r.onerror = () => reject(r.error);
			r.readAsDataURL(file);
		});
		const resized = await new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const size = 256;
				const canvas = document.createElement("canvas");
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext("2d");
				const s = Math.min(img.width, img.height);
				const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
				ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
				resolve(canvas.toDataURL("image/jpeg", .85));
			};
			img.onerror = () => resolve(dataUrl);
			img.src = dataUrl;
		});
		setForm((f) => ({
			...f,
			avatar: resized
		}));
	}
	const initials = initialsOf(form.name, data?.email ?? "");
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-6 md:p-8 max-w-4xl mx-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, { fields: 6 })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 md:p-8 max-w-4xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				title: "Settings",
				subtitle: "Manage your profile, location and notification preferences"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "profile",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
						className: "mb-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "profile",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4 mr-2" }), "Profile"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "location",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 mr-2" }), "Location"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "notifications",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4 mr-2" }), "Notifications"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "appearance",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Palette, { className: "h-4 w-4 mr-2" }), "Appearance"]
							}),
							isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "platform",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "h-4 w-4 mr-2" }), "Platform"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "profile",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Profile" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Basic information about you." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => fileRef.current?.click(),
										className: "relative h-20 w-20 rounded-full overflow-hidden ring-1 ring-black/10 grid place-items-center text-lg font-bold text-[--fusion-ink] shadow-sm group",
										style: form.avatar ? void 0 : { background: "var(--gradient-fusion)" },
										"aria-label": "Change profile picture",
										children: [form.avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: form.avatar,
											alt: "",
											className: "absolute inset-0 h-full w-full object-cover"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: initials }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-5 w-5" })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-sm font-medium text-foreground",
												children: "Profile picture"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													type: "button",
													variant: "outline",
													size: "sm",
													onClick: () => fileRef.current?.click(),
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-4 w-4 mr-2" }),
														" ",
														form.avatar ? "Change" : "Upload"
													]
												}), form.avatar && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													type: "button",
													variant: "ghost",
													size: "sm",
													onClick: () => setForm({
														...form,
														avatar: null
													}),
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4 mr-2" }), " Remove"]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-muted-foreground",
												children: "Square image works best. Save to apply."
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										ref: fileRef,
										type: "file",
										accept: "image/*",
										className: "hidden",
										onChange: (e) => {
											const f = e.target.files?.[0];
											if (f) handleFile(f);
											e.currentTarget.value = "";
										}
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid md:grid-cols-2 gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.name,
										onChange: (e) => setForm({
											...form,
											name: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: data?.email ?? "",
										disabled: true
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Phone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.phone,
										onChange: (e) => setForm({
											...form,
											phone: e.target.value
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Business Type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: form.business_type,
										onValueChange: (v) => setForm({
											...form,
											business_type: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "farm",
												children: "Farm"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "warehouse",
												children: "Warehouse"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "cooperative",
												children: "Cooperative"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "trader",
												children: "Trader"
											})
										] })]
									})] })
								]
							})]
						})] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
						value: "location",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Location" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Where your operation is based." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "grid md:grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "md:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.address,
										onChange: (e) => setForm({
											...form,
											address: e.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "City" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.city,
									onChange: (e) => setForm({
										...form,
										city: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Country" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.country,
									onChange: (e) => setForm({
										...form,
										country: e.target.value
									})
								})] })
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "mt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "App tour" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Replay the guided walkthrough of the dashboard." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									import("./OnboardingTour-xcIr4REW.mjs").then((m) => m.restartOnboardingTour());
								},
								className: "inline-flex items-center gap-2 rounded-md bg-[#00a63e] hover:bg-[#029238] text-white px-4 py-2 text-sm font-medium",
								children: "Replay the tour"
							}) })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "notifications",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Notifications" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Choose how we contact you." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "space-y-4",
							children: [
								{
									key: "email_alerts",
									label: "Email alerts"
								},
								{
									key: "sms_alerts",
									label: "SMS alerts"
								},
								{
									key: "push_notifications",
									label: "Push notifications"
								},
								{
									key: "weekly_reports",
									label: "Weekly reports"
								},
								{
									key: "expiry_email_alerts",
									label: "Email me when my plan is about to expire (7 / 3 / 1 days)"
								},
								{
									key: "expiry_push_alerts",
									label: "In-app notification when my plan is about to expire"
								}
							].map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-lg border border-slate-200 p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium text-slate-700",
									children: row.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: !!form.prefs[row.key],
									onCheckedChange: (v) => setForm({
										...form,
										prefs: {
											...form.prefs,
											[row.key]: v
										}
									})
								})]
							}, row.key))
						})] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "appearance",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Theme" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Pick a color theme. Applies to the whole app instantly and is remembered on this device." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
							children: THEMES.map((t) => {
								const active = t.id === theme;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => selectTheme(t.id),
									className: cn("group relative rounded-2xl border p-4 text-left transition-all", active ? "border-[--fusion-grape] ring-2 ring-[--fusion-grape]/40" : "border-border hover:border-foreground/20"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex items-center gap-2 mb-3",
										children: t.swatch.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "h-8 w-8 rounded-full ring-1 ring-black/10 shadow-sm",
											style: { background: c }
										}, i))
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-semibold text-sm text-foreground",
											children: t.name
										}), active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "h-6 w-6 rounded-full bg-[--fusion-grape] text-white grid place-items-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
												className: "h-3.5 w-3.5",
												strokeWidth: 3
											})
										})]
									})]
								}, t.id);
							})
						}) })] })
					}),
					isSuperAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "platform",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformSettingsSection, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => save.mutate(),
					disabled: save.isPending,
					className: "bg-emerald-600 hover:bg-emerald-700",
					children: [save.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4 mr-2" }), "Save changes"]
				})
			})
		]
	});
}
function PlatformSettingsSection() {
	const qc = useQueryClient();
	const getFn = useServerFn(getPlatformSettings);
	const saveFn = useServerFn(updatePlatformSettings);
	const { data, isLoading } = useQuery({
		queryKey: ["platform-settings"],
		queryFn: () => getFn()
	});
	const [cfg, setCfg] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (data) setCfg(data);
	}, [data]);
	const [flagKey, setFlagKey] = (0, import_react.useState)("");
	const [thresholdKey, setThresholdKey] = (0, import_react.useState)("");
	const [thresholdVal, setThresholdVal] = (0, import_react.useState)("");
	const save = useMutation({
		mutationFn: () => saveFn({ data: cfg }),
		onSuccess: () => {
			toast.success("Platform settings saved");
			qc.invalidateQueries({ queryKey: ["platform-settings"] });
		},
		onError: (e) => toast.error(e.message)
	});
	if (isLoading || !cfg) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, { fields: 4 });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Maintenance mode" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "When on, tenant apps can display a maintenance notice. Reads platform_settings.config.maintenance_mode." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between rounded-lg border border-slate-200 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium text-slate-700",
					children: "Enable maintenance mode"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: cfg.maintenance_mode,
					onCheckedChange: (v) => setCfg({
						...cfg,
						maintenance_mode: v
					})
				})]
			}) })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Feature flags" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Boolean flags any part of the app can read. Toggle to enable or disable a feature platform-wide." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [
					Object.entries(cfg.feature_flags).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "No feature flags yet."
					}),
					Object.entries(cfg.feature_flags).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-lg border border-slate-200 p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-sm font-mono",
							children: k
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: v,
								onCheckedChange: (next) => setCfg({
									...cfg,
									feature_flags: {
										...cfg.feature_flags,
										[k]: next
									}
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => {
									const { [k]: _drop, ...rest } = cfg.feature_flags;
									setCfg({
										...cfg,
										feature_flags: rest
									});
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
							})]
						})]
					}, k)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 pt-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "new_flag_key",
							value: flagKey,
							onChange: (e) => setFlagKey(e.target.value)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "outline",
							onClick: () => {
								const k = flagKey.trim();
								if (!k) return;
								setCfg({
									...cfg,
									feature_flags: {
										...cfg.feature_flags,
										[k]: false
									}
								});
								setFlagKey("");
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-1" }), "Add"]
						})]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Default thresholds" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Baseline numeric thresholds (e.g. spoilage_risk, humidity_alert). Tenants can override in their own settings." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [
					Object.entries(cfg.default_thresholds).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "No default thresholds yet."
					}),
					Object.entries(cfg.default_thresholds).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-sm font-mono flex-1 truncate",
								children: k
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: v,
								onChange: (e) => setCfg({
									...cfg,
									default_thresholds: {
										...cfg.default_thresholds,
										[k]: Number(e.target.value)
									}
								}),
								className: "w-32"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => {
									const { [k]: _drop, ...rest } = cfg.default_thresholds;
									setCfg({
										...cfg,
										default_thresholds: rest
									});
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
							})
						]
					}, k)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 pt-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								placeholder: "threshold_key",
								value: thresholdKey,
								onChange: (e) => setThresholdKey(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								placeholder: "value",
								type: "number",
								value: thresholdVal,
								onChange: (e) => setThresholdVal(e.target.value),
								className: "w-32"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								variant: "outline",
								onClick: () => {
									const k = thresholdKey.trim();
									const n = Number(thresholdVal);
									if (!k || Number.isNaN(n)) return;
									setCfg({
										...cfg,
										default_thresholds: {
											...cfg.default_thresholds,
											[k]: n
										}
									});
									setThresholdKey("");
									setThresholdVal("");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-1" }), "Add"]
							})
						]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => save.mutate(),
					disabled: save.isPending,
					className: "bg-emerald-600 hover:bg-emerald-700",
					children: [save.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4 mr-2" }), "Save platform settings"]
				})
			})
		]
	});
}
//#endregion
export { SettingsPage as component };
