import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { a as numberType, c as stringType, o as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/openweather.functions-BzVS_HdS.js
var base = "https://api.openweathermap.org";
function key() {
	const k = processModule.env.OPENWEATHER_API_KEY;
	if (!k) throw new Error("OPENWEATHER_API_KEY not configured");
	return k;
}
async function fetchJson(url) {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`OpenWeather ${r.status}: ${await r.text().catch(() => "")}`);
	return r.json();
}
var geocodeCity_createServerFn_handler = createServerRpc({
	id: "dae183df68ea818e62ce342953ea3439959c1f2e25ec1184c7aefac065be7aaf",
	name: "geocodeCity",
	filename: "src/lib/openweather.functions.ts"
}, (opts) => geocodeCity.__executeServer(opts));
var geocodeCity = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ city: stringType().min(1).max(120) }).parse(d)).handler(geocodeCity_createServerFn_handler, async ({ data }) => {
	const j = await fetchJson(`${base}/geo/1.0/direct?q=${encodeURIComponent(data.city)}&limit=1&appid=${key()}`);
	const first = Array.isArray(j) ? j[0] : null;
	if (!first) throw new Error("City not found");
	return {
		lat: first.lat,
		lon: first.lon,
		name: first.name,
		country: first.country
	};
});
var getWeatherBundle_createServerFn_handler = createServerRpc({
	id: "7e00e5d41aadcf807e95c9e488c7ec94b354746c50549819b144613dfe132b22",
	name: "getWeatherBundle",
	filename: "src/lib/openweather.functions.ts"
}, (opts) => getWeatherBundle.__executeServer(opts));
var getWeatherBundle = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	lat: numberType(),
	lon: numberType()
}).parse(d)).handler(getWeatherBundle_createServerFn_handler, async ({ data }) => {
	const k = key();
	const q = `lat=${data.lat}&lon=${data.lon}&appid=${k}`;
	const [current, forecast, aqi] = await Promise.all([
		fetchJson(`${base}/data/2.5/weather?${q}&units=metric`),
		fetchJson(`${base}/data/2.5/forecast?${q}&units=metric`),
		fetchJson(`${base}/data/2.5/air_pollution?${q}`)
	]);
	return {
		current,
		forecast,
		aqi
	};
});
//#endregion
export { geocodeCity_createServerFn_handler, getWeatherBundle_createServerFn_handler };
