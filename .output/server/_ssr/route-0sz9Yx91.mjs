import { o as __toESM } from "../_runtime.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime, M as Slot, d as DialogContent, f as DialogDescription, h as DialogTitle, l as Dialog, m as DialogPortal, p as DialogOverlay, u as DialogClose } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { t as supabase } from "./client-CrfNFjZ6.mjs";
import { B as Settings, Bt as CreditCard, Ht as CornerDownLeft, I as Shield, P as Smartphone, Pt as Ellipsis, R as ShieldCheck, Rt as DollarSign, Sn as Activity, U as Search, Ut as Command, V as Server, Vt as Cpu, W as ScrollText, X as QrCode, Yt as ClipboardList, at as Package, b as TrendingUp, bn as ArrowRight, c as Warehouse, d as Users, dn as Building2, h as UserCog, hn as Bell, kt as FileChartColumnIncreasing, m as UserPlus, n as X, ot as OctagonAlert, pn as Brain, pt as LogOut, r as Wrench, rt as PanelLeft, sn as ChartColumn, t as Zap, vt as LayoutDashboard } from "../_libs/lucide-react.mjs";
import { OnboardingTour } from "./OnboardingTour-xcIr4REW.mjs";
import { _ as useNavigate, f as Outlet, g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { i as Trigger, n as Portal, r as Root2, t as Content2 } from "../_libs/@radix-ui/react-popover+[...].mjs";
import { i as useQueryClient, n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as getMyRole } from "./roles.functions-DsCBlTtJ.mjs";
import { a as trackLoginAndAdvance } from "./hubspot.functions-XOaLLP_6.mjs";
import { t as Separator } from "./separator-CUD9g08h.mjs";
import { n as getImpersonationSession, t as ImpersonationBanner } from "./ImpersonationBanner-C2ZVGIRH.mjs";
import { t as countPendingOrders } from "./hardware-orders.functions-cPlHFJSi.mjs";
import { t as Skeleton } from "./skeleton-DkMyeRgz.mjs";
import { a as useMyProfile, i as initialsOf, n as applyTheme, r as getStoredTheme } from "./useMyProfile-B74TGC27.mjs";
import { a as Trigger$1, i as Root3, n as Portal$1, r as Provider, t as Content2$1 } from "../_libs/radix-ui__react-tooltip.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/route-0sz9Yx91.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MOBILE_BREAKPOINT = 768;
function useIsMobile() {
	const [isMobile, setIsMobile] = import_react.useState(void 0);
	import_react.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return () => mql.removeEventListener("change", onChange);
	}, []);
	return !!isMobile;
}
var Sheet = Dialog;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = DialogDescription.displayName;
var TooltipProvider = Provider;
var Tooltip = Root3;
var TooltipTrigger = Trigger$1;
var TooltipContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal$1, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
	ref,
	sideOffset,
	className: cn("z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)", className),
	...props
}) }));
TooltipContent.displayName = Content2$1.displayName;
var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 3600 * 24 * 7;
var SIDEBAR_WIDTH = "16rem";
var SIDEBAR_WIDTH_MOBILE = "18rem";
var SIDEBAR_WIDTH_ICON = "3rem";
var SIDEBAR_KEYBOARD_SHORTCUT = "b";
var SidebarContext = import_react.createContext(null);
function useSidebar() {
	const context = import_react.useContext(SidebarContext);
	if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
	return context;
}
var SidebarProvider = import_react.forwardRef(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = import_react.useState(false);
	const [_open, _setOpen] = import_react.useState(defaultOpen);
	const open = openProp ?? _open;
	const setOpen = import_react.useCallback((value) => {
		const openState = typeof value === "function" ? value(open) : value;
		if (setOpenProp) setOpenProp(openState);
		else _setOpen(openState);
		document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
	}, [setOpenProp, open]);
	const toggleSidebar = import_react.useCallback(() => {
		return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
	}, [
		isMobile,
		setOpen,
		setOpenMobile
	]);
	import_react.useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				toggleSidebar();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toggleSidebar]);
	const state = open ? "expanded" : "collapsed";
	const contextValue = import_react.useMemo(() => ({
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar
	}), [
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarContext.Provider, {
		value: contextValue,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, {
			delayDuration: 0,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					"--sidebar-width": SIDEBAR_WIDTH,
					"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
					...style
				},
				className: cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className),
				ref,
				...props,
				children
			})
		})
	});
});
SidebarProvider.displayName = "SidebarProvider";
var Sidebar = import_react.forwardRef(({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
	if (collapsible === "none") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", className),
		ref,
		...props,
		children
	});
	if (isMobile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open: openMobile,
		onOpenChange: setOpenMobile,
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
			"data-sidebar": "sidebar",
			"data-mobile": "true",
			className: "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
			style: { "--sidebar-width": SIDEBAR_WIDTH_MOBILE },
			side,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetHeader, {
				className: "sr-only",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, { children: "Sidebar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetDescription, { children: "Displays the mobile sidebar." })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-full w-full flex-col",
				children
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "group peer hidden text-sidebar-foreground md:block",
		"data-state": state,
		"data-collapsible": state === "collapsed" ? collapsible : "",
		"data-variant": variant,
		"data-side": side,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex", side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]", variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l", className),
			...props,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-sidebar": "sidebar",
				className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow",
				children
			})
		})]
	});
});
Sidebar.displayName = "Sidebar";
var SidebarTrigger = import_react.forwardRef(({ className, onClick, ...props }, ref) => {
	const { toggleSidebar } = useSidebar();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		ref,
		"data-sidebar": "trigger",
		variant: "ghost",
		size: "icon",
		className: cn("h-7 w-7", className),
		onClick: (event) => {
			onClick?.(event);
			toggleSidebar();
		},
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeft, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Toggle Sidebar"
		})]
	});
});
SidebarTrigger.displayName = "SidebarTrigger";
var SidebarRail = import_react.forwardRef(({ className, ...props }, ref) => {
	const { toggleSidebar } = useSidebar();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		ref,
		"data-sidebar": "rail",
		"aria-label": "Toggle Sidebar",
		tabIndex: -1,
		onClick: toggleSidebar,
		title: "Toggle Sidebar",
		className: cn("absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex", "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize", "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize", "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar", "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2", "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2", className),
		...props
	});
});
SidebarRail.displayName = "SidebarRail";
var SidebarInset = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		ref,
		className: cn("relative flex w-full flex-1 flex-col bg-background", "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow", className),
		...props
	});
});
SidebarInset.displayName = "SidebarInset";
var SidebarInput = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
		ref,
		"data-sidebar": "input",
		className: cn("h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", className),
		...props
	});
});
SidebarInput.displayName = "SidebarInput";
var SidebarHeader = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "header",
		className: cn("flex flex-col gap-2 p-2", className),
		...props
	});
});
SidebarHeader.displayName = "SidebarHeader";
var SidebarFooter = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "footer",
		className: cn("flex flex-col gap-2 p-2", className),
		...props
	});
});
SidebarFooter.displayName = "SidebarFooter";
var SidebarSeparator = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
		ref,
		"data-sidebar": "separator",
		className: cn("mx-2 w-auto bg-sidebar-border", className),
		...props
	});
});
SidebarSeparator.displayName = "SidebarSeparator";
var SidebarContent = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "content",
		className: cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden no-scrollbar", className),
		...props
	});
});
SidebarContent.displayName = "SidebarContent";
var SidebarGroup = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "group",
		className: cn("relative flex w-full min-w-0 flex-col p-2", className),
		...props
	});
});
SidebarGroup.displayName = "SidebarGroup";
var SidebarGroupLabel = import_react.forwardRef(({ className, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "div", {
		ref,
		"data-sidebar": "group-label",
		className: cn("flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className),
		...props
	});
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";
var SidebarGroupAction = import_react.forwardRef(({ className, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		ref,
		"data-sidebar": "group-action",
		className: cn("absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "after:absolute after:-inset-2 after:md:hidden", "group-data-[collapsible=icon]:hidden", className),
		...props
	});
});
SidebarGroupAction.displayName = "SidebarGroupAction";
var SidebarGroupContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	"data-sidebar": "group-content",
	className: cn("w-full text-sm", className),
	...props
}));
SidebarGroupContent.displayName = "SidebarGroupContent";
var SidebarMenu = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
	ref,
	"data-sidebar": "menu",
	className: cn("flex w-full min-w-0 flex-col gap-1", className),
	...props
}));
SidebarMenu.displayName = "SidebarMenu";
var SidebarMenuItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
	ref,
	"data-sidebar": "menu-item",
	className: cn("group/menu-item relative", className),
	...props
}));
SidebarMenuItem.displayName = "SidebarMenuItem";
var sidebarMenuButtonVariants = cva("peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring cursor-pointer transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0", {
	variants: {
		variant: {
			default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
			outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
		},
		size: {
			default: "h-8 text-sm",
			sm: "h-7 text-xs",
			lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var SidebarMenuButton = import_react.forwardRef(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
	const Comp = asChild ? Slot : "button";
	const { isMobile, state } = useSidebar();
	const button = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Comp, {
		ref,
		"data-sidebar": "menu-button",
		"data-size": size,
		"data-active": isActive,
		className: cn(sidebarMenuButtonVariants({
			variant,
			size
		}), className),
		...props
	});
	if (!tooltip) return button;
	if (typeof tooltip === "string") tooltip = { children: tooltip };
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: button
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
		side: "right",
		align: "center",
		hidden: state !== "collapsed" || isMobile,
		...tooltip
	})] });
});
SidebarMenuButton.displayName = "SidebarMenuButton";
var SidebarMenuAction = import_react.forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		ref,
		"data-sidebar": "menu-action",
		className: cn("absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0", "after:absolute after:-inset-2 after:md:hidden", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=default]/menu-button:top-1.5", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0", className),
		...props
	});
});
SidebarMenuAction.displayName = "SidebarMenuAction";
var SidebarMenuBadge = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	"data-sidebar": "menu-badge",
	className: cn("pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground", "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=default]/menu-button:top-1.5", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", className),
	...props
}));
SidebarMenuBadge.displayName = "SidebarMenuBadge";
var SidebarMenuSkeleton = import_react.forwardRef(({ className, showIcon = false, ...props }, ref) => {
	const width = import_react.useMemo(() => {
		return `${Math.floor(Math.random() * 40) + 50}%`;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		"data-sidebar": "menu-skeleton",
		className: cn("flex h-8 items-center gap-2 rounded-md px-2", className),
		...props,
		children: [showIcon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
			className: "size-4 rounded-md",
			"data-sidebar": "menu-skeleton-icon"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
			className: "h-4 max-w-(--skeleton-width) flex-1",
			"data-sidebar": "menu-skeleton-text",
			style: { "--skeleton-width": width }
		})]
	});
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";
var SidebarMenuSub = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
	ref,
	"data-sidebar": "menu-sub",
	className: cn("mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5", "group-data-[collapsible=icon]:hidden", className),
	...props
}));
SidebarMenuSub.displayName = "SidebarMenuSub";
var SidebarMenuSubItem = import_react.forwardRef(({ ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
	ref,
	...props
}));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";
var SidebarMenuSubButton = import_react.forwardRef(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "a", {
		ref,
		"data-sidebar": "menu-sub-button",
		"data-size": size,
		"data-active": isActive,
		className: cn("flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground", "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground", size === "sm" && "text-xs", size === "md" && "text-sm", "group-data-[collapsible=icon]:hidden", className),
		...props
	});
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";
var NAV_TARGETS = [
	{
		label: "Dashboard",
		to: "/dashboard",
		group: "Home",
		keywords: "home overview"
	},
	{
		label: "Grain Batches",
		to: "/grain-batches",
		group: "Operations",
		keywords: "lots inventory"
	},
	{
		label: "Silos",
		to: "/silos",
		group: "Operations"
	},
	{
		label: "Warehouses",
		to: "/warehouses",
		group: "Operations"
	},
	{
		label: "Sensors",
		to: "/sensors",
		group: "Operations",
		keywords: "iot devices"
	},
	{
		label: "Actuators",
		to: "/actuators",
		group: "Operations",
		keywords: "iot control"
	},
	{
		label: "Alerts",
		to: "/grain-alerts",
		group: "Operations"
	},
	{
		label: "Incidents",
		to: "/incidents",
		group: "Operations"
	},
	{
		label: "Maintenance",
		to: "/maintenance",
		group: "Operations"
	},
	{
		label: "Environmental",
		to: "/environmental",
		group: "Operations",
		keywords: "climate weather"
	},
	{
		label: "AI Predictions",
		to: "/ai-predictions",
		group: "Insights"
	},
	{
		label: "Analytics",
		to: "/analytics",
		group: "Insights"
	},
	{
		label: "Reports",
		to: "/reports",
		group: "Insights"
	},
	{
		label: "ML Models",
		to: "/ml-models",
		group: "Insights"
	},
	{
		label: "Data Visualization",
		to: "/data-visualization",
		group: "Insights",
		keywords: "charts graphs"
	},
	{
		label: "Traceability",
		to: "/traceability",
		group: "Insights"
	},
	{
		label: "Notifications",
		to: "/notifications",
		group: "Insights"
	},
	{
		label: "Activity Logs",
		to: "/activity-logs",
		group: "Insights",
		keywords: "audit history"
	},
	{
		label: "Buyers",
		to: "/buyers",
		group: "Business",
		keywords: "customers"
	},
	{
		label: "Orders",
		to: "/orders",
		group: "Business",
		keywords: "hardware install"
	},
	{
		label: "Revenue",
		to: "/revenue",
		group: "Business",
		keywords: "income"
	},
	{
		label: "Subscription",
		to: "/subscription",
		group: "Business"
	},
	{
		label: "Plans",
		to: "/plans",
		group: "Business",
		keywords: "pricing"
	},
	{
		label: "Insurance",
		to: "/insurance",
		group: "Business"
	},
	{
		label: "Team",
		to: "/team-management",
		group: "Admin",
		keywords: "members users"
	},
	{
		label: "Security Center",
		to: "/security-center",
		group: "Admin"
	},
	{
		label: "Server Monitoring",
		to: "/server-monitoring",
		group: "Admin"
	},
	{
		label: "Settings",
		to: "/settings",
		group: "Admin"
	},
	{
		label: "Platform · Tenants",
		to: "/platform/tenants",
		group: "Platform"
	},
	{
		label: "Platform · Users & roles",
		to: "/platform/users",
		group: "Platform"
	},
	{
		label: "Platform · Plans & pricing",
		to: "/platform/plans",
		group: "Platform"
	},
	{
		label: "Platform · Revenue",
		to: "/revenue",
		group: "Platform"
	},
	{
		label: "Platform · Pipeline",
		to: "/platform/pipeline",
		group: "Platform",
		keywords: "hubspot leads"
	},
	{
		label: "Platform · Leads",
		to: "/platform/leads",
		group: "Platform"
	},
	{
		label: "Platform · Install orders",
		to: "/platform/orders",
		group: "Platform",
		keywords: "hardware"
	},
	{
		label: "Platform · Health",
		to: "/platform/health",
		group: "Platform"
	},
	{
		label: "Platform · Audit logs",
		to: "/platform/audit-logs",
		group: "Platform"
	},
	{
		label: "Platform · System logs",
		to: "/platform/logs",
		group: "Platform"
	}
];
var PAGE_LABELS = {
	"/grain-batches": "batches",
	"/silos": "silos",
	"/sensors": "sensors",
	"/actuators": "actuators",
	"/warehouses": "warehouses",
	"/grain-alerts": "alerts",
	"/buyers": "buyers",
	"/incidents": "incidents",
	"/maintenance": "maintenance tasks",
	"/team-management": "team members",
	"/notifications": "notifications",
	"/orders": "orders",
	"/activity-logs": "activity",
	"/reports": "reports",
	"/plans": "plans",
	"/insurance": "policies",
	"/subscription": "your subscription",
	"/environmental": "environmental readings",
	"/traceability": "batch traceability",
	"/analytics": "analytics",
	"/ai-predictions": "predictions",
	"/ml-models": "models",
	"/data-visualization": "visualisations",
	"/security-center": "security events",
	"/server-monitoring": "server metrics",
	"/revenue": "revenue records",
	"/settings": "settings"
};
function scopeFor(pathname) {
	if (pathname === "/dashboard" || pathname.startsWith("/platform")) return {
		global: true,
		label: pathname === "/dashboard" ? "Global search" : "Platform search"
	};
	const key = Object.keys(PAGE_LABELS).find((k) => pathname.startsWith(k));
	return {
		global: false,
		label: key ? `Search ${PAGE_LABELS[key]} on this page` : "Search this page"
	};
}
function AppSearch() {
	const pathname = useRouterState({ select: (r) => r.location.pathname });
	const navigate = useNavigate();
	const inputRef = (0, import_react.useRef)(null);
	const [q, setQ] = (0, import_react.useState)("");
	const [open, setOpen] = (0, import_react.useState)(false);
	const [highlight, setHighlight] = (0, import_react.useState)(0);
	const scope = (0, import_react.useMemo)(() => scopeFor(pathname), [pathname]);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const t = e.target;
			const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
			if (e.key === "/" && !typing || (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			}
			if (e.key === "Escape") {
				inputRef.current?.blur();
				setOpen(false);
				setQ("");
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	(0, import_react.useEffect)(() => {
		if (scope.global) return;
		window.__appSearch = q;
		window.dispatchEvent(new CustomEvent("app:search", { detail: q }));
	}, [q, scope.global]);
	(0, import_react.useEffect)(() => {
		setQ("");
		setOpen(false);
		setHighlight(0);
	}, [pathname]);
	const matches = (0, import_react.useMemo)(() => {
		if (!scope.global || !q.trim()) return [];
		const needle = q.trim().toLowerCase();
		return NAV_TARGETS.filter((t) => t.label.toLowerCase().includes(needle) || t.group.toLowerCase().includes(needle) || (t.keywords ?? "").toLowerCase().includes(needle)).slice(0, 10);
	}, [q, scope.global]);
	(0, import_react.useEffect)(() => {
		setHighlight(0);
	}, [q]);
	const onInputKeyDown = (e) => {
		if (!scope.global) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			setHighlight((h) => matches.length ? (h + 1) % matches.length : 0);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setOpen(true);
			setHighlight((h) => matches.length ? (h - 1 + matches.length) % matches.length : 0);
		} else if (e.key === "Enter") {
			const target = matches[highlight] ?? matches[0];
			if (target) {
				e.preventDefault();
				setOpen(false);
				setQ("");
				navigate({ to: target.to });
			}
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative w-full",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: inputRef,
				type: "search",
				value: q,
				onChange: (e) => setQ(e.target.value),
				onFocus: () => setOpen(true),
				onBlur: () => setTimeout(() => setOpen(false), 150),
				onKeyDown: onInputKeyDown,
				placeholder: scope.global ? "Search anything or jump to a page…" : scope.label,
				"aria-label": scope.label,
				className: cn("w-full h-9 pl-9 pr-16 rounded-full text-sm bg-muted/60 hover:bg-muted focus:bg-background", "border border-transparent focus:border-[--fusion-grape]/50 focus:outline-none transition placeholder:text-muted-foreground")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("kbd", {
				className: "hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Command, { className: "h-2.5 w-2.5" }), "K"]
			}),
			open && scope.global && q.trim() && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-background shadow-lg overflow-hidden z-40",
				children: matches.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-4 text-sm text-muted-foreground",
					children: "No matching pages."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "max-h-80 overflow-y-auto",
					children: matches.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: m.to,
						onMouseDown: (e) => e.preventDefault(),
						onMouseEnter: () => setHighlight(i),
						onClick: () => {
							setOpen(false);
							setQ("");
						},
						className: cn("flex items-center gap-3 px-3 py-2 text-sm", i === highlight ? "bg-muted" : "hover:bg-muted/60"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex-1",
								children: m.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] uppercase tracking-widest text-muted-foreground",
								children: m.group
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3.5 w-3.5 text-muted-foreground" })
						]
					}) }, m.to))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3 px-3 py-1.5 border-t border-border bg-muted/40 text-[10px] text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
								className: "rounded border border-border/60 px-1",
								children: "↑"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
								className: "rounded border border-border/60 px-1",
								children: "↓"
							}),
							" navigate"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CornerDownLeft, { className: "h-3 w-3" }),
							" open · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
								className: "rounded border border-border/60 px-1",
								children: "esc"
							}),
							" close"
						]
					})]
				})] })
			}),
			open && !scope.global && q.trim() && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-background shadow-lg z-40 p-3 text-xs text-muted-foreground",
				children: [
					"Filtering this page by ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-semibold text-foreground",
						children: [
							"\"",
							q,
							"\""
						]
					}),
					". Press",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onMouseDown: (e) => e.preventDefault(),
						onClick: () => navigate({ to: "/dashboard" }),
						className: "ml-1 text-[#00a63e] hover:underline",
						children: "search everywhere"
					}),
					" ",
					"to jump to global search."
				]
			})
		]
	});
}
var Popover = Root2;
var PopoverTrigger = Trigger;
var PopoverContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = Content2.displayName;
var pinnedNav = [
	{
		name: "dashboard",
		label: "Home",
		to: "/dashboard",
		icon: LayoutDashboard,
		roles: [
			"super_admin",
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "grain-batches",
		label: "Batches",
		to: "/grain-batches",
		icon: Package,
		roles: [
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "silos",
		label: "Silos",
		to: "/silos",
		icon: Warehouse,
		roles: [
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "sensors",
		label: "Sensors",
		to: "/sensors",
		icon: Smartphone,
		roles: [
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "actuators",
		label: "Actuators",
		to: "/actuators",
		icon: Zap,
		roles: [
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "grain-alerts",
		label: "Alerts",
		to: "/grain-alerts",
		icon: OctagonAlert,
		roles: [
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "ai-predictions",
		label: "AI Predictions",
		to: "/ai-predictions",
		icon: Brain,
		roles: ["admin", "manager"],
		badge: "AI"
	},
	{
		name: "analytics",
		label: "Analytics",
		to: "/analytics",
		icon: ChartColumn,
		roles: ["admin", "manager"]
	},
	{
		name: "activity-logs",
		label: "Activity Logs",
		to: "/activity-logs",
		icon: ClipboardList,
		roles: [
			"super_admin",
			"admin",
			"manager"
		]
	},
	{
		name: "warehouses",
		label: "Warehouses",
		to: "/warehouses",
		icon: Building2,
		roles: [
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "buyers",
		label: "Buyers",
		to: "/buyers",
		icon: Users,
		roles: ["admin", "manager"]
	},
	{
		name: "revenue",
		label: "Revenue",
		to: "/revenue",
		icon: DollarSign,
		roles: [
			"super_admin",
			"admin",
			"manager"
		]
	},
	{
		name: "platform-orders",
		label: "Install Orders",
		to: "/platform/orders",
		icon: Package,
		roles: ["super_admin"]
	}
];
var moreGroups = [
	{
		label: "Insights",
		items: [
			{
				name: "environmental",
				label: "Environmental",
				to: "/environmental",
				icon: Activity,
				roles: [
					"admin",
					"manager",
					"technician"
				]
			},
			{
				name: "incidents",
				label: "Incidents",
				to: "/incidents",
				icon: OctagonAlert,
				roles: [
					"admin",
					"manager",
					"technician"
				]
			},
			{
				name: "maintenance",
				label: "Maintenance",
				to: "/maintenance",
				icon: Wrench,
				roles: [
					"admin",
					"manager",
					"technician"
				]
			},
			{
				name: "server-monitoring",
				label: "Device Health",
				to: "/server-monitoring",
				icon: Server,
				roles: [
					"admin",
					"manager",
					"technician"
				]
			},
			{
				name: "data-visualization",
				label: "Data Visualization",
				to: "/data-visualization",
				icon: Activity,
				roles: [
					"admin",
					"manager",
					"technician"
				]
			},
			{
				name: "reports",
				label: "Reports",
				to: "/reports",
				icon: FileChartColumnIncreasing,
				roles: ["admin", "manager"]
			},
			{
				name: "ml-models",
				label: "ML Models",
				to: "/ml-models",
				icon: Cpu,
				roles: ["admin"],
				badge: "ML"
			},
			{
				name: "traceability",
				label: "Traceability",
				to: "/traceability",
				icon: QrCode,
				roles: [
					"admin",
					"manager",
					"technician"
				]
			},
			{
				name: "notifications",
				label: "Notifications",
				to: "/notifications",
				icon: Bell,
				roles: [
					"admin",
					"manager",
					"technician"
				]
			}
		]
	},
	{
		label: "Business",
		items: [
			{
				name: "revenue",
				label: "Revenue",
				to: "/revenue",
				icon: DollarSign,
				roles: [
					"super_admin",
					"admin",
					"manager"
				]
			},
			{
				name: "insurance",
				label: "Insurance",
				to: "/insurance",
				icon: Shield,
				roles: [
					"super_admin",
					"admin",
					"manager"
				]
			},
			{
				name: "subscription",
				label: "Subscription",
				to: "/subscription",
				icon: CreditCard,
				roles: ["super_admin", "admin"]
			}
		]
	},
	{
		label: "Platform",
		items: [
			{
				name: "platform-tenants",
				label: "Tenants",
				to: "/platform/tenants",
				icon: Building2,
				roles: ["super_admin"]
			},
			{
				name: "platform-users",
				label: "Users",
				to: "/platform/users",
				icon: Users,
				roles: ["super_admin"]
			},
			{
				name: "platform-pipeline",
				label: "Pipeline",
				to: "/platform/pipeline",
				icon: TrendingUp,
				roles: ["super_admin"]
			},
			{
				name: "platform-leads",
				label: "Leads",
				to: "/platform/leads",
				icon: UserPlus,
				roles: ["super_admin"]
			},
			{
				name: "platform-health",
				label: "System Health",
				to: "/platform/health",
				icon: Activity,
				roles: ["super_admin"]
			},
			{
				name: "platform-audit",
				label: "Audit Logs",
				to: "/platform/audit-logs",
				icon: ScrollText,
				roles: ["super_admin"]
			},
			{
				name: "platform-logs",
				label: "System Logs",
				to: "/platform/logs",
				icon: ClipboardList,
				roles: ["super_admin"]
			}
		]
	}
];
var bottomNav = [
	{
		name: "team-management",
		label: "Team",
		to: "/team-management",
		icon: UserCog,
		roles: [
			"super_admin",
			"admin",
			"manager",
			"technician"
		]
	},
	{
		name: "security-center",
		label: "Security",
		to: "/security-center",
		icon: ShieldCheck,
		roles: ["super_admin", "admin"]
	},
	{
		name: "settings",
		label: "Settings",
		to: "/settings",
		icon: Settings,
		roles: [
			"super_admin",
			"admin",
			"manager",
			"technician"
		]
	}
];
function NavRow({ item, active, collapsed }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuButton, {
		asChild: true,
		isActive: active,
		tooltip: item.label,
		className: cn("h-9 rounded-lg transition-all", collapsed && "justify-center px-0", active ? "bg-[--fusion-mint] text-[--fusion-ink] font-semibold shadow-sm hover:bg-[--fusion-mint] hover:text-[--fusion-ink]" : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: item.to,
			"data-tour": `nav-${item.name}`,
			className: "flex items-center gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
					className: cn("shrink-0 transition-transform duration-200", active ? "h-[18px] w-[18px] scale-110" : "h-4 w-4 group-hover/menu-item:scale-110"),
					strokeWidth: active ? 2.6 : 2
				}),
				!collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate text-[13px]",
					children: item.label
				}),
				!collapsed && item.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					className: cn("ml-auto text-[9px] px-1.5 py-0 h-4 font-black tracking-wide border-0", item.badge === "AI" || item.badge === "ML" ? "bg-[--fusion-grape] text-white" : "bg-[--fusion-ink]/10 text-[--fusion-ink]"),
					children: item.badge
				})
			]
		})
	}) });
}
function Section({ label, items, role, currentPath, showLabel = true }) {
	const { state, isMobile } = useSidebar();
	const collapsed = !isMobile && state === "collapsed";
	const visible = items.filter((i) => i.roles.includes(role));
	if (visible.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarGroup, {
		className: cn(collapsed && "px-0 items-center"),
		children: [!collapsed && showLabel && label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarGroupLabel, {
			className: "text-[10px] font-black text-sidebar-foreground/55 uppercase tracking-[0.18em] px-2",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarGroupContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenu, {
			className: cn(collapsed && "items-center gap-1"),
			children: visible.map((item) => {
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavRow, {
					item,
					active: item.to === "/platform" ? currentPath === "/platform" || currentPath.startsWith("/platform/") : currentPath === item.to,
					collapsed
				}, item.name);
			})
		}) })]
	});
}
function MoreButton({ role, currentPath }) {
	const { state, isMobile } = useSidebar();
	const collapsed = !isMobile && state === "collapsed";
	const visibleGroups = moreGroups.map((g) => ({
		...g,
		items: g.items.filter((i) => i.roles.includes(role))
	})).filter((g) => g.items.length > 0);
	if (visibleGroups.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarGroup, {
		className: cn(collapsed && "px-0 items-center"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarGroupContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenu, {
			className: cn(collapsed && "items-center"),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarMenuButton, {
					tooltip: "More",
					className: cn("h-9 rounded-lg text-sidebar-foreground/85 hover:bg-sidebar-accent", collapsed && "justify-center px-0"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "h-4 w-4 shrink-0" }), !collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[13px]",
						children: "More"
					})]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
				side: "right",
				align: "start",
				sideOffset: 8,
				className: "w-64 p-2 max-h-[70vh] overflow-y-auto no-scrollbar",
				children: visibleGroups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 last:mb-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-2 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em]",
						children: g.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-col",
						children: g.items.map((item) => {
							const active = currentPath === item.to;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: item.to,
								className: cn("flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors", active ? "bg-[--fusion-mint] text-[--fusion-ink] font-semibold" : "text-foreground hover:bg-muted"),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "h-4 w-4 shrink-0" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate flex-1",
										children: item.label
									}),
									item.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: "text-[9px] px-1.5 h-4 border-0 bg-[--fusion-grape] text-white",
										children: item.badge
									})
								]
							}, item.name);
						})
					})]
				}, g.label))
			})] }) })
		}) })
	});
}
function AppSidebar() {
	const { state, isMobile } = useSidebar();
	const collapsed = !isMobile && state === "collapsed";
	const currentPath = useRouterState({ select: (r) => r.location.pathname });
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const fetchRole = useServerFn(getMyRole);
	const { data } = useQuery({
		queryKey: ["my-role"],
		queryFn: () => fetchRole()
	});
	const realRole = data?.role ?? "pending";
	const [impersonating, setImpersonating] = import_react.useState(() => getImpersonationSession());
	import_react.useEffect(() => {
		const sync = () => setImpersonating(getImpersonationSession());
		window.addEventListener("storage", sync);
		window.addEventListener("gh_impersonation_changed", sync);
		return () => {
			window.removeEventListener("storage", sync);
			window.removeEventListener("gh_impersonation_changed", sync);
		};
	}, []);
	const role = realRole === "super_admin" && impersonating ? "admin" : realRole;
	const fetchPending = useServerFn(countPendingOrders);
	const { data: pending } = useQuery({
		queryKey: ["pending-order-count"],
		queryFn: () => fetchPending(),
		enabled: realRole === "super_admin",
		refetchInterval: 6e4
	});
	async function handleSignOut() {
		await queryClient.cancelQueries();
		queryClient.clear();
		await supabase.auth.signOut();
		navigate({
			to: "/auth",
			replace: true
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sidebar, {
		collapsible: "icon",
		children: [
			!collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarHeader, {
				className: "border-b border-sidebar-border/60",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-2 py-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] font-black text-sidebar-foreground/60 uppercase tracking-[0.24em]",
						children: role.replace("_", " ")
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				items: pinnedNav,
				role,
				currentPath,
				showLabel: false
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoreButton, {
				role,
				currentPath
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarFooter, {
				className: "border-t border-sidebar-border/60 gap-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					items: bottomNav,
					role,
					currentPath,
					showLabel: false
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: handleSignOut,
					className: cn("h-9 text-sidebar-foreground/80 hover:text-red-600 hover:bg-red-500/10", collapsed ? "justify-center px-0 w-9 mx-auto" : "justify-start"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4 shrink-0" }), !collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2",
						children: "Sign out"
					})]
				})]
			})
		]
	});
}
function ThemeInit() {
	(0, import_react.useEffect)(() => {
		applyTheme(getStoredTheme());
	}, []);
	return null;
}
/**
* Lightweight session listener. During this testing/onboarding phase we
* intentionally do NOT enforce idle timeouts, absolute session caps, or
* revalidate-on-focus — those caused a redirect loop for beta interns.
*
* We only react to an explicit SIGNED_OUT event (user clicks "Sign out"
* or their token is revoked server-side) and send them to the login page.
*/
var SESSION_KEY = "gh_session_started_at";
var MAX_SESSION_MS = 1440 * 60 * 1e3;
function SessionGuard() {
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		const enforceMaxSession = async () => {
			const started = Number(localStorage.getItem(SESSION_KEY) || 0);
			const { data } = await supabase.auth.getSession();
			if (!data.session) return;
			if (!started) {
				localStorage.setItem(SESSION_KEY, String(Date.now()));
				return;
			}
			if (Date.now() - started > MAX_SESSION_MS) {
				localStorage.removeItem(SESSION_KEY);
				await supabase.auth.signOut();
				navigate({
					to: "/auth/login",
					search: { reason: "expired" },
					replace: true
				});
			}
		};
		enforceMaxSession();
		const t = window.setInterval(enforceMaxSession, 6e4);
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event === "SIGNED_OUT") {
				localStorage.removeItem(SESSION_KEY);
				navigate({
					to: "/auth/login",
					replace: true
				});
			}
			if (event === "SIGNED_IN") {
				localStorage.setItem(SESSION_KEY, String(Date.now()));
				trackLoginAndAdvance().catch(() => {});
			}
		});
		return () => {
			window.clearInterval(t);
			sub.subscription.unsubscribe();
		};
	}, [navigate]);
	return null;
}
function AuthenticatedLayout() {
	const { data: profile } = useMyProfile();
	const avatar = profile?.avatar ?? null;
	const initials = initialsOf(profile?.name, profile?.email);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarProvider, {
		defaultOpen: false,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeInit, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionGuard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OnboardingTour, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-screen flex w-full bg-background",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"data-tour": "sidebar",
					className: "contents",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSidebar, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 flex flex-col min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImpersonationBanner, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "h-14 flex items-center gap-2 sm:gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md px-3 sm:px-6 sticky top-0 z-30",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarTrigger, { className: "shrink-0" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex-1 max-w-2xl mx-auto w-full",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSearch, {})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/notifications",
									"aria-label": "Notifications",
									"data-tour": "topbar-notifications",
									className: "relative shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[--fusion-grape] ring-2 ring-background" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/settings",
									"aria-label": "Your profile",
									"data-tour": "topbar-profile",
									className: "shrink-0 h-9 w-9 rounded-full grid place-items-center text-[12px] font-bold text-[--fusion-ink] shadow-sm relative overflow-hidden ring-1 ring-black/5 hover:ring-[--fusion-grape]/60 transition",
									style: avatar ? void 0 : { background: "var(--gradient-fusion)" },
									children: [avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: avatar,
										alt: "",
										className: "absolute inset-0 h-full w-full object-cover"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: initials }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[--fusion-grape] ring-2 ring-background" })]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
							className: "flex-1 overflow-y-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
						})
					]
				})]
			})
		]
	});
}
//#endregion
export { AuthenticatedLayout as component };
