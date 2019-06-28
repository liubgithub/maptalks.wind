/*!
 * maptalks.wind v0.1.2
 * LICENSE : UNLICENSED
 * (c) 2016-2019 maptalks.org
 */
import { renderer, Util, Ajax, Coordinate, Layer } from 'maptalks';
import { createREGL, reshader, mat4 } from '@maptalks/gl';

var drawVert = "precision mediump float;\n\n\n\nattribute float a_index;\n\n\n\nuniform sampler2D u_particles;\n\nuniform float u_particles_res;\n\n\n\nvarying vec2 v_particle_pos;\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_particles, vec2(\n\n        fract(a_index / u_particles_res),\n\n        floor(a_index / u_particles_res) / u_particles_res));\n\n\n\n    // decode current particle position from the pixel's RGBA value\n\n    v_particle_pos = vec2(\n\n        color.r / 255.0 + color.b,\n\n        color.g / 255.0 + color.a);\n\n\n\n    gl_PointSize = 1.0;\n\n    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);\n\n}\n\n";

var drawFrag = "precision mediump float;\n\n\n\nuniform sampler2D u_wind;\n\nuniform vec2 u_wind_min;\n\nuniform vec2 u_wind_max;\n\nuniform sampler2D u_color_ramp;\n\n\n\nvarying vec2 v_particle_pos;\n\nuniform vec4 extent;\n\n\n\n//重新计算视图区域的纹理采样坐标，将粒子缩放到extent范围内\n\nvec2 computeUV(vec2 v_particle_pos) {\n\n    float xmin = (extent.x + 180.0) / 360.0;\n\n    float ymin = (extent.z + 90.0) / 180.0;\n\n    float xmax = (extent.y + 180.0) / 360.0;\n\n    float ymax = (extent.w + 90.0) / 180.0;\n\n    float xWidth = xmax - xmin;\n\n    float yHeight = ymax - ymin;\n\n    vec2 centerUv = vec2(0.5, 0.5);\n\n\n\n    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax;\n\n    }\n\n    if (v_particle_pos.x > 1.0) {\n\n        v_particle_pos.x = v_particle_pos.x - 1.0;\n\n    } else if(v_particle_pos.x < 0.0) {\n\n        v_particle_pos.x = v_particle_pos.x + 1.0;\n\n    }\n\n    return v_particle_pos;\n\n}\n\n\n\nvoid main() {\n\n    vec2 particle_pos = computeUV(v_particle_pos);\n\n    if (particle_pos.y < 0.0 || particle_pos.y > 1.0) {\n\n        gl_FragColor = vec4(0.0);\n\n    } else {\n\n        vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, particle_pos).rg);\n\n        float speed_t = length(velocity) / length(u_wind_max);\n\n    \n\n        // color ramp is encoded in a 16x16 texture\n\n        vec2 ramp_pos = vec2(\n\n            fract(16.0 * speed_t),\n\n            floor(16.0 * speed_t) / 16.0);\n\n    \n\n        gl_FragColor = texture2D(u_color_ramp, ramp_pos);\n\n    }\n\n}\n\n";

var quadVert = "precision mediump float;\n\n\n\nattribute vec2 a_pos;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    v_tex_pos = a_pos;\n\n    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);\n\n}\n\n";

var screenFrag = "precision mediump float;\n\n\n\nuniform sampler2D u_screen;\n\nuniform float u_opacity;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);\n\n    // a hack to guarantee opacity fade out even with a value close to 1.0\n\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\n\n}\n\n";

