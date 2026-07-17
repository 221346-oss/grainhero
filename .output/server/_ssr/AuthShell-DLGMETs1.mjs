import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { s as Wheat } from "../_libs/lucide-react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Card } from "./card-CkAivaVl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AuthShell-DLGMETs1.js
var import_jsx_runtime = require_jsx_runtime();
function AuthShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen flex items-center justify-center px-4 py-12",
		style: { background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "flex items-center justify-center gap-2 mb-6 text-gray-700 hover:text-[#00a63e] transition-colors",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "w-8 h-8 text-[#00a63e]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-2xl font-bold tracking-wide",
					children: "GrainHero"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "shadow-xl border-gray-200 p-6",
				children
			})]
		})
	});
}
function Message({ msg }) {
	if (!msg) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `text-sm border rounded-md p-3 ${msg.type === "error" ? "bg-red-50 text-red-700 border-red-200" : msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}`,
		children: msg.text
	});
}
//#endregion
export { Message as n, AuthShell as t };
