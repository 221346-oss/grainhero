import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as getApps, s as initializeApp } from "../_libs/@firebase/app+[...].mjs";
import { i as ref, n as off, r as onValue, t as getDatabase } from "../_libs/firebase__database.mjs";
import "../_libs/firebase.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-firebase-sensor-CP435GgU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var config = {
	apiKey: "REPLACE_ME",
	authDomain: "REPLACE_ME.firebaseapp.com",
	databaseURL: "https://REPLACE_ME-default-rtdb.firebaseio.com",
	projectId: "REPLACE_ME",
	storageBucket: "REPLACE_ME.appspot.com",
	messagingSenderId: "",
	appId: ""
};
var isFirebaseConfigured = !config.databaseURL.includes("REPLACE_ME");
var _app = null;
var _db = null;
function getFirebaseDb() {
	if (typeof window === "undefined") return null;
	if (!isFirebaseConfigured) return null;
	if (!_app) _app = getApps()[0] ?? initializeApp(config);
	if (!_db) _db = getDatabase(_app);
	return _db;
}
/**
* Subscribe to live sensor data for a single device with dual-path support.
*
* Path strategy (matches GH2 cron):
*   Primary (GH2 firmware): /devices/{deviceId}/live
*   Fallback (GH1 firmware): /sensor_data/{deviceId}/latest
*
* Both listeners run simultaneously. Whichever fires last wins, so the hook
* always reflects the most recent data regardless of which RTDB tree the
* ESP32 firmware writes to.
*/
function useFirebaseSensor(deviceId) {
	const [reading, setReading] = (0, import_react.useState)(null);
	const [connected, setConnected] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!deviceId || !isFirebaseConfigured) return;
		const db = getFirebaseDb();
		if (!db) return;
		const gh2Ref = ref(db, `devices/${deviceId}/live`);
		const gh2Handler = onValue(gh2Ref, (snap) => {
			const val = snap.val();
			if (val && typeof val === "object" && Object.keys(val).length > 0) {
				setReading(val);
				setConnected(true);
			}
		}, () => {});
		const gh1Ref = ref(db, `sensor_data/${deviceId}/latest`);
		const gh1Handler = onValue(gh1Ref, (snap) => {
			const val = snap.val();
			if (val && typeof val === "object" && Object.keys(val).length > 0) {
				setReading((prev) => prev ?? val);
				setConnected(true);
			}
		}, () => setConnected(false));
		return () => {
			off(gh2Ref, "value", gh2Handler);
			off(gh1Ref, "value", gh1Handler);
		};
	}, [deviceId]);
	return {
		reading,
		connected,
		configured: isFirebaseConfigured
	};
}
/**
* Subscribe to all devices' latest live snapshot with dual-path support.
*
* Merges data from both RTDB trees:
*   /devices        → GH2 firmware  (node.live contains the payload)
*   /sensor_data    → GH1 firmware  (node.latest contains the payload)
*
* GH2 data wins when a device exists in both trees.
*/
function useFirebaseAllSensors() {
	const [readings, setReadings] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		if (!isFirebaseConfigured) return;
		const db = getFirebaseDb();
		if (!db) return;
		const merged = {};
		const gh1Ref = ref(db, "sensor_data");
		const gh1Handler = onValue(gh1Ref, (snap) => {
			const val = snap.val();
			if (!val) return;
			for (const [id, node] of Object.entries(val)) {
				const payload = node?.latest ?? node;
				if (payload && typeof payload === "object") merged[id] = payload;
			}
			setReadings({ ...merged });
		});
		const gh2Ref = ref(db, "devices");
		const gh2Handler = onValue(gh2Ref, (snap) => {
			const val = snap.val();
			if (!val) return;
			for (const [id, node] of Object.entries(val)) if (node?.live) merged[id] = {
				...merged[id] ?? {},
				...node.live
			};
			setReadings({ ...merged });
		});
		return () => {
			off(gh1Ref, "value", gh1Handler);
			off(gh2Ref, "value", gh2Handler);
		};
	}, []);
	return {
		readings,
		configured: isFirebaseConfigured
	};
}
//#endregion
export { useFirebaseSensor as n, useFirebaseAllSensors as t };
