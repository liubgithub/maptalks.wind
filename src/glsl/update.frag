precision highp float;

uniform sampler2D u_particles;
uniform sampler2D u_wind;
uniform vec2 u_wind_res;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform float u_rand_seed;
uniform float u_speed_factor;
uniform float u_drop_rate;
uniform float u_drop_rate_bump;
uniform vec4 full_extent;
uniform float full_width;
uniform float full_height;

varying vec2 v_tex_pos;

uniform vec4 extent;
uniform float dx;
uniform float dy;

// pseudo-random generator
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float rand(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}

vec2 getNewUV(vec2 uv) {
    // float xmin = (extent.x - full_extent.x) / (full_width * dx);
    // float ymin = (extent.z - full_extent.z) / (full_height * dy);
    // float xmax = (extent.y - full_extent.x) / (full_width * dx);
    // float ymax = (extent.w - full_extent.z) / (full_height * dy);
    float xmin = (extent.x - (-180.0)) / (360.0);
    float ymin = (extent.z - (-90.0)) / (180.0);
    float xmax = (extent.y - (-180.0)) / (360.0);
    float ymax = (extent.w - (-90.0)) / (180.0);
    float xWidth = xmax - xmin;
    float yHeight = ymax - ymin;
    vec2 centerUv = vec2(0.5, 0.5);
    vec2 v_particle_pos = uv;

    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {
        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;
        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;
    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {
        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;
        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;
    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {
        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;
        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;
    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {
        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;
        v_particle_pos.y = (v_particle_pos.y -  1.0) * yHeight + ymax;
    }
    if (v_particle_pos.x > 1.0) {
        v_particle_pos.x = v_particle_pos.x - 1.0;
    } else if(v_particle_pos.x < 0.0) {
        v_particle_pos.x = v_particle_pos.x + 1.0;
    }
    return v_particle_pos;
}

// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation
vec2 lookup_wind(const vec2 uv) {
    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering
    vec2 px = 1.0 / u_wind_res;
    // vec2 vc = (floor(uv * u_wind_res)) * px;
    // vec2 f = fract(uv * u_wind_res);
    vec2 vc = (floor(uv * u_wind_res)) * px;
    vec2 f = fract(uv * u_wind_res);
    vec2 tl = texture2D(u_wind, vc).rg;
    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;
    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;
    vec2 br = texture2D(u_wind, vc + px).rg;
    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

void main() {
    vec4 color = texture2D(u_particles, v_tex_pos);
    vec2 pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a); // decode particle position from pixel RGBA
    vec2 newUV = getNewUV(pos);
    if (newUV.y < 0.0 || newUV.y > 1.0) {
        gl_FragColor = vec4(0.0);
    } else {
        vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(newUV));
        float speed_t = length(velocity) / length(u_wind_max);
    
        // take EPSG:4236 distortion into account for calculating where the particle moved
        float distortion = cos(radians(newUV.y));
        vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;
    
        // update particle position, wrapping around the date line
        pos = fract(1.0 + pos + offset);
    
        // a random seed to use for the particle drop
        vec2 seed = (pos + v_tex_pos) * u_rand_seed;
    
        // drop rate is a chance a particle will restart at random position, to avoid degeneration
        float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;
        float drop = step(1.0 - drop_rate, rand(seed));
    
        vec2 random_pos = vec2(
            rand(seed + 1.3),
            rand(seed + 2.1));
        pos = mix(pos, random_pos, drop);
    
        // encode the new particle position back into RGBA
        gl_FragColor = vec4(
            fract(pos * 255.0),
            floor(pos * 255.0) / 255.0);
    }
}
