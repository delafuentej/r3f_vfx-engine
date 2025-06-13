import { shaderMaterial } from "@react-three/drei";
import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  PlaneGeometry,
  Vector3,
  Euler,
  Quaternion,
  Matrix4,
  Color,
  DynamicDrawUsage,
  AdditiveBlending,
} from "three";
import { extend, useFrame } from "@react-three/fiber";
import { randFloatSpread, randFloat } from "three/src/math/MathUtils.js";
import particlesVertexShader from "../../shaders/particles/vertex.glsl";
import particlesFragmentShader from "../../shaders/particles/fragment.glsl";
import { useVFX } from "../../store/vfxs/VFXStore";

//InstanceMatrix: the instance mesh uses a matrix to define the position, the rotation
// scale of each instance. By updating the instanceMatrix property of our mesh, we can move,
// rotate, scale each particle individually
// the matrix is 4x4 matrix that represents the transformation of the particle
//Matrix4 of three.js allows us to compose an decompose the matrix to set/get pos, rot, sca,
// of the particle in a more human-readable way

const tmpPosition = new Vector3();
const tmpRotationEuler = new Euler();
const tmpRotation = new Quaternion();
const tmpScale = new Vector3(1, 1, 1);
const tmpMatrix = new Matrix4();

const tmpColor = new Color();

