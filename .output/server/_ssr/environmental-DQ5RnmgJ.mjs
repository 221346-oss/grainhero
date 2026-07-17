import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-OuFjfcpS.mjs";
import { A as Sun, Ft as Droplets, Gt as Cloud, Kt as CloudRain, Mt as Eye, N as Snowflake, O as Sunset, Sn as Activity, Tt as Gauge, dt as MapPin, i as Wind, k as Sunrise, qt as CloudLightning, sn as ChartColumn, w as Thermometer } from "../_libs/lucide-react.mjs";
import { t as useServerFn } from "./useServerFn-BqzygRuj.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CkAivaVl.mjs";
import { t as Input } from "./input-CITjGSX3.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as createSsrRpc } from "./createSsrRpc-BFNjUuic.mjs";
import { a as numberType, c as stringType, o as objectType } from "../_libs/zod.mjs";
import { n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { a as YAxis, c as Line, g as Tooltip, h as ResponsiveContainer, i as LineChart, l as CartesianGrid, o as XAxis, s as Area, t as AreaChart } from "../_libs/recharts+[...].mjs";
import { t as useFirebaseAllSensors } from "./use-firebase-sensor-CP435GgU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/environmental-DQ5RnmgJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var geocodeCity = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ city: stringType().min(1).max(120) }).parse(d)).handler(createSsrRpc("dae183df68ea818e62ce342953ea3439959c1f2e25ec1184c7aefac065be7aaf"));
var getWeatherBundle = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	lat: numberType(),
	lon: numberType()
}).parse(d)).handler(createSsrRpc("7e00e5d41aadcf807e95c9e488c7ec94b354746c50549819b144613dfe132b22"));
function windDir(deg) {
	if (deg === void 0) return "--";
	return [
		"N",
		"NNE",
		"NE",
		"ENE",
		"E",
		"ESE",
		"SE",
		"SSE",
		"S",
		"SSW",
		"SW",
		"WSW",
		"W",
		"WNW",
		"NW",
		"NNW"
	][Math.round(deg / 22.5) % 16];
}
function fmtTime(unix) {
	return unix ? (/* @__PURE__ */ new Date(unix * 1e3)).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	}) : "--";
}
function aqiLabel(v) {
	return v === null ? "--" : [
		"",
		"Good",
		"Fair",
		"Moderate",
		"Poor",
		"Very Poor"
	][v] ?? "--";
}
function aqiColor(v) {
	return v === null ? "text-slate-500" : [
		"",
		"text-emerald-600",
		"text-lime-600",
		"text-yellow-600",
		"text-orange-600",
		"text-red-600"
	][v] ?? "text-slate-500";
}
function EnvironmentalPage() {
	const geoFn = useServerFn(geocodeCity);
	const bundleFn = useServerFn(getWeatherBundle);
	const [cityQuery, setCityQuery] = (0, import_react.useState)("Lahore");
	const [coords, setCoords] = (0, import_react.useState)(null);
	const geo = useMutation({
		mutationFn: (city) => geoFn({ data: { city } }),
		onSuccess: (d) => {
			setCoords({
				lat: d.lat,
				lon: d.lon
			});
			toast.success(`${d.name}, ${d.country}`);
		},
		onError: (e) => toast.error(e.message)
	});
	const weather = useQuery({
		queryKey: [
			"weather-bundle",
			coords?.lat,
			coords?.lon
		],
		queryFn: () => bundleFn({ data: coords }),
		enabled: !!coords,
		refetchInterval: 5 * 6e4
	});
	const current = weather.data?.current;
	const forecastList = (weather.data?.forecast)?.list ?? [];
	const aqiPayload = weather.data?.aqi;
	const aqi = aqiPayload?.list?.[0]?.main?.aqi ?? null;
	const aqiComp = aqiPayload?.list?.[0]?.components ?? null;
	const forecastSeries = (0, import_react.useMemo)(() => forecastList.map((it) => ({
		ts: (/* @__PURE__ */ new Date(it.dt * 1e3)).toLocaleString([], {
			month: "short",
			day: "numeric",
			hour: "2-digit"
		}),
		temp: it.main?.temp ?? null,
		feels: it.main?.feels_like ?? null,
		humidity: it.main?.humidity ?? null,
		wind: it.wind?.speed ?? null,
		rain: it.rain?.["3h"] ?? 0,
		snow: it.snow?.["3h"] ?? 0
	})), [forecastList]);
	(0, import_react.useEffect)(() => {
		if (!coords) geo.mutate(cityQuery);
	}, []);
	const useMyLocation = () => {
		if (!navigator.geolocation) return toast.error("Geolocation not available");
		navigator.geolocation.getCurrentPosition((pos) => setCoords({
			lat: pos.coords.latitude,
			lon: pos.coords.longitude
		}), (err) => toast.error(`Location error: ${err.message}`));
	};
	const { readings: liveSensors } = useFirebaseAllSensors();
	const firstDeviceId = Object.keys(liveSensors)[0];
	const liveSilo = firstDeviceId ? liveSensors[firstDeviceId] : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-4 sm:p-6 lg:p-8 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col md:flex-row md:items-center md:justify-between gap-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent",
					children: "Environmental Data"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground mt-1",
					children: "OpenWeather snapshot · AQI · 5-day forecast · Live silo microclimate"
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "bg-gradient-to-br from-sky-50 to-blue-50/40",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-5 w-5 text-sky-600" }), " Select Location"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Type a city or use your current location" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							className: "w-[260px]",
							placeholder: "e.g. Lahore",
							value: cityQuery,
							onChange: (e) => setCityQuery(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") geo.mutate(cityQuery);
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => geo.mutate(cityQuery),
							disabled: geo.isPending,
							children: "Search"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: useMyLocation,
							children: "Use My Location"
						}),
						coords && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							variant: "outline",
							className: "gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3 w-3" }),
								coords.lat.toFixed(3),
								", ",
								coords.lon.toFixed(3)
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
				className: "pb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-5 w-5 text-yellow-500" }), " Current Weather"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: current ? `${current.name ?? "Selected"}${current.sys?.country ? ", " + current.sys.country : ""} • ${(/* @__PURE__ */ new Date()).toLocaleString()}` : "Waiting for data" })] }), current?.weather?.[0]?.icon && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`,
							alt: "",
							width: 56,
							height: 56
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium capitalize text-slate-600",
							children: current.weather[0].description
						})]
					})]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						icon: Thermometer,
						label: "Temp",
						value: current?.main?.temp !== void 0 ? `${current.main.temp.toFixed(1)}°C` : "--",
						sub: `Feels ${current?.main?.feels_like?.toFixed(1) ?? "--"}°C`,
						color: "orange"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						icon: Droplets,
						label: "Humidity",
						value: `${current?.main?.humidity ?? "--"}%`,
						color: "blue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						icon: Gauge,
						label: "Pressure",
						value: `${current?.main?.pressure ?? "--"} hPa`,
						color: "purple"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						icon: Wind,
						label: "Wind",
						value: `${current?.wind?.speed ?? "--"} m/s`,
						sub: windDir(current?.wind?.deg),
						color: "cyan"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						icon: CloudRain,
						label: "Rain",
						value: `${current?.rain?.["1h"] ?? 0} mm/h`,
						color: "indigo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
						icon: Snowflake,
						label: "Snow",
						value: `${current?.snow?.["1h"] ?? 0} mm/h`,
						color: "slate"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 grid-cols-2 md:grid-cols-5 mt-3 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniMetric, {
						icon: Eye,
						label: "Visibility",
						value: current?.visibility !== void 0 ? `${(current.visibility / 1e3).toFixed(1)} km` : "--"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniMetric, {
						icon: Cloud,
						label: "Cloudiness",
						value: `${current?.clouds?.all ?? "--"}%`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniMetric, {
						icon: Thermometer,
						label: "Min / Max",
						value: `${current?.main?.temp_min?.toFixed(1) ?? "--"}° / ${current?.main?.temp_max?.toFixed(1) ?? "--"}°`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniMetric, {
						icon: Sunrise,
						label: "Sunrise",
						value: fmtTime(current?.sys?.sunrise)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniMetric, {
						icon: Sunset,
						label: "Sunset",
						value: fmtTime(current?.sys?.sunset)
					})
				]
			})] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudLightning, { className: "h-5 w-5 text-emerald-600" }), " Air Quality Index"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Real-time pollutants from OpenWeather" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-4 mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `text-4xl font-bold ${aqiColor(aqi)}`,
					children: aqi ?? "--"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `text-lg font-semibold ${aqiColor(aqi)}`,
					children: aqiLabel(aqi)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-slate-500",
					children: "1 = Good … 5 = Very Poor"
				})] })]
			}), aqiComp && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 grid-cols-2 md:grid-cols-4 text-sm",
				children: [
					[
						"PM2.5",
						aqiComp.pm2_5,
						"text-red-600"
					],
					[
						"PM10",
						aqiComp.pm10,
						"text-orange-600"
					],
					[
						"O₃",
						aqiComp.o3,
						"text-blue-600"
					],
					[
						"NO₂",
						aqiComp.no2,
						"text-purple-600"
					],
					[
						"SO₂",
						aqiComp.so2,
						"text-amber-600"
					],
					[
						"CO",
						aqiComp.co,
						"text-slate-600"
					],
					[
						"NO",
						aqiComp.no,
						"text-teal-600"
					],
					[
						"NH₃",
						aqiComp.nh3,
						"text-lime-600"
					]
				].map(([label, value, color]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-2 rounded-lg border bg-white",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-slate-500",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `text-lg font-bold ${color}`,
						children: [
							typeof value === "number" ? value.toFixed(1) : "--",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-normal text-slate-400",
								children: "μg/m³"
							})
						]
					})]
				}, String(label)))
			})] })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, { className: "h-4 w-4" }), " 5-Day Forecast (3-hourly)"]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: forecastSeries.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForecastChart, {
						title: "Temperature & Feels-like",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
							data: forecastSeries,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									strokeDasharray: "3 3",
									stroke: "#f0f0f0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "ts",
									interval: Math.floor(forecastSeries.length / 8),
									tick: { fontSize: 10 }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
									type: "monotone",
									dataKey: "temp",
									stroke: "#f97316",
									strokeWidth: 2,
									dot: false,
									name: "Temp (°C)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
									type: "monotone",
									dataKey: "feels",
									stroke: "#fb923c",
									strokeWidth: 1.5,
									strokeDasharray: "4 4",
									dot: false,
									name: "Feels (°C)"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForecastChart, {
						title: "Precipitation",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
							data: forecastSeries,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									strokeDasharray: "3 3",
									stroke: "#f0f0f0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "ts",
									interval: Math.floor(forecastSeries.length / 8),
									tick: { fontSize: 10 }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									type: "monotone",
									dataKey: "rain",
									stroke: "#3b82f6",
									fill: "#93c5fd",
									fillOpacity: .4,
									name: "Rain mm/3h"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									type: "monotone",
									dataKey: "snow",
									stroke: "#6366f1",
									fill: "#a5b4fc",
									fillOpacity: .3,
									name: "Snow mm/3h"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForecastChart, {
						title: "Humidity & Wind",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
							data: forecastSeries,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									strokeDasharray: "3 3",
									stroke: "#f0f0f0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "ts",
									interval: Math.floor(forecastSeries.length / 8),
									tick: { fontSize: 10 }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, { yAxisId: "left" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									yAxisId: "right",
									orientation: "right"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
									yAxisId: "left",
									type: "monotone",
									dataKey: "humidity",
									stroke: "#059669",
									strokeWidth: 2,
									dot: false,
									name: "Humidity %"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
									yAxisId: "right",
									type: "monotone",
									dataKey: "wind",
									stroke: "#0ea5e9",
									strokeWidth: 2,
									dot: false,
									name: "Wind m/s"
								})
							]
						})
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground py-8 text-center",
				children: weather.isFetching ? "Loading forecast…" : "Search for a city to see forecast."
			}) })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "bg-gradient-to-br from-emerald-50 to-emerald-100/30",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-5 w-5 text-emerald-600" }),
						" Indoor Silo Microclimate",
						liveSilo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "outline",
							className: "text-emerald-600 border-emerald-300 ml-auto",
							children: "● Live"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: liveSilo ? `Firebase RTDB · ${firstDeviceId} · ${new Date(liveSilo.ts ?? Date.now()).toLocaleString()}` : "Waiting for silo data…" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: liveSilo ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 md:grid-cols-3 lg:grid-cols-6 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileStat, {
							label: "Temp",
							value: `${(liveSilo.temperature ?? 0).toFixed(1)}°C`,
							tone: "red"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileStat, {
							label: "Humidity",
							value: `${(liveSilo.humidity ?? 0).toFixed(1)}%`,
							tone: "cyan"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileStat, {
							label: "TVOC",
							value: `${liveSilo.voc ?? 0} ppb`,
							tone: "violet"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileStat, {
							label: "CO₂",
							value: `${liveSilo.co2 ?? 0} ppm`,
							tone: "slate"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileStat, {
							label: "Fan",
							value: String(liveSilo.fan_state ?? "off").toUpperCase(),
							tone: "amber"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileStat, {
							label: "Lid",
							value: String(liveSilo.lid_state ?? "closed").toUpperCase(),
							tone: "sky"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [
						"No live device data yet. Ensure device is streaming to Firebase RTDB /devices/",
						"{deviceId}",
						"/live."
					]
				}) })]
			})
		]
	});
}
function Metric({ icon: Icon, label, value, sub, color }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `p-3 rounded-lg bg-gradient-to-br from-${color}-50 to-${color}-100/40 border border-${color}-100`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `text-xs uppercase text-${color}-600 flex items-center gap-1`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3 w-3" }),
					" ",
					label
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `text-2xl font-bold text-${color}-700`,
				children: value
			}),
			sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `text-xs text-${color}-500 mt-0.5`,
				children: sub
			})
		]
	});
}
function MiniMetric({ icon: Icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-3 rounded-lg bg-slate-50 border border-slate-100",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-xs uppercase text-slate-500 flex items-center gap-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3 w-3" }),
				" ",
				label
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-lg font-semibold",
			children: value
		})]
	});
}
function TileStat({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `p-3 rounded-lg bg-${tone}-50 border border-${tone}-100 text-center`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-xs uppercase text-${tone}-500`,
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-xl font-bold text-${tone}-700`,
			children: value
		})]
	});
}
function ForecastChart({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
		className: "text-sm font-medium mb-2",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style: { height: 220 },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children
		})
	})] });
}
//#endregion
export { EnvironmentalPage as component };
