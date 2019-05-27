import * as maptalks from 'maptalks';
import { createREGL, mat4, vec3, vec4, quat, reshader } from '@maptalks/gl';
import drawVert from './shaders/draw.vert.glsl';
import drawFrag from './shaders/draw.frag.glsl';

import quadVert from './shaders/quad.vert.glsl';

import screenFrag from './shaders/screen.frag.glsl';
import updateFrag from './shaders/update.frag.glsl';

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
        // this.particleStateTexture0 = util.createTexture(gl, gl.NEAREST, particleState, particleRes, particleRes);
        // this.particleStateTexture1 = util.createTexture(gl, gl.NEAREST, particleState, particleRes, particleRes);
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

    _renderWindScene() {
        
    }

}

export default WindLayerRenderer;