var updateFrag = "precision highp float;\n\n\n\nuniform sampler2D u_particles;\n\nuniform sampler2D u_wind;\n\nuniform vec2 u_wind_res;\n\nuniform vec2 u_wind_min;\n\nuniform vec2 u_wind_max;\n\nuniform float u_rand_seed;\n\nuniform float u_speed_factor;\n\nuniform float u_drop_rate;\n\nuniform float u_drop_rate_bump;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nuniform vec4 extent;\n\n\n\n// pseudo-random generator\n\nconst vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);\n\nfloat rand(const vec2 co) {\n\n    float t = dot(rand_constants.xy, co);\n\n    return fract(sin(t) * (rand_constants.z + t));\n\n}\n\n\n\nvec2 getNewUV(vec2 uv) {\n\n    float xmin = (extent.x + 180.0) / 360.0;\n\n    float ymin = (extent.z + 90.0) / 180.0;\n\n    float xmax = (extent.y + 180.0) / 360.0;\n\n    float ymax = (extent.w + 90.0) / 180.0;\n\n    float xWidth = xmax - xmin;\n\n    float yHeight = ymax - ymin;\n\n    vec2 centerUv = vec2(0.5, 0.5);\n\n    vec2 v_particle_pos = uv;\n\n\n\n    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;\n\n        v_particle_pos.y = (v_particle_pos.y -  1.0) * yHeight + ymax;\n\n    }\n\n    if (v_particle_pos.x > 1.0) {\n\n        v_particle_pos.x = v_particle_pos.x - 1.0;\n\n    } else if(v_particle_pos.x < 0.0) {\n\n        v_particle_pos.x = v_particle_pos.x + 1.0;\n\n    }\n\n    return v_particle_pos;\n\n}\n\n\n\n// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation\n\nvec2 lookup_wind(const vec2 uv) {\n\n    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering\n\n    vec2 px = 1.0 / u_wind_res;\n\n    // vec2 vc = (floor(uv * u_wind_res)) * px;\n\n    // vec2 f = fract(uv * u_wind_res);\n\n    vec2 vc = (floor(uv * u_wind_res)) * px;\n\n    vec2 f = fract(uv * u_wind_res);\n\n    vec2 tl = texture2D(u_wind, vc).rg;\n\n    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;\n\n    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;\n\n    vec2 br = texture2D(u_wind, vc + px).rg;\n\n    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);\n\n}\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_particles, v_tex_pos);\n\n    vec2 pos = vec2(\n\n        color.r / 255.0 + color.b,\n\n        color.g / 255.0 + color.a); // decode particle position from pixel RGBA\n\n    vec2 newUV = getNewUV(pos);\n\n    if (newUV.y < 0.0 || newUV.y > 1.0) {\n\n        gl_FragColor = vec4(0.0);\n\n    } else {\n\n        vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(newUV));\n\n        float speed_t = length(velocity) / length(u_wind_max);\n\n    \n\n        // take EPSG:4236 distortion into account for calculating where the particle moved\n\n        float distortion = cos(radians(newUV.y * 180.0 - 90.0));\n\n        vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;\n\n    \n\n        // update particle position, wrapping around the date line\n\n        pos = fract(1.0 + pos + offset);\n\n    \n\n        // a random seed to use for the particle drop\n\n        vec2 seed = (pos + v_tex_pos) * u_rand_seed;\n\n    \n\n        // drop rate is a chance a particle will restart at random position, to avoid degeneration\n\n        float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;\n\n        float drop = step(1.0 - drop_rate, rand(seed));\n\n    \n\n        vec2 random_pos = vec2(\n\n            rand(seed + 1.3),\n\n            rand(seed + 2.1));\n\n        pos = mix(pos, random_pos, drop);\n\n    \n\n        // encode the new particle position back into RGBA\n\n        gl_FragColor = vec4(\n\n            fract(pos * 255.0),\n\n            floor(pos * 255.0) / 255.0);\n\n    }\n\n}\n\n";

var windVert = "precision mediump float;\n\n\n\nattribute vec3 a_pos;\n\nuniform mat4 projViewModelMatrix;\n\nattribute vec2 uv;\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    v_tex_pos = uv;\n\n    gl_Position = projViewModelMatrix * vec4(a_pos, 1.0);\n\n}\n\n";

var windFrag = "precision mediump float;\n\nuniform sampler2D u_screen;\n\nuniform float u_opacity;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_screen, v_tex_pos);\n\n    // a hack to guarantee opacity fade out even with a value close to 1.0\n\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\n\n}\n\n";

/**
 * There are many rendering methods and glsl code
 * based on project finished by @mourner https://github.com/mourner 
 * and his project is here https://github.com/mapbox/webgl-wind.
 */

class WindLayerRenderer extends renderer.CanvasRenderer {

    constructor(layer) {
        super(layer);
        this._updateParams();
        this._windData = {};
    }

