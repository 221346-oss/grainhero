import { createServerFn } from "@tanstack/react-start";
import { spawn } from "child_process";
import path from "path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SpoilagePredictionResult = {
  risk_class: string;
  risk_score: number;
  confidence: number;
  factors: string[];
};

/**
 * Invokes the Python ML model script to predict spoilage risk.
 */
export async function runPythonMLInference(data: {
  temperature: number;
  humidity: number;
  moisture: number;
  voc: number;
  co2: number;
  storage_days: number;
  grain_type: string;
}): Promise<SpoilagePredictionResult> {
  return new Promise((resolve, reject) => {
    // Determine the absolute path to the Python script
    const scriptPath = path.resolve(process.cwd(), "src/ml/smartbin_predict.py");

    const pythonProcess = spawn("python3", [
      scriptPath,
      "--temp", data.temperature.toString(),
      "--humidity", data.humidity.toString(),
      "--moisture", data.moisture.toString(),
      "--voc", data.voc.toString(),
      "--co2", data.co2.toString(),
      "--days", data.storage_days.toString(),
      "--grain", data.grain_type
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
        // Fallback or reject? For now, reject to ensure caller handles it.
        return reject(new Error(`ML inference failed: ${errorData}`));
      }

      try {
        // Find JSON block in stdout
        const jsonStart = outputData.indexOf("{");
        const jsonEnd = outputData.lastIndexOf("}");
        
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error("No JSON found in Python output");
        }

        const jsonStr = outputData.slice(jsonStart, jsonEnd + 1);
        const result = JSON.parse(jsonStr) as SpoilagePredictionResult;
        resolve(result);
      } catch (err) {
        console.error("Failed to parse ML output:", outputData);
        reject(err);
      }
    });
  });
}
