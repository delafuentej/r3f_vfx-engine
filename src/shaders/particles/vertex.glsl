uniform float uTime;
uniform vec2 uFadeSize;
uniform vec3 uGravity;


varying vec2 vUv;
varying vec3 vColor;
varying vec3 vColorEnd;
varying float vProgress;

attribute float instanceSpeed;
attribute vec3 instanceRotationSpeed;
attribute vec3 instanceDirection;
attribute vec3 instanceColor;
attribute vec3 instanceColorEnd;
attribute vec2 instanceLifetime;// x: startTime; y: duration

#include ../includes/rotationX.glsl
#include ../includes/rotationY.glsl
#include ../includes/rotationZ.glsl
#include ../includes/billboard.glsl




void main(){
 
    float startTime = instanceLifetime.x;
    float duration = instanceLifetime.y;
    float age = uTime - startTime;
    vProgress = age / duration;

    if(vProgress < 0.0 || vProgress > 1.0){
        gl_Position = vec4(vec3(9999.0), 1.0);
        return;
    }

    float scale = smoothstep(0.0, uFadeSize.x, vProgress) * smoothstep(1.01, uFadeSize.y, vProgress);

    // to normalize the direction
    vec3 normalizedDirection = length(instanceDirection) > 0.0 ? normalize(instanceDirection) : vec3(0.0);

    // gravity force
    vec3 gravityForce = 0.5 * uGravity * (age * age);

    vec3 offset = normalizedDirection * age * instanceSpeed;
    offset += gravityForce;

    // rotation speed
    vec3 rotationSpeed = instanceRotationSpeed * age;
    mat4 rotX = rotationX(rotationSpeed.x);
    mat4 rotY = rotationY(rotationSpeed.y);
    mat4 rotZ = rotationZ(rotationSpeed.z);
    mat4 rotationMatrix = rotZ * rotY * rotX;

     vec4 modelViewPosition;
    #ifdef MESH_MODE
    // mesh mode
    vec4 startPosition = modelMatrix * instanceMatrix * rotationMatrix * vec4(position * scale, 1.0);
    vec3 instancePosition = startPosition.xyz;
    vec3 finalPosition = instancePosition + offset;
    modelViewPosition = modelViewMatrix * vec4(finalPosition, 1.0);

    #endif

    #ifdef BILLBOARD_MODE
    // BILLBOARD MODE
    vec4 localPosition = vec4(position, 1.0);
    localPosition.xyz = billboard(position.xy, viewMatrix) * scale;

    vec4 worldPosition = modelMatrix * instanceMatrix * rotationMatrix * localPosition;
    worldPosition.xyz += offset;
    modelViewPosition = modelViewMatrix * worldPosition;


    #endif
    //position
    vec4 startPosition = modelMatrix * instanceMatrix * rotationMatrix * vec4(position, 1.0);
    vec3 instancePosition = startPosition.xyz;

    vec3 finalPosition = instancePosition + offset;

     modelViewPosition = modelViewMatrix * vec4(finalPosition, 1.0);
 
    //gl_Position = projectionMatrix * modelViewMatrix * vec4(instanceMatrix * vec4(position, 1.0));
     gl_Position = projectionMatrix * modelViewPosition;
    vUv = uv;
    vColor = instanceColor;
    vColorEnd = instanceColorEnd;
}