    draw() {
        this.prepareCanvas();
        this._renderWindScene();
    }

    drawOnInteracting() {
        this._renderWindScene();
    }

    needToRedraw() {
        return true;
    }

    hitDetect() {
        return false;
    }

    createContext() {
        if (this.canvas.gl && this.canvas.gl.wrap) {
            this.gl = this.canvas.gl.wrap();
        } else {
            const layer = this.layer;
            const attributes = layer.options.glOptions || {
                alpha: true,
                depth: true,
                //antialias: true,
                stencil : true
            };
            this.glOptions = attributes;
            this.gl = this.gl || this._createGLContext(this.canvas, attributes);
        }
        this.regl = createREGL({
            gl : this.gl,
            extensions : [
                // 'ANGLE_instanced_arrays',
                // 'OES_texture_float',
                // 'OES_texture_float_linear',
                'OES_element_index_uint',
                'OES_standard_derivatives'
            ],
            optionalExtensions : this.layer.options['glExtensions'] || []
        });
        this._initRenderer();
    }

    clearCanvas() {
        if (!this.canvas) {
            return;
        }
        this.regl.clear({
            color: [0, 0, 0, 0],
            depth: 1,
            stencil : 0
        });
        super.clearCanvas();
    }

    _updateParams() {
        this._particlesCount = this.layer.options.count;
        this._fadeOpacity = this.layer.options.fadeOpacity;
        this._speedFactor = this.layer.options.speedFactor;
        this._dropRate = this.layer.options.dropRate;
        this._dropRateBump = this.layer.options.dropRateBump;
        this._rampColors = this.layer.options.colors;
    }

    _initRenderer() {
        this.renderer = new reshader.Renderer(this.regl);
        const width = this.canvas.width || 1;
        const height = this.canvas.height || 1;
        this._canvasWidth = width;
        this._canvasHeight = height;
        this._prepareParticles();
        this._prepareTexture();
        this._prepareShader();
        this.setColorRamp(this._rampColors);
        this._framebuffer = this.regl.framebuffer({
            color: this.regl.texture({
                width,
                height,
                wrap: 'clamp'
            }),
            depth: true
        });
    }

    _prepareTexture() {
        const width = this.canvas.width || 1;
        const height = this.canvas.height || 1;
        const emptyPixels = new Uint8Array(width * height * 4);
        this._backgroundTexture = this.regl.texture({
            width,
            height,
            data : emptyPixels
        });
        this._screenTexture = this.regl.texture({
            width,
            height,
            data : emptyPixels
        });
        if(!this._windTexture) {
            this._prepareWindTexture();
        }
    }
    
    _prepareWindTexture() {
        //if gfs data
        if (Util.isString(this._windData) && this._windData.indexOf('.json') > -1) {
            Ajax.get(this._windData, (err, data) => {
                if (err) {
                    throw new Error(err);
                }
                this._windData = this._resolveGFS(JSON.parse(data));
                this._createWindTexture();
            });
        } else if (Util.isString(this._windData.data)) { //if image src
            const image = new Image();
            image.src = this._windData.data;
            image.onload = () => {
                this._windData.data = image;
                this._createWindTexture();
                this.layer.fire('windtexture-create-debug');
            };
        } else {
            this._createWindTexture();
        }
    }

    _createWindTexture() {
        if (!this._windData.data) {
            return;
        }
        this._windTexture = this.regl.texture({
            width : this._windData.width,
            height : this._windData.height,
            data : this._windData.data,
            mag: 'linear',
            min: 'linear'
        });
    }

    _prepareParticles() {
        const particleRes = this._particleStateResolution = Math.ceil(Math.sqrt(this._particlesCount));
        this._numParticles = particleRes * particleRes;
        const particleState = new Uint8Array(this._numParticles * 4);
        for (let i = 0; i < particleState.length; i++) {
            particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
        }
        if (!this.regl) {
            return;
        }
        // textures to hold the particle state for the current and the next frame
        this._particleStateTexture0 = this.regl.texture({
            data : particleState,
            width : particleRes,
            height : particleRes
        });
        this._particleStateTexture1 = this.regl.texture({
            data : particleState,
            width : particleRes,
            height : particleRes
        });

        this._particleIndices = new Float32Array(this._numParticles);
        for (let i = 0; i < this._numParticles; i++) {
            this._particleIndices[i] = i;
        }
    }

