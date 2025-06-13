mat4 rotationZ(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat4(
      c, -s,  0,  0,
      s,  c,  0,  0,
      0,  0,  1,  0,
      0,  0,  0,  1
  );
}