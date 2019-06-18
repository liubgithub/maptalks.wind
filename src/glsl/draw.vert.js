export default `precision mediump float;

attribute float a_index;

uniform sampler2D u_particles;
uniform float u_particles_res;

varying vec2 v_particle_pos;

uniform vec2 res;
uniform vec2 center;
uniform float level;

vec2 getNewUV(vec2 center, vec2 v_particle_pos) {
    vec2 centerUv = vec2((center.x + 180.0)/ 360.0, (center.y + 90.0) / 180.0);
    vec2 v = centerUv - vec2(0.5, 0.5);
    v_particle_pos = v_particle_pos + v;
    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {
        v_particle_pos.x = v_particle_pos.x + (centerUv.x - v_particle_pos.x) * (pow(2.0, level) - 1.0) / pow(2.0, level);
        v_particle_pos.y = v_particle_pos.y + (centerUv.y - v_particle_pos.y) * (pow(2.0, level) - 1.0) / pow(2.0, level);
    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {
        v_particle_pos.x = v_particle_pos.x + (centerUv.x - v_particle_pos.x) * (pow(2.0, level) - 1.0) / pow(2.0, level);
        v_particle_pos.y = v_particle_pos.y - (v_particle_pos.y - centerUv.y) * (pow(2.0, level) - 1.0) / pow(2.0, level);
    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {
        v_particle_pos.x = v_particle_pos.x - (v_particle_pos.x - centerUv.x) * (pow(2.0, level) - 1.0) / pow(2.0, level);
        v_particle_pos.y = v_particle_pos.y + (centerUv.y - v_particle_pos.y) * (pow(2.0, level) - 1.0) / pow(2.0, level);
    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {
        v_particle_pos.x = v_particle_pos.x - (v_particle_pos.x - centerUv.x) * (pow(2.0, level) - 1.0) / pow(2.0, level);
        v_particle_pos.y = v_particle_pos.y - (v_particle_pos.y - centerUv.y) * (pow(2.0, level) - 1.0) / pow(2.0, level);
    }
    return v_particle_pos;
}

void main() {
    vec4 color = texture2D(u_particles, vec2(
        fract(a_index / u_particles_res),
        floor(a_index / u_particles_res) / u_particles_res));

    // decode current particle position from the pixel's RGBA value
    v_particle_pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a);

    gl_PointSize = 0.01;
    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);
    v_particle_pos = getNewUV(center, v_particle_pos);
}`;
