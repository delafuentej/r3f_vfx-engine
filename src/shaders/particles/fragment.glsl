uniform float uIntensity;
uniform vec2 uFadeAlpha;
uniform sampler2D alphaMap;

varying vec2 vUv;
varying vec3 vColor;
varying vec3 vColorEnd;
varying float vProgress;


void main() {
     if(vProgress < 0.0 || vProgress > 1.0) discard;

  vec3 finalColor = mix(vColor, vColorEnd, vProgress);
  finalColor * uIntensity;

  float alpha = smoothstep(0.0, uFadeAlpha.x, vProgress) *  smoothstep(1.01, uFadeAlpha.y, vProgress);

   #ifdef USE_ALPHAMAP
    vec2 uv = vUv;
    vec4 tex = texture2D(alphaMap, uv);
    gl_FragColor = vec4(finalColor, tex.a * alpha);
  #else
    gl_FragColor = vec4(finalColor, alpha);
  #endif
 
}