    _prepareShader() {
        const viewport = {
            x : 0,
            y : 0,
            width : () => {
                return this.canvas ? this.canvas.width : 1;
            },
            height : () => {
                return this.canvas ? this.canvas.height : 1;
            }
        };
        this.drawShader = new reshader.MeshShader({
            vert : drawVert,
            frag : drawFrag,
            uniforms : [
                'extent',
                'u_wind',
                'u_particles',
                'u_color_ramp',
                'u_particles_res',
                'u_wind_min',
                'u_wind_max'
            ],
            extraCommandProps : { viewport },
            defines : {}
        });

        this.screenShader = new reshader.MeshShader({
            vert : quadVert,
            frag : screenFrag,
            uniforms: [
                'u_screen',
                'u_opacity'
            ],
            extraCommandProps : {
                viewport
            },
            defines : {}
        });

        this.updateSHader = new reshader.MeshShader({
            vert : quadVert,
            frag : updateFrag,
            uniforms: [
                'extent',
                'u_wind',
                'u_particles',
                'u_rand_seed',
                'u_wind_res',
                'u_wind_min',
                'u_wind_max',
                'u_speed_factor',
                'u_drop_rate',
                'u_drop_rate_bump'
            ],
            extraCommandProps : { 
                viewport : {
                    x: 0,
                    y: 0,
                    width : () => {
                        return this._particleStateResolution;
                    },
                    height :() => {
                        return this._particleStateResolution;
                    }
                },
                dither: true 
            },
            defines : {}
        });

        this.windShader = new reshader.MeshShader({
            vert: windVert,
            frag: windFrag,
            uniforms: [
                'u_screen',
                'u_opacity',
                'projViewMatrix',
                {
                    name : 'projViewModelMatrix',
                    type : 'function',
                    fn : function (context, props) {
                        return mat4.multiply([], props['projViewMatrix'], props['modelMatrix']);
                    }
                }
            ],
            extraCommandProps: { 
                viewport
             },
            defines: {}
        });
    }
    
    _resolveGFS(gfsData) {
        const uData = gfsData[0];
        const vData = gfsData[1];
        const uMin = Math.min.apply(null, uData.data);
        const uMax = Math.max.apply(null, uData.data);
        const vMin = Math.min.apply(null, vData.data);
        const vMax = Math.max.apply(null, vData.data);
        const velocityData = [];
        for (let i = 0;i < uData.data.length;i++) {
            const r = Math.floor(255 * (uData.data[i] - uMin) / (uMax - uMin));
            velocityData.push(r);
            const g = Math.floor(255 * (vData.data[i] - vMin) / (vMax - vMin));
            velocityData.push(g);
            velocityData.push(0);
            velocityData.push(255);
        }
        return {
            "date" : uData.meta.date,
            "width": uData.header.nx,
            "height": uData.header.ny,
            "uMin": uMin,
            "uMax": uMax,
            "vMin": vMin,
            "vMax": vMax,
            "data" : velocityData
        }
    }
    _createGLContext(canvas, options) {
        const names = ['webgl', 'experimental-webgl'];
        let context = null;
        /* eslint-disable no-empty */
        for (let i = 0; i < names.length; ++i) {
            try {
                context = canvas.getContext(names[i], options);
            } catch (e) {}
            if (context) {
                break;
            }
        }
        return context;
        /* eslint-enable no-empty */
    }

    resizeCanvas() {
        if(this._backgroundTexture && this._screenTexture && this._isCanvasResize()) {
            const width = this.canvas.width;
            const height = this.canvas.height;
            const emptyPixels = new Uint8Array(width * height * 4);
            this._backgroundTexture({
                width,
                height,
                data : emptyPixels
            });
            this._screenTexture({
                width,
                height,
                data : emptyPixels
            });
            this._canvasWidth = width;
            this._canvasHeight = height;
        }
        super.resizeCanvas();
    }

    _isCanvasResize() {
        return this._canvasWidth != this.canvas.width || this._canvasHeight != this.canvas.height;
    }

    setData(data) {
        this._windData = data;
        if (this.regl) {
            this._prepareWindTexture();
        }
    }

