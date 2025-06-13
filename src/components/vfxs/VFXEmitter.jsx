import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Vector3, Quaternion, Euler } from "three";
import { useFrame } from "@react-three/fiber";
import { useVFX } from "../../store/vfxs/VFXStore";
import { randFloat, randInt } from "three/src/math/MathUtils.js";
import { VFXBuilder } from "./VFXBuilder";
// this component will be responsible for spawning from our VFXParticles
//We use forwardRef and useImperativeHandle to expose the ref of the object3D component to the parent component.
// That way we can manipulate the VFXEmitter component from the outside.

const worldPosition = new Vector3();
const worldQuaternion = new Quaternion();
const worldEuler = new Euler();
const worldRotation = new Euler();
const worldScale = new Vector3();

/**
 * @typedef {Object} VFXEmitterSettings
 * @property {number} [duration=1]
 * @property {number} [nbParticles=1000]
 * @property {"time"|"burst"} [spawnMode="time"]
 * @property {boolean} [loop=false]
 * @property {number} [delay=0]
 * @property {string[]} [colorStart=["white", "skyblue"]]
 * @property {string[]} [colorEnd=[]]
 * @property {number[]} [particlesLifetime=[0.1, 1]]
 * @property {number[]} [speed=[5, 20]]
 * @property {number[]} [size=[0.1, 1]]
 * @property {number[]} [startPositionMin=[-1, -1, -1]]
 * @property {number[]} [startPositionMax=[1, 1, 1]]
 * @property {number[]} [startRotationMin=[0, 0, 0]]
 * @property {number[]} [startRotationMax=[0, 0, 0]]
 * @property {number[]} [rotationSpeedMin=[0, 0, 0]]
 * @property {number[]} [rotationSpeedMax=[0, 0, 0]]
 * @property {number[]} [directionMin=[0, 0, 0]]
 * @property {number[]} [directionMax=[0, 0, 0]]
 */

// the VFXEmitter Props:

/**
 * @typedef {Object} VFXEmitterProps
 * @property {boolean} [debug]
 * @property {VFXEmitterSettings} [settings]
 * @property {string} emitter
 * @property {React.RefObject<THREE.Object3D>} [ref]
 */

/**
 * @type React.FC<VFXEmitterProps>
 */
const VFXEmitter = forwardRef(
  ({ debug = false, emitter, settings = {}, ...props }, forwardRef) => {
    const [
      {
        duration = 1, // the time it takes to emit all the particles
        nbParticles = 1000, // number of particles to emit
        spawnMode = "time", // time, burst:  the mode of spawning
        loop = false, // to determinate if the emitter should emit particles indefinitely
        delay = 0, // the time to wait before starting to emit particles
        colorStart = ["white", "skyblue"],
        colorEnd = [],
        particlesLifetime = [0.1, 1],
        speed = [5, 20],
        size = [0.1, 1],
        startPositionMin = [-1, -1, -1],
        startPositionMax = [1, 1, 1],
        startRotationMin = [0, 0, 0],
        startRotationMax = [0, 0, 0],
        rotationSpeedMin = [0, 0, 0],
        rotationSpeedMax = [0, 0, 0],
        directionMin = [0, 0, 0],
        directionMax = [0, 0, 0],
      },
      setSettings,
    ] = useState(settings);

    const emit = useVFX((state) => state.emit);

    const ref = useRef();
    useImperativeHandle(forwardRef, () => ref.current);

    const emitted = useRef(0); // it will store the number of particles emitted
    const elapsedTime = useRef(0); // is is based on the component's lifecicle: it will store the time elapsed since the emitter started (it differs from the clock.getElapsedTime())

    // the logic to emit particles => useFrame
    useFrame(({ clock }, delta) => {
      const time = clock.getElapsedTime();
      if (emitted.current < nbParticles || loop) {
        if (!ref) return;
        const particlesToEmit =
          spawnMode === "burst" // "burst" emit all the particles at once
            ? nbParticles
            : Math.max(
                0,
                Math.floor(
                  ((elapsedTime.current - delay) / duration) * nbParticles
                )
              );
        const rate = particlesToEmit - emitted.current;

        if (rate > 0 && elapsedTime.current >= delay) {
          emit(emitter, rate, () => {
            ref.current.updateWorldMatrix(true);
            const worldMatrix = ref.current.matrixWorld;
            worldMatrix.decompose(worldPosition, worldQuaternion, worldScale);
            worldEuler.setFromQuaternion(worldQuaternion);
            worldRotation.setFromQuaternion(worldQuaternion);

            const randSize = randFloat(size[0], size[1]);
            const color = colorStart[randInt(0, colorStart.length - 1)];
            return {
              position: [
                worldPosition.x +
                  randFloat(startPositionMin[0], startPositionMax[0]),
                worldPosition.y +
                  randFloat(startPositionMin[1], startPositionMax[1]),
                worldPosition.z +
                  randFloat(startPositionMin[2], startPositionMax[2]),
              ],
              direction: [
                randFloat(directionMin[0], directionMax[0]),
                randFloat(directionMin[1], directionMax[1]),
                randFloat(directionMin[2], directionMax[2]),
              ],
              scale: [randSize, randSize, randSize],
              rotation: [
                worldRotation.x +
                  randFloat(startRotationMin[0], startRotationMax[0]),
                worldRotation.y +
                  randFloat(startRotationMin[1], startRotationMax[1]),
                worldRotation.z +
                  randFloat(startRotationMin[2], startRotationMax[2]),
              ],
              rotationSpeed: [
                randFloat(rotationSpeedMin[0], rotationSpeedMax[0]),
                randFloat(rotationSpeedMin[1], rotationSpeedMax[1]),
                randFloat(rotationSpeedMin[2], rotationSpeedMax[2]),
              ],
              lifetime: [
                time,
                randFloat(particlesLifetime[0], particlesLifetime[1]),
              ],
              colorStart: color,
              colorEnd: colorEnd?.length
                ? colorEnd[randInt(0, colorEnd.length - 1)]
                : color,
              speed: [randFloat(speed[0], speed[1])],
            };
          });
          emitted.current += rate;
        }
      }
      elapsedTime.current += delta;
    });

    //debugger
    const onRestart = useCallback(() => {
      emitted.current = 0;
      elapsedTime.current = 0;
    }, []);

    const settingsBuilder = useMemo(
      () =>
        debug ? (
          <VFXBuilder
            settings={settings}
            onChange={setSettings}
            onRestart={onRestart}
          />
        ) : null,
      [debug]
    );

    return (
      <>
        {settingsBuilder}
        <object3D {...props} ref={ref} />
      </>
    );
  }
);

export default VFXEmitter;
