import processModule from "node:process";
import path from "node:path";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-inference.functions-DKIuZxSn.js
/* @__NO_SIDE_EFFECTS__ */
function createNotImplementedError(name) {
	return /* @__PURE__ */ new Error(`[unenv] ${name} is not implemented yet!`);
}
/* @__NO_SIDE_EFFECTS__ */
function notImplemented(name) {
	const fn = () => {
		throw /* @__PURE__ */ createNotImplementedError(name);
	};
	return Object.assign(fn, { __unenv__: true });
}
var spawn = /* @__PURE__ */ notImplemented("child_process.spawn");
/**
* Invokes the Python ML model script to predict spoilage risk.
*/
async function runPythonMLInference(data) {
	return new Promise((resolve, reject) => {
		const pythonProcess = spawn("python3", [
			path.resolve(processModule.cwd(), "src/ml/smartbin_predict.py"),
			"--temp",
			data.temperature.toString(),
			"--humidity",
			data.humidity.toString(),
			"--moisture",
			data.moisture.toString(),
			"--voc",
			data.voc.toString(),
			"--co2",
			data.co2.toString(),
			"--days",
			data.storage_days.toString(),
			"--grain",
			data.grain_type
		]);
		let outputData = "";
		let errorData = "";
		pythonProcess.stdout.on("data", (chunk) => {
			outputData += chunk.toString();
		});
		pythonProcess.stderr.on("data", (chunk) => {
			errorData += chunk.toString();
		});
		pythonProcess.on("close", (code) => {
			if (code !== 0) {
				console.error("Python inference failed with code", code);
				console.error("Stderr:", errorData);
				return reject(/* @__PURE__ */ new Error(`ML inference failed: ${errorData}`));
			}
			try {
				const jsonStart = outputData.indexOf("{");
				const jsonEnd = outputData.lastIndexOf("}");
				if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in Python output");
				const jsonStr = outputData.slice(jsonStart, jsonEnd + 1);
				resolve(JSON.parse(jsonStr));
			} catch (err) {
				console.error("Failed to parse ML output:", outputData);
				reject(err);
			}
		});
	});
}
//#endregion
export { runPythonMLInference };