const VFXParticles = ({ name, settings = {}, alphaMap, geometry }) => {
  const {
    nbParticles = 1000,
    intensity = 1,
    renderMode = "mesh",
    fadeSize = [0.1, 0.9],
    fadeAlpha = [0, 1],
    gravity = [0, 0, 0],
  } = settings;
  const meshRef = useRef();
  const defaultGeometry = useMemo(() => new PlaneGeometry(0.5, 0.5), []);

  //instanced buffer attributes:
  // useState => to create the different buffers for our attributes to avoid
  // to avoid recreating them at each render
  //The Float32Array is used to store the values of the attributes.
  //We multiply the number of particles by the number of components
  //of the attribute to get the total number of values in the array.
  const [attributeArrays] = useState({
    instanceColor: new Float32Array(nbParticles * 3),
    instanceColorEnd: new Float32Array(nbParticles * 3),
    instanceDirection: new Float32Array(nbParticles * 3),
    instanceLifetime: new Float32Array(nbParticles * 2),
    instanceSpeed: new Float32Array(nbParticles * 1),
    instanceRotationSpeed: new Float32Array(nbParticles * 3),
  });

  // emit function to setup our particles:
  const cursor = useRef(0);

  // attribute update range => we only need to update the range of the attributes that have changed.
  // as we are not spawning millions of particles at once we could gain  some performance by updating
  // only the range of the attributes that have changed
  const lastCursor = useRef(0);
  const needsUpdate = useRef(false);

  // wenn calling the emit function we pass a setup callback function  that will return the settings
  // for each particle.  we call it for each particle and set the attributes accordingly
  const emit = (count, setup) => {
    const instanceColor =
      meshRef.current.geometry.getAttribute("instanceColor");
    const instanceColorEnd =
      meshRef.current.geometry.getAttribute("instanceColorEnd");
    const instanceDirection =
      meshRef.current.geometry.getAttribute("instanceDirection");
    const instanceLifetime =
      meshRef.current.geometry.getAttribute("instanceLifetime");
    const instanceSpeed =
      meshRef.current.geometry.getAttribute("instanceSpeed");
    const instanceRotationSpeed = meshRef.current.geometry.getAttribute(
      "instanceRotationSpeed"
    );

    for (let i = 0; i < count; i++) {
      if (cursor.current >= nbParticles) cursor.current = 0;

      const {
        scale,
        rotation,
        rotationSpeed,
        position,
        direction,
        lifetime,
        colorStart,
        colorEnd,
        speed,
      } = setup();
      // const position = [
      //   randFloatSpread(0.1),
      //   randFloatSpread(0.1),
      //   randFloatSpread(0.1),
      // ];
      // const scale = [
      //   randFloatSpread(1),
      //   randFloatSpread(1),
      //   randFloatSpread(1),
      // ];
      // const rotation = [
      //   randFloatSpread(Math.PI),
      //   randFloatSpread(Math.PI),
      //   randFloatSpread(Math.PI),
      // ];
      //to compose our matrix
      tmpPosition.set(...position);
      tmpRotationEuler.set(...rotation);
      tmpRotation.setFromEuler(tmpRotationEuler);
      tmpScale.set(...scale);
      tmpMatrix.compose(tmpPosition, tmpRotation, tmpScale);
      meshRef.current.setMatrixAt(cursor.current, tmpMatrix);

      // tmpColor.setRGB(Math.random(), Math.random(), Math.random());
      tmpColor.set(colorStart);
      instanceColor.set(
        [tmpColor.r, tmpColor.g, tmpColor.b],
        cursor.current * 3
      );

      // tmpColor.setRGB(Math.random(), Math.random(), Math.random());
      tmpColor.set(colorEnd);
      instanceColorEnd.set(
        [tmpColor.r, tmpColor.g, tmpColor.b],
        cursor.current * 3
      );
      //direction
      // const direction = [
      //   randFloatSpread(0.5), //x
      //   1, //y
      //   // randFloatSpread(1), //y
      //   randFloatSpread(0.5), //z
      // ];
      instanceDirection.set(direction, cursor.current * 3);
      //lifetime
      // const lifetime = [randFloat(0, 5), randFloat(0.1, 5)];
      instanceLifetime.set(lifetime, cursor.current * 2);
      // speed
      // const speed = randFloat(1, 2);
      instanceSpeed.set([speed], cursor.current);

      // rotation speed
      // const rotationSpeed = [
      //   randFloatSpread(3), //x
      //   randFloatSpread(3), //y
      //   randFloatSpread(3), //z
      // ];
      instanceRotationSpeed.set(rotationSpeed, cursor.current * 3);
      cursor.current++;
      cursor.current %= nbParticles;
    }

    // meshRef.current.instanceMatrix.needsUpdate = true;
    // instanceColor.needsUpdate = true;
    // instanceColorEnd.needsUpdate = true;
    // instanceDirection.needsUpdate = true;
    // instanceLifetime.needsUpdate = true;
    // instanceSpeed.needsUpdate = true;
    // instanceRotationSpeed.needsUpdate = true;
    needsUpdate.current = true;
  };

  const registerEmitter = useVFX((state) => state.registerEmitter);
  const unregisterEmitter = useVFX((state) => state.unregisterEmitter);

  useEffect(() => {
    registerEmitter(name, emit);
    return () => {
      unregisterEmitter(name);
    };
    // emit(nbParticles);
  }, []);

  //To animate our particles we will define attributes such as lifetime, speed,
  //direction so the computation can be done on the GPU.
  //Before doing that, we need to switch to a custom shader material to handle these
  //attributes as we don't have access and control over the attributes of the
  // meshBasicMaterial. => ParticlesMaterial

  //cpu: update values, only the uTime
  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    meshRef.current.material.uniforms.uTime.value = clock.getElapsedTime();
    meshRef.current.material.uniforms.uIntensity.value = intensity;
    meshRef.current.material.uniforms.uFadeSize.value = fadeSize;
    meshRef.current.material.uniforms.uFadeAlpha.value = fadeAlpha;
    meshRef.current.material.uniforms.uGravity.value = gravity;
  });

  const onBeforeRender = () => {
    if (!needsUpdate.current || !meshRef.current) return;

    const attributes = [
      meshRef.current.instanceMatrix,
      meshRef.current.geometry.getAttribute("instanceColor"),
      meshRef.current.geometry.getAttribute("instanceColorEnd"),
      meshRef.current.geometry.getAttribute("instanceDirection"),
      meshRef.current.geometry.getAttribute("instanceLifetime"),
      meshRef.current.geometry.getAttribute("instanceSpeed"),
      meshRef.current.geometry.getAttribute("instanceRotationSpeed"),
    ];

    attributes.forEach((attribute) => {
      attribute.clearUpdateRanges();
      if (lastCursor.current > cursor.current) {
        attribute.addUpdateRange(0, cursor.current * attribute.itemSize);
        attribute.addUpdateRange(
          lastCursor.current * attribute.itemSize,
          (nbParticles - lastCursor.current) * attribute.itemSize
        );
      } else {
        attribute.addUpdateRange(
          lastCursor.current * attribute.itemSize,
          (cursor.current - lastCursor.current) * attribute.itemSize
        );
      }
      attribute.needsUpdate = true;
    });
    lastCursor.current = cursor.current;
    needsUpdate.current = false;
  };

  // other rest of the process updating on the GPU

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[defaultGeometry, null, nbParticles]}
        onBeforeRender={onBeforeRender}
      >
        {geometry}
        <particlesMaterial
          blending={AdditiveBlending}
          defines={{
            BILLBOARD_MODE: renderMode === "billboard",
            MESG_MODE: renderMode === "mesh",
          }}
          transparent
          alphaMap={alphaMap}
          depthWrite={false}
        />
        <instancedBufferAttribute
          attach={"geometry-attributes-instanceColor"}
          args={[attributeArrays.instanceColor]}
          itemSize={3}
          count={nbParticles}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          attach={"geometry-attributes-instanceColorEnd"}
          args={[attributeArrays.instanceColorEnd]}
          itemSize={3}
          count={nbParticles}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          attach={"geometry-attributes-instanceDirection"}
          args={[attributeArrays.instanceDirection]}
          itemSize={3}
          count={nbParticles}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          attach={"geometry-attributes-instanceLifetime"}
          args={[attributeArrays.instanceLifetime]}
          itemSize={2}
          count={nbParticles}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          attach={"geometry-attributes-instanceSpeed"}
          args={[attributeArrays.instanceSpeed]}
          itemSize={1}
          count={nbParticles}
          usage={DynamicDrawUsage}
        />
        <instancedBufferAttribute
          attach={"geometry-attributes-instanceRotationSpeed"}
          args={[attributeArrays.instanceRotationSpeed]}
          itemSize={3}
          count={nbParticles}
          usage={DynamicDrawUsage}
        />
      </instancedMesh>
    </>
  );
};

const ParticlesMaterial = shaderMaterial(
  {
    uTime: 0,
    uIntensity: 1,
    uFadeSize: [0.1, 0.9],
    uFadeAlpha: [0, 1],
    uGravity: [0, 0, 0],
    alphaMap: null,
  },
  particlesVertexShader,
  particlesFragmentShader
);

extend({ ParticlesMaterial });

export default VFXParticles;
