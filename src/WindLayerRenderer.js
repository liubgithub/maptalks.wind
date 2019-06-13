import * as maptalks from 'maptalks';
import { createREGL, mat4, vec3, vec4, quat, reshader } from '@maptalks/gl';
import drawVert from './glsl/draw.vert.js';
import drawFrag from './glsl/draw.frag.js';

import quadVert from './glsl/quad.vert.js';

import screenFrag from './glsl/screen.frag.js';
import updateFrag from './glsl/update.frag.js';
import windVert from './glsl/windVert.js';
import windFrag from './glsl/windFrag.js';

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
class WindLayerRenderer extends maptalks.renderer.CanvasRenderer {

    constructor(layer) {
        super(layer);
        this._fadeOpacity = 0.996; // how fast the particle trails fade on each frame
        this._speedFactor = 0.25; // how fast the particles move
        this._dropRate = 0.003; // how often the particles move to a random place
        this._dropRateBump = 0.01; // drop rate increase relative to individual particle speed
    }

    draw(timestamp) {
        this.prepareCanvas();
        this._renderWindScene();
    }

    drawOnInteracting(e, timestamp) {
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
        this.SetParticlesCount(256 * 256);
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

    _initRenderer() {
        this.renderer = new reshader.Renderer(this.regl);
        const width = this.canvas.width;
        const height = this.canvas.height;
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
            extraCommandProps : {},
            defines : {}
        });

        this.updateSHader = new reshader.MeshShader({
            vert : quadVert,
            frag : updateFrag,
            uniforms: [
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
                    width : this._particleStateResolution,
                    height : this._particleStateResolution
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
             },
            defines: {}
        });

        this._setColorRamp(defaultRampColors);
        this._framebuffer = this.regl.framebuffer({
            color: this.regl.texture({
                width: this.canvas.width,
                height: this.canvas.height,
                wrap: 'clamp'
            }),
            depth: true
        });
        this._windTexture = this.regl.texture({
            data : this._windData.image,
            mag: 'linear',
            min: 'linear'
        });
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

    resizeCanvas(size) {
        super.resizeCanvas(size);
    }

    _setData(data) {
        this._windData = data;
    }

    SetParticlesCount(count) {
        const gl = this.gl;
        // we create a square texture where each pixel will hold a particle position encoded as RGBA
        const particleRes = this._particleStateResolution = Math.ceil(Math.sqrt(count));
        this._numParticles = this.options.count = particleRes * particleRes;

        const particleState = new Uint8Array(this._numParticles * 4);
        for (let i = 0; i < particleState.length; i++) {
            particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
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

    _setColorRamp(colors) {
        // lookup texture for colorizing the particles according to their speed
        // this.colorRampTexture = util.createTexture(this.gl, this.gl.LINEAR, getColorRamp(colors), 16, 16);
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
            a_index : this._particleIndices,
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
        const extent = map.getExtent();
        const xmin = extent.xmin;
        const xmax = extent.xmax;
        const ymin = extent.ymin;
        const ymax = extent.ymax;
        const plane = new reshader.Geometry({
            a_pos: [xmin, ymin, 0, 
                xmax, ymin, 0,
                xmin, ymax, 0, 
                xmin, ymax, 0,
                xmax, ymin, 0, 
                xmax, ymax, 0],
            uv : [0, 0, 
                1, 0, 
                0, 1, 
                0, 1, 
                1, 0, 
                1, 1]
        }, 6, 0, {
            primitive: 'triangle',
            positionAttribute: 'a_pos',
            positionSize: 3
        });
        const planeMesh = new reshader.Mesh(plane);
        const position = coordinateToWorld(this.layer.getMap(), new maptalks.Coordinate([0, 0]));
        const transformMat = mat4.fromRotationTranslationScale([], [0, 0, 0, 1], position, [1, 2, 1]);
        planeMesh.setLocalTransform(transformMat);
        const scene = new reshader.Scene([planeMesh]);
        return scene;
    }

    _drawScreen() {
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
        // this.renderer.render(this.screenShader, {
        //     u_screen: this._screenTexture,
        //     u_opacity: 1.0,
        // }, quadScene);
        const temp = this._backgroundTexture;
        this._backgroundTexture = this._screenTexture;
        this._screenTexture = temp;
    }

    _drawParticles() {
        const particleScene = this._getParticlesScene();
        this.renderer.render(this.drawShader, {
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
        const quadScene = this._getQuadScene();
        this.renderer.render(this.updateSHader, {
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
    //http://106.14.203.229:8088/nfgk

    _renderWindScene() {
        if (!this._screenTexture ||!this._backgroundTexture) {
            return;
        }
        this._drawScreen();
        this._updateParticles();
    }

}

export default WindLayerRenderer;

function coordinateToWorld(map, coordinate, z = 0) {
    if (!map) {
        return null;
    }
    const p = map.coordinateToPoint(coordinate, getTargetZoom(map));
    return [p.x, p.y, z];
}

function getTargetZoom(map) {
    return map.getGLZoom();
}
