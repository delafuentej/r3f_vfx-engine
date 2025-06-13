import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  Stats,
  useTexture,
} from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import VFXParticles from "./vfxs/VFXParticles";
import VFXEmitter from "./vfxs/VFXEmitter";

const Experience = () => {
  const alphaMap = useTexture("/textures/transparent/star_04.png");
  const emitterGold = useRef();
  // const emitterBlue = useRef();

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    emitterGold.current.position.x = Math.sin(time * 6) * 1.5;
    emitterGold.current.position.y = Math.cos(time * 3) * 1.5;
    emitterGold.current.position.z = Math.sin(time * 4) * 1.5;

    // emitterBlue.current.position.x = Math.cos(time * 6) * 1.5;
    // emitterBlue.current.position.y = Math.sin(time * 3) * 1.5;
    // emitterBlue.current.position.z = Math.cos(time * 4) * 1.5;
  });

  return (
    <>
      <Stats />
      <OrbitControls enablePan={false} />
      <Environment preset="sunset" />
      <VFXParticles
        name="sparks"
        geometry={<capsuleGeometry args={[0.02, 0.2, 1, 8]} />}
        // alphaMap={alphaMap}
        settings={{
          nbParticles: 10000,
          intensity: 1.5,
          renderMode: "mesh",
          fadeSize: [0, 1],
          fadeAlpha: [0.5, 0.5],
          gravity: [0, -10, 0],
        }}
      />
      {/* Warning:  Nothing happened because we have to tel the renderer that  the buffer have been updated : needsUpdate method */}
      <VFXEmitter
        debug
        ref={emitterGold}
        emitter="sparks"
        settings={{
          duration: 4,
          delay: 0,
          nbParticles: 1000,
          spawnMode: "burst",
          loop: false,
          startPositionMin: [0, 0, 0],
          startPositionMax: [0, 0, 0],
          startRotationMin: [0, 0, 0],
          startRotationMax: [0, 0, 0],
          particlesLifetime: [0.1, 1],
          speed: [1, 38],
          directionMin: [-0.5, 0, -0.5],
          directionMax: [0.5, 1, 0.5],
          rotationSpeedMin: [0, 0, 0],
          rotationSpeedMax: [0, 0, 0],
          colorStart: ["#ff1e00", "#ffffff"],
          colorEnd: ["#0fa257", "#ffffff"],
          size: [0.1, 2.7],
        }}
      />

      {/* <VFXEmitter
        ref={emitterBlue}
        debug
        emitter="sparks"
        settings={{
          nbParticles: 1000,
          colorStart: ["blue", "white"],
          size: [0.1, 0.3],
          startPositionMin: [0, 0, 0],
          startPositionMax: [0, 0, 0],
          directionMin: [-0.5, 0, -0.5],
          directionMax: [0.5, 1, 0.5],
          speed: [1, 5],
          loop: true,
        }}
      /> */}
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={1} mipmapBlur />
      </EffectComposer>
    </>
  );
};

export default Experience;
