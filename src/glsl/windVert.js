export default `precision mediump float;

attribute vec3 a_pos;
uniform mat4 projViewModelMatrix;
attribute vec2 uv;
varying vec2 v_tex_pos;

void main() {
    v_tex_pos = uv;
    gl_Position = projViewModelMatrix * vec4(a_pos, 1.0);
}`;
