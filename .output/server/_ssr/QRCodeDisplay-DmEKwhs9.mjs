import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { Lt as Download, n as X } from "../_libs/lucide-react.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CkAivaVl.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Y9HmOov6.mjs";
import { t as require_lib } from "../_libs/qrcode.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/QRCodeDisplay-DmEKwhs9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
function QRCodeDisplay({ qrCode, batchId, grainType, isOpen, onClose }) {
	const [qrImage, setQrImage] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const generateQRCode = (0, import_react.useCallback)(async () => {
		setLoading(true);
		try {
			const qrData = JSON.stringify({
				type: "grain_batch",
				batch_id: batchId,
				qr_code: qrCode,
				grain_type: grainType,
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				url: `${window.location.origin}/batch/${qrCode}`
			});
			const qrImageUrl = await import_lib.toDataURL(qrData, {
				width: 250,
				margin: 2,
				color: {
					dark: "#000000",
					light: "#FFFFFF"
				},
				errorCorrectionLevel: "M"
			});
			setQrImage(qrImageUrl);
		} catch (error) {
			console.error("Error generating QR code:", error);
		}
		setLoading(false);
	}, [
		qrCode,
		batchId,
		grainType
	]);
	(0, import_react.useEffect)(() => {
		if (qrCode && isOpen) generateQRCode();
	}, [
		qrCode,
		isOpen,
		generateQRCode
	]);
	const downloadQRCode = () => {
		if (qrImage) {
			const link = document.createElement("a");
			link.download = `grain-batch-${batchId}-qr.png`;
			link.href = qrImage;
			link.click();
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: isOpen,
		onOpenChange: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-lg max-h-[90vh] overflow-y-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
				className: "flex items-center gap-2",
				children: ["QR Code - Batch ", batchId]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Scan this QR code to view batch details on mobile devices" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
						className: "text-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
							className: "text-sm text-muted-foreground",
							children: [
								grainType,
								" - Batch ",
								batchId
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "flex justify-center",
						children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-[250px] h-[250px] flex items-center justify-center bg-gray-100 rounded-lg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-gray-600",
									children: "Generating QR Code..."
								})]
							})
						}) : qrImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: qrImage,
								alt: `QR Code for batch ${batchId}`,
								width: 250,
								height: 250,
								className: "border rounded-lg shadow-sm mx-auto"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground mt-2",
								children: ["QR Code: ", qrCode]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-[250px] h-[250px] flex items-center justify-center bg-gray-100 rounded-lg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-gray-600",
								children: "No QR code available"
							})
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-blue-50 p-4 rounded-lg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
							className: "font-medium text-blue-900 mb-2",
							children: "How to use:"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "text-sm text-blue-800 space-y-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "• Scan with any mobile QR code scanner" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "• View batch details instantly" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "• Access real-time information" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "• Share with team members" })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: downloadQRCode,
							disabled: !qrImage,
							className: "flex-1",
							variant: "outline",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 mr-2" }), "Download QR"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: onClose,
							className: "flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4 mr-2" }), "Close"]
						})]
					})
				]
			})]
		})
	});
}
//#endregion
export { QRCodeDisplay as t };
