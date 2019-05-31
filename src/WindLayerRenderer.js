import * as maptalks from 'maptalks';
import { createREGL, mat4, vec3, vec4, quat, reshader } from '@maptalks/gl';
import drawVert from './shaders/draw.vert.glsl';
import drawFrag from './shaders/draw.frag.glsl';

import quadVert from './shaders/quad.vert.glsl';

import screenFrag from './shaders/screen.frag.glsl';
import updateFrag from './shaders/update.frag.glsl';
import { timingSafeEqual } from 'crypto';

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
        this.fadeOpacity = 0.996; // how fast the particle trails fade on each frame
        this.speedFactor = 0.25; // how fast the particles move
        this.dropRate = 0.003; // how often the particles move to a random place
        this.dropRateBump = 0.01; // drop rate increase relative to individual particle speed
    }

    draw(timestamp) {
        ANIMATION_TIME = timestamp;
        this.prepareCanvas();
        this._renderWindScene();
    }

    drawOnInteracting(e, timestamp) {
        ANIMATION_TIME = timestamp;
        this._renderWindScene();
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

    _initRenderer() {
        this.renderer = new reshader.Renderer(this.regl);
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
        const uniforms = [
            {
                name : 'projViewModelMatrix',
                type : 'function',
                fn : function (context, props) {
                    const projViewModelMatrix = [];
                    mat4.multiply(projViewModelMatrix, props['viewMatrix'], props['modelMatrix']);
                    mat4.multiply(projViewModelMatrix, props['projMatrix'], projViewModelMatrix);
                    return projViewModelMatrix;
                }
            },
            {
                name : 'viewModelMatrix',
                type : 'function',
                fn : function (context, props) {
                    const viewModelMatrix = [];
                    mat4.multiply(viewModelMatrix, props['viewMatrix'], props['modelMatrix']);
                    return viewModelMatrix;
                }
            }
        ];
        this.drawShader = new reshader.MeshShader({
            vert : drawVert,
            frag : drawFrag,
            uniforms,
            extraCommandProps : { viewport },
            defines : {}
        });

        this.screenShader = new reshader.MeshShader({
            vert : quadVert,
            frag : screenFrag,
            uniforms,
            extraCommandProps : { viewport },
            defines : {}
        });

        this.updateSHader = new reshader.MeshShader({
            vert : quadVert,
            frag : updateFrag,
            uniforms,
            extraCommandProps : { viewport },
            defines : {}
        });

        this.setColorRamp(defaultRampColors);
        this.framebuffer = regl.framebuffer({
            color: regl.texture({
                width: canvas.width / 2,
                height: canvas.height / 2,
                wrap: 'clamp'
            }),
            depth: true
        });
    }

    resizeCanvas(size) {
        super.resizeCanvas(size);
        const width = this.canvas.width;
        const height = this.canvas.height;
        const emptyPixels = new Uint8Array(width * height * 4);
        this.backgroundTexture = this.regl.texture({
            width,
            height,
            data : emptyPixels
        });
        this.screenTexture = this.regl.texture({
            width,
            height,
            data : emptyPixels
        });
    }

    _setData(data) {
        this._windData = data;
        this._windTexture = this.regl.texture(this._windData.image);
    }

    SetParticlesCount(count) {
        const gl = this.gl;
        // we create a square texture where each pixel will hold a particle position encoded as RGBA
        const particleRes = this.particleStateResolution = Math.ceil(Math.sqrt(count));
        this._numParticles = this.options.count = particleRes * particleRes;

        const particleState = new Uint8Array(this._numParticles * 4);
        for (let i = 0; i < particleState.length; i++) {
            particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
        }
        // textures to hold the particle state for the current and the next frame
        this.particleStateTexture0 = this.regl.texture({
            data : particleState,
            width : particleRes,
            height : particleRes
        });
        this.particleStateTexture1 = this.regl.texture({
            data : particleState,
            width : particleRes,
            height : particleRes
        });

        this._particleIndices = new Float32Array(this._numParticles);
        for (let i = 0; i < this._numParticles; i++) {
            this._particleIndices[i] = i;
        }
    }

    setColorRamp(colors) {
        // lookup texture for colorizing the particles according to their speed
        // this.colorRampTexture = util.createTexture(this.gl, this.gl.LINEAR, getColorRamp(colors), 16, 16);
        this.colorRampTexture = this.regl.texture({
            width : 16,
            height : 16,
            data : this.getColorRamp(colors),
            mag : 'linear',
            min : 'linear'
        });
    }

    getColorRamp(colors) {
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
            positionSize : 1
        });

        const particlesMesh = new reshader.Mesh(particles);
        const scene = new reshader.Scene([particlesMesh]);
        return scene;
    }

    _drawScreen() {
        if (this.screenTexture) {
            this.framebuffer({
                color : this.screenTexture
            });
        }
        const quadScene = this._getQuadScene();
        this.renderer.render(this.screenShader,{
            u_screen : this.backgroundTexture,
            u_opacity : this.fadeOpacity
        }, quadScene, this.framebuffer);
    }

    _drawParticles() {
        const particleScene = this._getParticlesScene();
        this.renderer.render(this.drawShader, {
           u_wind : this._windTexture,
           u_color_ramp : this.particleStateTexture0
        }, particleScene);
    }

    _drawPlane() {
        this.SetParticlesCount = this.backgroundTexture;
        
    }

    _renderWindScene() {
        this._drawScreen();
    }

}

export default WindLayerRenderer;
