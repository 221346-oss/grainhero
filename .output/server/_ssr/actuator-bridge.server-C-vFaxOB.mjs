import processModule from "node:process";
import { Buffer } from "node:buffer";
import { createSign } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/actuator-bridge.server-C-vFaxOB.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var firebase_admin_server_exports = /* @__PURE__ */ __exportAll({
	fetchAllDevicePayloads: () => fetchAllDevicePayloads,
	fetchFirebaseDevices: () => fetchFirebaseDevices,
	getFirebaseAccessToken: () => getFirebaseAccessToken
});
var cached = null;
function parseServiceAccount() {
	const raw = processModule.env.FIREBASE_SERVICE_ACCOUNT_JSON;
	if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
	const sa = JSON.parse(raw);
	sa.private_key = sa.private_key.replace(/\\n/g, "\n");
	return sa;
}
function base64url(input) {
	return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function mintAccessToken() {
	const sa = parseServiceAccount();
	const now = Math.floor(Date.now() / 1e3);
	const header = {
		alg: "RS256",
		typ: "JWT"
	};
	const claim = {
		iss: sa.client_email,
		scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
		aud: sa.token_uri,
		iat: now,
		exp: now + 3600
	};
	const signInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
	const signer = createSign("RSA-SHA256");
	signer.update(signInput);
	signer.end();
	const jwt = `${signInput}.${base64url(signer.sign(sa.private_key))}`;
	const res = await fetch(sa.token_uri, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt
		})
	});
	if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
	const json = await res.json();
	return {
		token: json.access_token,
		exp: now + json.expires_in - 60
	};
}
async function getFirebaseAccessToken() {
	const now = Math.floor(Date.now() / 1e3);
	if (cached && cached.exp > now) return cached.token;
	cached = await mintAccessToken();
	return cached.token;
}
async function fetchFirebaseDevices(path = "devices") {
	const dbUrl = processModule.env.FIREBASE_DATABASE_URL;
	if (!dbUrl) throw new Error("FIREBASE_DATABASE_URL not set");
	const token = await getFirebaseAccessToken();
	const url = `${dbUrl.replace(/\/$/, "")}/${path}.json`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!res.ok) throw new Error(`Firebase RTDB fetch ${res.status}`);
	return await res.json() ?? {};
}
async function fetchAllDevicePayloads() {
	const result = {};
	try {
		const legacy = await fetchFirebaseDevices("sensor_data");
		for (const [deviceId, node] of Object.entries(legacy)) {
			const payload = node?.latest ?? node;
			if (payload && typeof payload === "object" && Object.keys(payload).length > 0) result[deviceId] = payload;
		}
	} catch {}
	try {
		const modern = await fetchFirebaseDevices("devices");
		for (const [deviceId, node] of Object.entries(modern)) {
			const payload = node?.live;
			if (payload && typeof payload === "object" && Object.keys(payload).length > 0) result[deviceId] = {
				...result[deviceId] ?? {},
				...payload
			};
		}
	} catch {}
	return result;
}
var actuator_bridge_server_exports = /* @__PURE__ */ __exportAll({
	publishActuatorCommand: () => publishActuatorCommand,
	writeFirebaseControl: () => writeFirebaseControl
});
async function writeFirebaseControl(deviceId, state) {
	const dbUrl = processModule.env.FIREBASE_DATABASE_URL;
	if (!dbUrl) return;
	const token = await getFirebaseAccessToken();
	const url = `${dbUrl.replace(/\/$/, "")}/control/${encodeURIComponent(deviceId)}.json`;
	const updates = { lastControlUpdate: { ".sv": "timestamp" } };
	if (state.human_requested_fan !== void 0) {
		updates.human_requested_fan = !!state.human_requested_fan;
		updates.humanRequestedFan = !!state.human_requested_fan;
		updates.servo = !!state.human_requested_fan;
	}
	if (state.ml_requested_fan !== void 0) {
		updates.ml_requested_fan = !!state.ml_requested_fan;
		updates.mlRequestedFan = !!state.ml_requested_fan;
	}
	if (state.target_fan_speed !== void 0) {
		updates.target_fan_speed = state.target_fan_speed ?? 0;
		updates.targetFanSpeed = state.target_fan_speed ?? 0;
		updates.pwm = state.target_fan_speed ?? 0;
	}
	if (state.ml_decision !== void 0) {
		updates.ml_decision = state.ml_decision ?? "idle";
		updates.mlDecision = state.ml_decision ?? "idle";
	}
	if (state.led2 !== void 0) updates.led2 = !!state.led2;
	if (state.led3 !== void 0) updates.led3 = !!state.led3;
	if (state.led4 !== void 0) updates.led4 = !!state.led4;
	if (state.alarm !== void 0) updates.alarm = !!state.alarm;
	if (state.servo !== void 0) updates.servo = !!state.servo;
	const res = await fetch(url, {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify(updates)
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firebase RTDB PATCH /control/${deviceId}: ${res.status} ${text}`);
	}
}
async function publishActuatorCommand(actuatorCode, cmd) {
	const dbUrl = processModule.env.FIREBASE_DATABASE_URL;
	if (!dbUrl) return {
		ok: false,
		path: "",
		skipped: true
	};
	const token = await getFirebaseAccessToken();
	const path = `control/${encodeURIComponent(actuatorCode)}.json`;
	const url = `${dbUrl.replace(/\/$/, "")}/${path}`;
	const updates = { lastControlUpdate: { ".sv": "timestamp" } };
	switch (cmd.action) {
		case "turn_on":
		case "manual":
			updates.human_requested_fan = true;
			updates.humanRequestedFan = true;
			updates.servo = true;
			if (cmd.value !== void 0 && cmd.value !== null) {
				updates.target_fan_speed = cmd.value;
				updates.targetFanSpeed = cmd.value;
				updates.pwm = cmd.value;
			}
			break;
		case "turn_off":
		case "auto":
			updates.human_requested_fan = false;
			updates.humanRequestedFan = false;
			updates.servo = false;
			if (cmd.action === "turn_off") {
				updates.target_fan_speed = 0;
				updates.targetFanSpeed = 0;
				updates.pwm = 0;
			}
			break;
		case "set_value":
			if (cmd.value !== void 0 && cmd.value !== null) {
				updates.target_fan_speed = cmd.value;
				updates.targetFanSpeed = cmd.value;
				updates.pwm = cmd.value;
			}
			break;
		case "emergency_stop":
			updates.human_requested_fan = false;
			updates.humanRequestedFan = false;
			updates.servo = false;
			updates.target_fan_speed = 0;
			updates.targetFanSpeed = 0;
			updates.pwm = 0;
			break;
	}
	const res = await fetch(url, {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify(updates)
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Firebase RTDB PATCH ${res.status}: ${text}`);
	}
	return {
		ok: true,
		path
	};
}
//#endregion
export { writeFirebaseControl as n, firebase_admin_server_exports as r, actuator_bridge_server_exports as t };