    setParticlesCount(count) {
        // we create a square texture where each pixel will hold a particle position encoded as RGBA
        this._particlesCount = count;
        this._prepareParticles();
    }

    getParticlesCount() {
        return this._particlesCount;
    }

    setColorRamp(colors) {
        // lookup texture for colorizing the particles according to their speed
        this._colorRampTexture = this.regl.texture({
            width : 16,
            height : 16,
            data : this._getColorRamp(colors),
            mag : 'linear',
            min : 'linear'
        });
    }

    _getColorRamp(colors) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 1;
        const gradient = ctx.createLinearGradient(0, 0, 256, 0);
        for (const stop in colors) {
            gradient.addColorStop(+stop, colors[stop]);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 1);
        return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
    }

    _getQuadScene() {
        const plane = new reshader.Geometry({
            a_pos : [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]
        }, 6, 0, {
            primitive : 'triangle',
            positionAttribute: 'a_pos',
            positionSize : 2
        });
        const planeMesh = new reshader.Mesh(plane);
        const scene = new reshader.Scene([planeMesh]);
        return scene;
    }

    _getParticlesScene() {
        const particles = new reshader.Geometry({
            a_index : this._particleIndices
        }, this._particleIndices.length, 0, {
            primitive : 'point',
            positionAttribute: 'a_index',
            positionSize : 1
        });
        const particlesMesh = new reshader.Mesh(particles);
        const scene = new reshader.Scene([particlesMesh]);
        return scene;
    }

    _getWindScene() {
        const map = this.layer.getMap();
        const extent = this._getMapExtent();
        const lt = coordinateToWorld(map, new Coordinate([extent.xmin, extent.ymax]));
        const lb = coordinateToWorld(map, new Coordinate(extent.xmin, extent.ymin));
        const rb = coordinateToWorld(map, new Coordinate(extent.xmax, extent.ymin));
        const rt = coordinateToWorld(map, new Coordinate(extent.xmax, extent.ymax));
        const plane = new reshader.Geometry({
            a_pos: [
                lb[0], lb[1], lb[2],//左下
                rb[0], rb[1], rb[2],//右下
                lt[0], lt[1], lt[2],//左上
                lt[0], lt[1], lt[2],//左上
                rb[0], rb[1], rb[2],//右下
                rt[0], rt[1], rt[2]//右上
            ],
            uv : [
                0, 0,
                1, 0,
                0, 1,
                0, 1,
                1, 0,
                1, 1
            ]
        }, 6, 0, {
            primitive: 'triangle',
            positionAttribute: 'a_pos',
            positionSize: 3
        });
        const planeMesh = new reshader.Mesh(plane);
        const scene = new reshader.Scene([planeMesh]);
        return scene;
    }

    _drawScreen() {
        const map = this.layer.getMap();
        this._framebuffer({
            color : this._screenTexture
        });
        this._drawParticles();
        const quadScene = this._getQuadScene();
        this.renderer.render(this.screenShader,{
            u_screen : this._backgroundTexture,
            u_opacity : this._fadeOpacity
        }, quadScene, this._framebuffer);
        const windScene = this._getWindScene();
        this.renderer.render(this.windShader, {
            u_screen: this._screenTexture,
            u_opacity: 1.0,
            projViewMatrix : map.projViewMatrix
        }, windScene);
        const temp = this._backgroundTexture;
        this._backgroundTexture = this._screenTexture;
        this._screenTexture = temp;
    }

    _drawParticles() {
        const extent = this._getMapExtent();
        const particleScene = this._getParticlesScene();
        this.renderer.render(this.drawShader, {
            extent : [extent.xmin, extent.xmax, -extent.ymax, -extent.ymin],
            u_wind: this._windTexture,
            u_particles: this._particleStateTexture0,
            u_color_ramp: this._colorRampTexture,
            u_particles_res: this._particleStateResolution,
            u_wind_min: [this._windData.uMin, this._windData.vMin],
            u_wind_max: [this._windData.uMax, this._windData.vMax]
        }, particleScene, this._framebuffer);
    }

    _updateParticles() {
        this._framebuffer({
            color: this._particleStateTexture1
        });
        const extent = this._getMapExtent();
        const quadScene = this._getQuadScene();
        this.renderer.render(this.updateSHader, {
            extent : [extent.xmin, extent.xmax, -extent.ymax, -extent.ymin],
            u_wind: this._windTexture,
            u_particles: this._particleStateTexture0,
            u_rand_seed: Math.random(),
            u_wind_res: [this._windData.width, this._windData.height],
            u_wind_min: [this._windData.uMin, this._windData.vMin],
            u_wind_max: [this._windData.uMax, this._windData.vMax],
            u_speed_factor: this._speedFactor,
            u_drop_rate: this._dropRate,
            u_drop_rate_bump: this._dropRateBump,
        }, quadScene, this._framebuffer);

        const temp = this._particleStateTexture0;
        this._particleStateTexture0 = this._particleStateTexture1;
        this._particleStateTexture1 = temp;
    }

    _renderWindScene() {
        if (!this._screenTexture ||!this._backgroundTexture || !this._windTexture) {
            return;
        }
        this._updateParams();
        this._drawScreen();
        this._updateParticles();
    }

    _getMapExtent() {
        const map = this.layer.getMap();
        const extent = map.getExtent();
        if (extent.xmax < extent.xmin) {
            extent.xmax = extent.xmax + 360;
        }
        return extent;
    }

    getSpeed(coordinate) {
        if (!this.regl) {
            return;
        }
        const t = coordinate.x % 180;
        const pixelX = (( t + 180) / 360) * this._windData.width;
        if (coordinate.y < -90 || coordinate.y > 90) {
            throw new Error('Invalid y for coordinate');
        }
        const pixelY = ((90 - coordinate.y) / 180) * this._windData.height;
        const framebuffer = this.regl.framebuffer({
            color : this._windTexture,
            width : this._windData.width,
            height : this._windData.height
        });
        const pixels = this.regl.read({
            x: pixelX,
            y: pixelY,
            width: 1,
            height: 1,
            framebuffer
        });
        const vx = pixels[0] * (this._windData.uMax - this._windData.uMin) / 255 + this._windData.uMin;
        const vy = pixels[1] * (this._windData.vMax - this._windData.vMin) / 255 + this._windData.vMin;
        return [vx, vy];
    }

}

