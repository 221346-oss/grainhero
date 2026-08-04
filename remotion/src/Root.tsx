import { Composition } from "remotion";
import { SiloFlight } from "./SiloFlight";
import { SiloFlightV2 } from "./SiloFlightV2";

export const RemotionRoot = () => (
  <>
    <Composition id="silo-flight" component={SiloFlight} durationInFrames={720} fps={30} width={1920} height={1080} />
    <Composition id="silo-flight-v2" component={SiloFlightV2} durationInFrames={720} fps={30} width={1920} height={1080} />
  </>
);
