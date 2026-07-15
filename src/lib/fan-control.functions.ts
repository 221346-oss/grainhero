import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type FanAction = "TURN_ON" | "TURN_OFF" | "NO_ACTION";

export const runAerationCheck = createServerFn("POST", async (siloId: string) => {
  // 1. Get the latest reading for this silo
  const { data: reading } = await supabaseAdmin
    .from("sensor_readings")
    .select("temperature_value, humidity_value, dew_point, moisture_value, device_id")
    .eq("silo_id", siloId)
    .order("reading_timestamp", { ascending: false })
    .limit(1)
    .single();

  if (!reading || reading.temperature_value == null || reading.humidity_value == null) {
    return { action: "NO_ACTION", reason: "Missing sensor data" };
  }

  // 2. Get the silo's target parameters
  const { data: silo } = await supabaseAdmin
    .from("silos")
    .select("target_temperature, target_moisture, fan_mode")
    .eq("id", siloId)
    .single();

  if (!silo || silo.fan_mode !== "auto") {
    return { action: "NO_ACTION", reason: "Fan not in auto mode" };
  }

  const targetTemp = silo.target_temperature ?? 20; // Default 20C
  const currentTemp = reading.temperature_value;
  const dewPoint = reading.dew_point ?? (currentTemp - ((100 - reading.humidity_value) / 5.0));
  const dewPointGap = currentTemp - dewPoint;

  let action: FanAction = "NO_ACTION";
  let reason = "Conditions normal";

  // Hysteresis logic
  // If grain is too warm, we want to cool it, but only if ambient air won't cause condensation.
  // We need dewPointGap > 3C to safely aerate.
  
  if (currentTemp > targetTemp + 2) {
    if (dewPointGap > 3) {
      action = "TURN_ON";
      reason = `Cooling required (Temp: ${currentTemp.toFixed(1)}C > Target: ${targetTemp}C, safe dew point gap)`;
    } else {
      action = "TURN_OFF";
      reason = "Cooling required but condensation risk is too high";
    }
  } else if (currentTemp <= targetTemp) {
    action = "TURN_OFF";
    reason = `Target temperature reached (${currentTemp.toFixed(1)}C)`;
  }

  // 3. Issue command if action is needed
  if (action !== "NO_ACTION") {
    // In a real IoT environment, we would publish to Firebase RTDB or MQTT here.
    // For now, we simulate the command by recording it.
    console.log(`[Fan Control] Silo ${siloId}: ${action} - ${reason}`);
    
    // Push the command to Firebase RTDB using the admin client
    const { fetchFirebaseDevices } = await import("@/lib/firebase-admin.server");
    // Pseudo-code to update Firebase, assuming we have a method for it
    // await updateFirebaseDevice(reading.device_id, { target_fan_state: action === "TURN_ON" ? 1 : 0 });
  }

  return { action, reason, currentTemp, targetTemp, dewPointGap };
});