function coordinateToWorld(map, coordinate, z = 0) {
    if (!map) {
        return null;
    }
    const p = map.coordinateToPoint(coordinate, map.getGLZoom());
    return [p.x, p.y, z];
}

const defaultRampColors = {
    0.0: '#3288bd',
    0.1: '#66c2a5',
    0.2: '#abdda4',
    0.3: '#e6f598',
    0.4: '#fee08b',
    0.5: '#fdae61',
    0.6: '#f46d43',
    1.0: '#d53e4f'
};

const options = {
    'renderer' : 'gl',
    'count' : 256 * 256,
    'fadeOpacity' : 0.996,
    'speedFactor' : 0.25,
    'dropRate' : 0.003,
    'dropRateBump' : 0.01,
    'colors' : defaultRampColors
};

class WindLayer extends Layer {
    constructor(id, options) {
        super(id, options);
        if (this.options.data) {
            this.setWind(options.data);
        }
    }

    setWind(windData) {
        this._callRendererMethod('setData', windData);
    }

    setParticlesCount(count) {
        this._callRendererMethod('setParticlesCount', count);
    }

    getParticlesCount() {
        return this._callRendererMethod('getParticlesCount');
    }

    setRampColors(colors) {
        this._callRendererMethod('setColorRamp', colors);
    }

    getWindSpeed(coord) {
        return this._callRendererMethod('getSpeed', coord);
    }

    _callRendererMethod(func, params) {
        const renderer$$1 = this.getRenderer();
        if (renderer$$1) {
            return renderer$$1[func](params);
        } else {
            this.on('renderercreate', (e) => {
                return e.renderer[func](params);
            });
        }
    }
}
WindLayer.mergeOptions(options);
WindLayer.registerJSONType('WindLayer');

WindLayer.registerRenderer('gl', WindLayerRenderer);

export { WindLayer };

typeof console !== 'undefined' && console.log('maptalks.wind v0.1.2, requires maptalks@<2.0.0.');
