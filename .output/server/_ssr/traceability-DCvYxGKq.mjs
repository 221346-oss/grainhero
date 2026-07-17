import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { $t as CircleCheckBig, Jt as Clock, Lt as Download, Mt as Eye, U as Search, X as QrCode, at as Package, dt as MapPin, ln as Calendar, v as Truck, w as Thermometer, y as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { o as StatsSkeleton, s as TableSkeleton } from "./skeletons-BBw01c0Z.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-BHv1JhlL.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { v as listGrainBatches } from "./operations.functions-CdIfFwmK.mjs";
import { t as QRCodeDisplay } from "./QRCodeDisplay-DmEKwhs9.mjs";
import { t as Skeleton } from "./skeleton-DkMyeRgz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/traceability-DCvYxGKq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function statusBadge(s) {
	switch (s) {
		case "stored": return "bg-emerald-100 text-emerald-800 border-emerald-200";
		case "dispatched": return "bg-blue-100 text-blue-800 border-blue-200";
		case "sold": return "bg-purple-100 text-purple-800 border-purple-200";
		case "damaged": return "bg-red-100 text-red-800 border-red-200";
		case "on_hold": return "bg-amber-100 text-amber-800 border-amber-200";
		default: return "bg-slate-100 text-slate-700 border-slate-200";
	}
}
function riskBadge(r) {
	if (r >= 70) return "bg-red-100 text-red-800 border-red-200";
	if (r >= 40) return "bg-amber-100 text-amber-800 border-amber-200";
	return "bg-emerald-100 text-emerald-800 border-emerald-200";
}
function TraceabilityPage() {
	const fetchBatches = useServerFn(listGrainBatches);
	const { data, isLoading, refetch, isFetching } = useQuery({
		queryKey: ["traceability-batches"],
		queryFn: () => fetchBatches()
	});
	const batches = data ?? [];
	const [search, setSearch] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("all");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [viewOpen, setViewOpen] = (0, import_react.useState)(false);
	const [qrOpen, setQrOpen] = (0, import_react.useState)(false);
	const filtered = (0, import_react.useMemo)(() => {
		return batches.filter((b) => {
			const q = search.toLowerCase();
			const match = (b.batch_id ?? "").toLowerCase().includes(q) || (b.grain_type ?? "").toLowerCase().includes(q) || (b.farmer_name ?? "").toLowerCase().includes(q);
			const s = status === "all" || b.status === status;
			return match && s;
		});
	}, [
		batches,
		search,
		status
	]);
	const exportCSV = () => {
		const headers = "Batch ID,Grain Type,Quantity (kg),Status,Risk Score,Spoilage,Silo,Farmer,Intake Date\n";
		const rows = batches.map((b) => {
			const silo = b.silos?.name ?? "N/A";
			return [
				b.batch_id,
				b.grain_type,
				b.quantity_kg,
				b.status,
				b.risk_score,
				b.spoilage_label,
				silo,
				b.farmer_name ?? "N/A",
				b.intake_date ? new Date(b.intake_date).toLocaleDateString() : ""
			].map((c) => `"${String(c ?? "")}"`).join(",");
		}).join("\n");
		const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `grain-traceability-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Traceability report exported");
	};
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-64" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-96 max-w-full" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsSkeleton, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableSkeleton, {
				rows: 8,
				cols: 5
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl sm:text-3xl font-black tracking-tight text-slate-900",
						children: "Grain Traceability"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-500 mt-1",
						children: "Complete supply chain tracking from farm to market"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => refetch(),
						disabled: isFetching,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4 mr-2" }), " Refresh"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						className: "bg-emerald-600 hover:bg-emerald-700",
						onClick: exportCSV,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-2" }), " Export CSV"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 grid-cols-2 lg:grid-cols-4",
				children: [
					{
						label: "Total Batches",
						val: batches.length,
						icon: Package,
						color: "text-emerald-600"
					},
					{
						label: "Stored",
						val: batches.filter((b) => b.status === "stored").length,
						icon: CircleCheckBig,
						color: "text-emerald-600"
					},
					{
						label: "Dispatched",
						val: batches.filter((b) => b.status === "dispatched").length,
						icon: Truck,
						color: "text-blue-600"
					},
					{
						label: "High Risk",
						val: batches.filter((b) => (b.risk_score ?? 0) >= 70).length,
						icon: TriangleAlert,
						color: "text-red-600"
					}
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-4 sm:p-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs sm:text-sm font-medium text-slate-600",
								children: s.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold text-slate-900",
								children: s.val
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: `h-6 w-6 sm:h-8 sm:w-8 shrink-0 ${s.color}` })]
					})
				}) }, s.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col md:flex-row gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "Batch ID, grain type, or farmer name…",
							value: search,
							onChange: (e) => setSearch(e.target.value),
							className: "pl-10"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: status,
						onValueChange: setStatus,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-full md:w-[180px]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Filter by status" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "stored",
								children: "Stored"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "dispatched",
								children: "Dispatched"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "sold",
								children: "Sold"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "damaged",
								children: "Damaged"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "on_hold",
								children: "On Hold"
							})
						] })]
					})]
				})
			}) }),
			filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "p-12 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-12 w-12 mx-auto mb-4 text-slate-400" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-lg font-medium text-slate-900 mb-2",
						children: "No batches found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-slate-600",
						children: "Try adjusting your search criteria or filters."
					})
				]
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
				children: filtered.map((batch) => {
					const silo = batch.silos ?? null;
					const dispatch = batch.dispatch_details ?? null;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "hover:shadow-lg transition-shadow cursor-pointer",
						onClick: () => {
							setSelected(batch);
							setViewOpen(true);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
							className: "pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
									className: "text-base truncate",
									children: batch.batch_id
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: statusBadge(batch.status),
									children: (batch.status ?? "").charAt(0).toUpperCase() + (batch.status ?? "").slice(1)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: batch.grain_type })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between p-3 bg-slate-50 rounded-lg",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "h-4 w-4 text-slate-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm text-slate-600",
											children: "QR Code"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										onClick: (e) => {
											e.stopPropagation();
											setSelected(batch);
											setQrOpen(true);
										},
										children: "View QR"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm text-slate-600",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-slate-400" }), silo?.name ?? "No location"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm text-slate-600",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-4 w-4 text-slate-400" }),
										Number(batch.quantity_kg).toLocaleString(),
										" kg"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4 text-slate-400" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-slate-600",
											children: "Risk:"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											className: riskBadge(Number(batch.risk_score ?? 0)),
											children: [
												batch.spoilage_label,
												" (",
												Number(batch.risk_score ?? 0),
												"%)"
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm text-slate-600",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-4 w-4 text-slate-400" }),
										"Intake: ",
										batch.intake_date ? new Date(batch.intake_date).toLocaleDateString() : "—"
									]
								}),
								dispatch?.buyer_name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 p-2 bg-blue-50 rounded text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-4 w-4 text-blue-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-blue-800 truncate",
										children: ["Dispatched to: ", dispatch.buyer_name]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									className: "w-full mt-2",
									onClick: (e) => {
										e.stopPropagation();
										setSelected(batch);
										setViewOpen(true);
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4 mr-2" }), " View Full History"]
								})
							]
						})]
					}, batch.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: viewOpen,
				onOpenChange: setViewOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-w-3xl max-h-[90vh] overflow-y-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "flex items-center gap-2 text-emerald-700",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-5 w-5" }), " Complete Traceability History"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: ["Full supply chain traceability for batch ", selected?.batch_id] })] }), selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineBody, { batch: selected })]
				})
			}),
			selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QRCodeDisplay, {
				qrCode: selected.qr_code || "",
				batchId: selected.batch_id,
				grainType: selected.grain_type,
				isOpen: qrOpen,
				onClose: () => setQrOpen(false)
			})
		]
	});
}
function TimelineBody({ batch }) {
	const silo = batch.silos ?? null;
	const dispatch = batch.dispatch_details ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-4 space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "border-emerald-500 bg-emerald-50",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "p-4 flex items-center gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-10 w-10 text-emerald-600 shrink-0" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "font-semibold text-emerald-900",
								children: batch.batch_id
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-emerald-700 truncate",
								children: [
									batch.grain_type,
									" • ",
									Number(batch.quantity_kg).toLocaleString(),
									" kg"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-emerald-700/80",
								children: [
									"Grade: ",
									batch.grade ?? "N/A",
									" • Variety: ",
									batch.variety ?? "N/A"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						className: statusBadge(batch.status),
						children: (batch.status ?? "").charAt(0).toUpperCase() + (batch.status ?? "").slice(1)
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
			className: "pb-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-base flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4" }), " Supply Chain Timeline"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineStep, {
					color: "blue",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-5 w-5 text-white" }),
					title: "Farm Intake",
					date: batch.intake_date,
					desc: `Received from farm`,
					items: [
						["Farmer", batch.farmer_name ?? "N/A"],
						["Contact", batch.farmer_contact ?? "N/A"],
						["Quantity", `${Number(batch.quantity_kg).toLocaleString()} kg`],
						["Harvest", batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString() : "N/A"]
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineStep, {
					color: "emerald",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thermometer, { className: "h-5 w-5 text-white" }),
					title: "Quality Assessment",
					date: batch.intake_date,
					desc: "Pre-storage quality testing",
					items: [
						["Moisture", `${batch.moisture_content ?? "N/A"}%`],
						["Grade", batch.grade ?? "N/A"],
						["Variety", batch.variety ?? "N/A"],
						["Status", "Quality Approved"]
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineStep, {
					color: "purple",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-5 w-5 text-white" }),
					title: "Storage Assignment",
					date: batch.intake_date,
					desc: "Assigned to storage facility",
					items: [
						["Silo", silo?.name ?? "N/A"],
						["Capacity", silo?.capacity_kg ? `${Number(silo.capacity_kg).toLocaleString()} kg` : "N/A"],
						["Status", "Stored"],
						["Monitoring", "Active"]
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineStep, {
					color: "amber",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-5 w-5 text-white" }),
					title: "Risk Assessment",
					date: batch.last_risk_assessment ?? batch.intake_date,
					desc: "AI-powered spoilage risk evaluation",
					items: [
						["Risk Level", batch.spoilage_label ?? "N/A"],
						["Risk Score", `${Number(batch.risk_score ?? 0)}%`],
						["Assessment", (batch.risk_score ?? 0) >= 70 ? "High" : (batch.risk_score ?? 0) >= 40 ? "Medium" : "Low"],
						["Confidence", `${Number(batch.ai_prediction_confidence ?? 0)}%`]
					]
				}),
				batch.status === "dispatched" && dispatch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineStep, {
					color: "emerald",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-5 w-5 text-white" }),
					title: "Batch Dispatch",
					date: dispatch.dispatch_date ?? batch.actual_dispatch_date,
					desc: "Dispatched to buyer",
					items: [
						["Buyer", dispatch.buyer_name ?? "N/A"],
						["Contact", dispatch.buyer_contact ?? "N/A"],
						["Quantity", dispatch.quantity ? `${dispatch.quantity} kg` : "N/A"],
						["Status", "Delivered"]
					],
					notes: dispatch.notes
				}) : batch.status !== "dispatched" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center shrink-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-5 w-5 text-white" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "font-medium text-slate-700",
						children: "Pending Dispatch"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-600",
						children: "Batch is ready for dispatch"
					})] })]
				}),
				batch.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-3 bg-slate-50 rounded-lg border border-slate-200",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "font-medium text-slate-700 mb-1",
						children: "Notes"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-600",
						children: batch.notes
					})]
				})
			]
		})] })]
	});
}
function TimelineStep({ color, icon, title, date, desc, items, notes }) {
	const bgMap = {
		blue: "bg-blue-50 border-blue-200",
		emerald: "bg-emerald-50 border-emerald-200",
		purple: "bg-purple-50 border-purple-200",
		amber: "bg-amber-50 border-amber-200"
	}[color];
	const nodeMap = {
		blue: "bg-blue-600",
		emerald: "bg-emerald-600",
		purple: "bg-purple-600",
		amber: "bg-amber-600"
	}[color];
	const textMap = {
		blue: "text-blue-900",
		emerald: "text-emerald-900",
		purple: "text-purple-900",
		amber: "text-amber-900"
	}[color];
	const subMap = {
		blue: "text-blue-700",
		emerald: "text-emerald-700",
		purple: "text-purple-700",
		amber: "text-amber-700"
	}[color];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex items-start gap-3 p-3 rounded-lg border ${bgMap}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${nodeMap}`,
			children: icon
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 min-w-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 flex-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: `font-medium ${textMap}`,
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `text-xs ${subMap}`,
						children: date ? new Date(date).toLocaleDateString() : ""
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `text-sm ${subMap}`,
					children: desc
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-2 mt-2",
					children: items.map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `text-xs ${subMap}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-medium",
								children: [k, ":"]
							}),
							" ",
							v
						]
					}, k))
				}),
				notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 p-2 bg-white/70 rounded text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: "Notes:"
						}),
						" ",
						notes
					]
				})
			]
		})]
	});
}
//#endregion
export { TraceabilityPage as component };
