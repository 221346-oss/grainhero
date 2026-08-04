import { Composition } from "remotion";
import { SiloFlight } from "./SiloFlight";

export const RemotionRoot = () => (
  <Composition
    id="silo-flight"
    component={SiloFlight}
    durationInFrames={720}
    fps={30}
    width={1920}
    height={1080}
  />
);
