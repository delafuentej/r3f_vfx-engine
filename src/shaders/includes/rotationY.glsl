mat4 rotationY(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat4(
       c,  0,  s,  0,
       0,  1,  0,  0,
      -s,  0,  c,  0,
       0,  0,  0,  1
  );
}