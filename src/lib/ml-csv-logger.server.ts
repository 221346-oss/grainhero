import fs from "fs";
import path from "path";

type MLCSVData = {
  temperature: number;
  humidity: number;
  moisture: number;
  storageDays: number;
  airflow: number;
  light: number;
  pestScore: number;
  grainType: string;
};

export function appendToMLDataset(data: MLCSVData) {
  try {
    const t = data.temperature;
    const rh = data.humidity;

    // Calculate dew point properly
    const calcDewPoint = (t: number, rh: number) => {
      const a = 17.27, b = 237.7;
      const alpha = (a * t) / (b + t) + Math.log(rh / 100 + 1e-9);
      return Math.round((b * alpha) / (a - alpha) * 100) / 100;
    };
    const dpVal = calcDewPoint(t, rh);
    const rainfallVal = 0; // no rainfall sensor on Arduino; default to 0

    // Classify spoilage using FAO Rice thresholds
    let dangerCount = 0;
    if (data.moisture > 18) dangerCount += 2;
    else if (data.moisture > 14) dangerCount += 1;
    if (t > 35) dangerCount += 2;
    else if (t > 25) dangerCount += 1;
    if (rh > 80) dangerCount += 2;
    else if (rh > 65) dangerCount += 1;
    if (data.storageDays > 365) dangerCount += 2;
    else if (data.storageDays > 180) dangerCount += 1;
    if (data.pestScore > 0.5) dangerCount += 1;
    
    const spoilageClass = dangerCount >= 5 ? 2 : (dangerCount >= 2 ? 1 : 0);
    const spoilageLabel = spoilageClass === 2 ? 'Spoiled' : (spoilageClass === 1 ? 'Risky' : 'Safe');

    // Grain Type Encoding
    const grainTypeEncoded = data.grainType.toLowerCase() === 'rice' ? 1 : 
                             data.grainType.toLowerCase() === 'wheat' ? 2 : 1; // Default 1

    const row = [
      t.toFixed(2),
      rh.toFixed(2),
      data.storageDays,
      spoilageLabel,
      grainTypeEncoded,
      data.airflow.toFixed(3),
      dpVal.toFixed(2),
      data.light.toFixed(1),
      data.pestScore > 0.5 ? 1 : 0,
      data.moisture.toFixed(2),
      rainfallVal.toFixed(1),
    ].join(',');

    // Local disk logging disabled for serverless compatibility
    // fs.appendFileSync(csvPath, row + '\n');
    console.log(`[ML Logger] 📊 Edge-compatible log (label=${spoilageLabel}): ${row}`);
  } catch (err) {
    console.warn(`[ML Logger] CSV append warning:`, (err as Error).message);
  }
}
