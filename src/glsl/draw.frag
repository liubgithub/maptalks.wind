precision mediump float;

uniform sampler2D u_wind;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform sampler2D u_color_ramp;

varying vec2 v_particle_pos;
uniform vec4 extent;

uniform vec4 full_extent;
uniform float full_width;
uniform float full_height;
uniform float dx;
uniform float dy;

//重新计算视图区域的纹理采样坐标，将粒子缩放到extent范围内
vec2 computeUV(vec2 v_particle_pos) {
    // float xmin = (extent.x - full_extent.x) / (full_width * dx);
    // float ymin = (extent.z - full_extent.z) / (full_height * dy);
    // float xmax = (extent.y - full_extent.x) / (full_width * dx);
    // float ymax = (extent.w - full_extent.z) / (full_height * dy);
    float xmin = (extent.x - (-180.0)) / (360.0 * 1.0);
    float ymin = (extent.z - (-90.0)) / (180.0 * 1.0);
    float xmax = (extent.y - (-180.0)) / (360.0 * 1.0);
    float ymax = (extent.w - (-90.0)) / (180.0 * 1.0);
    float xWidth = xmax - xmin;
    float yHeight = ymax - ymin;
    vec2 centerUv = vec2(0.5, 0.5);

    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {
        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;
        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;
    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {
        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;
        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;
    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {
        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;
        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;
    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {
        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;
        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax;
    }
    if (v_particle_pos.x > 1.0) {
        v_particle_pos.x = v_particle_pos.x - 1.0;
    } else if(v_particle_pos.x < 0.0) {
        v_particle_pos.x = v_particle_pos.x + 1.0;
    }
    return v_particle_pos;
}

void main() {
    vec2 particle_pos = computeUV(v_particle_pos);
    if (particle_pos.y < 0.0 || particle_pos.y > 1.0) {
        gl_FragColor = vec4(0.0);
    } else {
        vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, particle_pos).rg);
        float speed_t = length(velocity) / length(u_wind_max);
    
        // color ramp is encoded in a 16x16 texture
        vec2 ramp_pos = vec2(
            fract(16.0 * speed_t),
            floor(16.0 * speed_t) / 16.0);
    
        gl_FragColor = texture2D(u_color_ramp, ramp_pos);
    }
}
