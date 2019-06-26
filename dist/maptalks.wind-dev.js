/*!
 * @maptalks/wind-layer v0.1.1
 * LICENSE : UNLICENSED
 * (c) 2016-2019 maptalks.org
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('maptalks'), require('@maptalks/gl')) :
  typeof define === 'function' && define.amd ? define(['maptalks', '@maptalks/gl'], factory) :
  (global = global || self, (global.maptalks = global.maptalks || {}, global.maptalks.WindLayer = factory(global.maptalks, global.maptalksgl)));
}(this, function (maptalks, gl) { 'use strict';

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  var drawVert = "precision mediump float;\n\n\n\nattribute float a_index;\n\n\n\nuniform sampler2D u_particles;\n\nuniform float u_particles_res;\n\n\n\nvarying vec2 v_particle_pos;\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_particles, vec2(\n\n        fract(a_index / u_particles_res),\n\n        floor(a_index / u_particles_res) / u_particles_res));\n\n\n\n    // decode current particle position from the pixel's RGBA value\n\n    v_particle_pos = vec2(\n\n        color.r / 255.0 + color.b,\n\n        color.g / 255.0 + color.a);\n\n\n\n    gl_PointSize = 1.0;\n\n    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);\n\n}\n\n";

  var drawFrag = "precision mediump float;\n\n\n\nuniform sampler2D u_wind;\n\nuniform vec2 u_wind_min;\n\nuniform vec2 u_wind_max;\n\nuniform sampler2D u_color_ramp;\n\n\n\nvarying vec2 v_particle_pos;\n\nuniform vec4 extent;\n\n\n\n//重新计算视图区域的纹理采样坐标，将粒子缩放到extent范围内\n\nvec2 computeUV(vec2 v_particle_pos) {\n\n    float xmin = (extent.x + 180.0) / 360.0;\n\n    float ymin = (extent.z + 90.0) / 180.0;\n\n    float xmax = (extent.y + 180.0) / 360.0;\n\n    float ymax = (extent.w + 90.0) / 180.0;\n\n    float xWidth = xmax - xmin;\n\n    float yHeight = ymax - ymin;\n\n    vec2 centerUv = vec2(0.5, 0.5);\n\n\n\n    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax;\n\n    }\n\n    if (v_particle_pos.x > 1.0) {\n\n        v_particle_pos.x = v_particle_pos.x - 1.0;\n\n    } else if(v_particle_pos.x < 0.0) {\n\n        v_particle_pos.x = v_particle_pos.x + 1.0;\n\n    }\n\n    return v_particle_pos;\n\n}\n\n\n\nvoid main() {\n\n    vec2 particle_pos = computeUV(v_particle_pos);\n\n    if (particle_pos.y < 0.0 || particle_pos.y > 1.0) {\n\n        gl_FragColor = vec4(0.0);\n\n    } else {\n\n        vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, particle_pos).rg);\n\n        float speed_t = length(velocity) / length(u_wind_max);\n\n    \n\n        // color ramp is encoded in a 16x16 texture\n\n        vec2 ramp_pos = vec2(\n\n            fract(16.0 * speed_t),\n\n            floor(16.0 * speed_t) / 16.0);\n\n    \n\n        gl_FragColor = texture2D(u_color_ramp, ramp_pos);\n\n    }\n\n}\n\n";

  var quadVert = "precision mediump float;\n\n\n\nattribute vec2 a_pos;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    v_tex_pos = a_pos;\n\n    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);\n\n}\n\n";

  var screenFrag = "precision mediump float;\n\n\n\nuniform sampler2D u_screen;\n\nuniform float u_opacity;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);\n\n    // a hack to guarantee opacity fade out even with a value close to 1.0\n\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\n\n}\n\n";

  var updateFrag = "precision highp float;\n\n\n\nuniform sampler2D u_particles;\n\nuniform sampler2D u_wind;\n\nuniform vec2 u_wind_res;\n\nuniform vec2 u_wind_min;\n\nuniform vec2 u_wind_max;\n\nuniform float u_rand_seed;\n\nuniform float u_speed_factor;\n\nuniform float u_drop_rate;\n\nuniform float u_drop_rate_bump;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nuniform vec4 extent;\n\n\n\n// pseudo-random generator\n\nconst vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);\n\nfloat rand(const vec2 co) {\n\n    float t = dot(rand_constants.xy, co);\n\n    return fract(sin(t) * (rand_constants.z + t));\n\n}\n\n\n\nvec2 getNewUV(vec2 uv) {\n\n    float xmin = (extent.x + 180.0) / 360.0;\n\n    float ymin = (extent.z + 90.0) / 180.0;\n\n    float xmax = (extent.y + 180.0) / 360.0;\n\n    float ymax = (extent.w + 90.0) / 180.0;\n\n    float xWidth = xmax - xmin;\n\n    float yHeight = ymax - ymin;\n\n    vec2 centerUv = vec2(0.5, 0.5);\n\n    vec2 v_particle_pos = uv;\n\n\n\n    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;\n\n        v_particle_pos.y = (v_particle_pos.y -  1.0) * yHeight + ymax;\n\n    }\n\n    if (v_particle_pos.x > 1.0) {\n\n        v_particle_pos.x = v_particle_pos.x - 1.0;\n\n    } else if(v_particle_pos.x < 0.0) {\n\n        v_particle_pos.x = v_particle_pos.x + 1.0;\n\n    }\n\n    return v_particle_pos;\n\n}\n\n\n\n// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation\n\nvec2 lookup_wind(const vec2 uv) {\n\n    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering\n\n    vec2 px = 1.0 / u_wind_res;\n\n    // vec2 vc = (floor(uv * u_wind_res)) * px;\n\n    // vec2 f = fract(uv * u_wind_res);\n\n    vec2 vc = (floor(uv * u_wind_res)) * px;\n\n    vec2 f = fract(uv * u_wind_res);\n\n    vec2 tl = texture2D(u_wind, vc).rg;\n\n    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;\n\n    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;\n\n    vec2 br = texture2D(u_wind, vc + px).rg;\n\n    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);\n\n}\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_particles, v_tex_pos);\n\n    vec2 pos = vec2(\n\n        color.r / 255.0 + color.b,\n\n        color.g / 255.0 + color.a); // decode particle position from pixel RGBA\n\n    vec2 newUV = getNewUV(pos);\n\n    if (newUV.y < 0.0 || newUV.y > 1.0) {\n\n        gl_FragColor = vec4(0.0);\n\n    } else {\n\n        vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(newUV));\n\n        float speed_t = length(velocity) / length(u_wind_max);\n\n    \n\n        // take EPSG:4236 distortion into account for calculating where the particle moved\n\n        float distortion = cos(radians(newUV.y * 180.0 - 90.0));\n\n        vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;\n\n    \n\n        // update particle position, wrapping around the date line\n\n        pos = fract(1.0 + pos + offset);\n\n    \n\n        // a random seed to use for the particle drop\n\n        vec2 seed = (pos + v_tex_pos) * u_rand_seed;\n\n    \n\n        // drop rate is a chance a particle will restart at random position, to avoid degeneration\n\n        float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;\n\n        float drop = step(1.0 - drop_rate, rand(seed));\n\n    \n\n        vec2 random_pos = vec2(\n\n            rand(seed + 1.3),\n\n            rand(seed + 2.1));\n\n        pos = mix(pos, random_pos, drop);\n\n    \n\n        // encode the new particle position back into RGBA\n\n        gl_FragColor = vec4(\n\n            fract(pos * 255.0),\n\n            floor(pos * 255.0) / 255.0);\n\n    }\n\n}\n\n";

  var windVert = "precision mediump float;\n\n\n\nattribute vec3 a_pos;\n\nuniform mat4 projViewModelMatrix;\n\nattribute vec2 uv;\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    v_tex_pos = uv;\n\n    gl_Position = projViewModelMatrix * vec4(a_pos, 1.0);\n\n}\n\n";

  var windFrag = "precision mediump float;\n\nuniform sampler2D u_screen;\n\nuniform float u_opacity;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_screen, v_tex_pos);\n\n    // a hack to guarantee opacity fade out even with a value close to 1.0\n\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\n\n}\n\n";

  var WindLayerRenderer = function (_maptalks$renderer$Ca) {
    _inheritsLoose(WindLayerRenderer, _maptalks$renderer$Ca);

    function WindLayerRenderer(layer) {
      var _this;

      _this = _maptalks$renderer$Ca.call(this, layer) || this;

      _this._updateParams();

      _this._windData = {};
      return _this;
    }

    var _proto = WindLayerRenderer.prototype;

    _proto.draw = function draw() {
      this.prepareCanvas();

      this._renderWindScene();
    };

    _proto.drawOnInteracting = function drawOnInteracting() {
      this._renderWindScene();
    };

    _proto.needToRedraw = function needToRedraw() {
      return true;
    };

    _proto.hitDetect = function hitDetect() {
      return false;
    };

    _proto.createContext = function createContext() {
      if (this.canvas.gl && this.canvas.gl.wrap) {
        this.gl = this.canvas.gl.wrap();
      } else {
        var layer = this.layer;
        var attributes = layer.options.glOptions || {
          alpha: true,
          depth: true,
          stencil: true
        };
        this.glOptions = attributes;
        this.gl = this.gl || this._createGLContext(this.canvas, attributes);
      }

      var size = this.layer.getMap().getSize();
      this.canvas.width = size.width * 2.0;
      this.canvas.height = size.height * 2.0;
      this.regl = gl.createREGL({
        gl: this.gl,
        extensions: ['OES_element_index_uint', 'OES_standard_derivatives'],
        optionalExtensions: this.layer.options['glExtensions'] || []
      });

      this._initRenderer();
    };

    _proto.clearCanvas = function clearCanvas() {
      if (!this.canvas) {
        return;
      }

      this.regl.clear({
        color: [0, 0, 0, 0],
        depth: 1,
        stencil: 0
      });

      _maptalks$renderer$Ca.prototype.clearCanvas.call(this);
    };

    _proto._updateParams = function _updateParams() {
      this._particlesCount = this.layer.options.count;
      this._fadeOpacity = this.layer.options.fadeOpacity;
      this._speedFactor = this.layer.options.speedFactor;
      this._dropRate = this.layer.options.dropRate;
      this._dropRateBump = this.layer.options.dropRateBump;
      this._rampColors = this.layer.options.colors;
    };

    _proto._initRenderer = function _initRenderer() {
      this.renderer = new gl.reshader.Renderer(this.regl);
      var width = this.canvas.width;
      var height = this.canvas.height;
      this._canvasWidth = width;
      this._canvasHeight = height;

      this._prepareParticles();

      this._prepareTexture();

      this._prepareShader();

      this._setColorRamp(this._rampColors);

      this._framebuffer = this.regl.framebuffer({
        color: this.regl.texture({
          width: width,
          height: height,
          wrap: 'clamp'
        }),
        depth: true
      });
    };

    _proto._prepareTexture = function _prepareTexture() {
      var width = this.canvas.width;
      var height = this.canvas.height;
      var emptyPixels = new Uint8Array(width * height * 4);
      this._backgroundTexture = this.regl.texture({
        width: width,
        height: height,
        data: emptyPixels
      });
      this._screenTexture = this.regl.texture({
        width: width,
        height: height,
        data: emptyPixels
      });

      if (!this._windTexture) {
        this._prepareWindTexture();
      }
    };

    _proto._prepareWindTexture = function _prepareWindTexture() {
      var _this2 = this;

      if (maptalks.Util.isString(this._windData.image)) {
        var image = new Image();
        image.src = this._windData.image;

        image.onload = function () {
          _this2._windData.image = image;

          _this2._createWindTexture();

          _this2.layer.fire('windtexture-create-debug');
        };
      } else {
        this._createWindTexture();
      }
    };

    _proto._createWindTexture = function _createWindTexture() {
      if (!this._windData.image) {
        return;
      }

      this._windTexture = this.regl.texture({
        data: this._windData.image,
        mag: 'linear',
        min: 'linear'
      });
    };

    _proto._prepareParticles = function _prepareParticles() {
      var particleRes = this._particleStateResolution = Math.ceil(Math.sqrt(this._particlesCount));
      this._numParticles = particleRes * particleRes;
      var particleState = new Uint8Array(this._numParticles * 4);

      for (var i = 0; i < particleState.length; i++) {
        particleState[i] = Math.floor(Math.random() * 256);
      }

      if (!this.regl) {
        return;
      }

      this._particleStateTexture0 = this.regl.texture({
        data: particleState,
        width: particleRes,
        height: particleRes
      });
      this._particleStateTexture1 = this.regl.texture({
        data: particleState,
        width: particleRes,
        height: particleRes
      });
      this._particleIndices = new Float32Array(this._numParticles);

      for (var _i = 0; _i < this._numParticles; _i++) {
        this._particleIndices[_i] = _i;
      }
    };

    _proto._prepareShader = function _prepareShader() {
      var _this3 = this;

      var viewport = {
        x: 0,
        y: 0,
        width: function width() {
          return _this3.canvas ? _this3.canvas.width : 1;
        },
        height: function height() {
          return _this3.canvas ? _this3.canvas.height : 1;
        }
      };
      this.drawShader = new gl.reshader.MeshShader({
        vert: drawVert,
        frag: drawFrag,
        uniforms: ['extent', 'u_wind', 'u_particles', 'u_color_ramp', 'u_particles_res', 'u_wind_min', 'u_wind_max'],
        extraCommandProps: {
          viewport: viewport
        },
        defines: {}
      });
      this.screenShader = new gl.reshader.MeshShader({
        vert: quadVert,
        frag: screenFrag,
        uniforms: ['u_screen', 'u_opacity'],
        extraCommandProps: {
          viewport: viewport
        },
        defines: {}
      });
      this.updateSHader = new gl.reshader.MeshShader({
        vert: quadVert,
        frag: updateFrag,
        uniforms: ['extent', 'u_wind', 'u_particles', 'u_rand_seed', 'u_wind_res', 'u_wind_min', 'u_wind_max', 'u_speed_factor', 'u_drop_rate', 'u_drop_rate_bump'],
        extraCommandProps: {
          viewport: {
            x: 0,
            y: 0,
            width: function width() {
              return _this3._particleStateResolution;
            },
            height: function height() {
              return _this3._particleStateResolution;
            }
          },
          dither: true
        },
        defines: {}
      });
      this.windShader = new gl.reshader.MeshShader({
        vert: windVert,
        frag: windFrag,
        uniforms: ['u_screen', 'u_opacity', 'projViewMatrix', {
          name: 'projViewModelMatrix',
          type: 'function',
          fn: function fn(context, props) {
            return gl.mat4.multiply([], props['projViewMatrix'], props['modelMatrix']);
          }
        }],
        extraCommandProps: {
          viewport: viewport
        },
        defines: {}
      });
    };

    _proto._createGLContext = function _createGLContext(canvas, options) {
      var names = ['webgl', 'experimental-webgl'];
      var context = null;

      for (var i = 0; i < names.length; ++i) {
        try {
          context = canvas.getContext(names[i], options);
        } catch (e) {}

        if (context) {
          break;
        }
      }

      return context;
    };

    _proto.resizeCanvas = function resizeCanvas() {
      if (this._backgroundTexture && this._screenTexture && this._isCanvasResize()) {
        var width = this.canvas.width;
        var height = this.canvas.height;
        var emptyPixels = new Uint8Array(width * height * 4);

        this._backgroundTexture({
          width: width,
          height: height,
          data: emptyPixels
        });

        this._screenTexture({
          width: width,
          height: height,
          data: emptyPixels
        });

        this._canvasWidth = width;
        this._canvasHeight = height;
      }

      _maptalks$renderer$Ca.prototype.resizeCanvas.call(this);
    };

    _proto._isCanvasResize = function _isCanvasResize() {
      return this._canvasWidth != this.canvas.width || this._canvasHeight != this.canvas.height;
    };

    _proto._setData = function _setData(data) {
      this._windData = data;

      this._prepareWindTexture();
    };

    _proto._setParticlesCount = function _setParticlesCount(count) {
      this._particlesCount = count;

      this._prepareParticles();
    };

    _proto._getParticlesCount = function _getParticlesCount() {
      return this._particlesCount;
    };

    _proto._setColorRamp = function _setColorRamp(colors) {
      this._colorRampTexture = this.regl.texture({
        width: 16,
        height: 16,
        data: this._getColorRamp(colors),
        mag: 'linear',
        min: 'linear'
      });
    };

    _proto._getColorRamp = function _getColorRamp(colors) {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 1;
      var gradient = ctx.createLinearGradient(0, 0, 256, 0);

      for (var stop in colors) {
        gradient.addColorStop(+stop, colors[stop]);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 1);
      return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
    };

    _proto._getQuadScene = function _getQuadScene() {
      var plane = new gl.reshader.Geometry({
        a_pos: [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]
      }, 6, 0, {
        primitive: 'triangle',
        positionAttribute: 'a_pos',
        positionSize: 2
      });
      var planeMesh = new gl.reshader.Mesh(plane);
      var scene = new gl.reshader.Scene([planeMesh]);
      return scene;
    };

    _proto._getParticlesScene = function _getParticlesScene() {
      var particles = new gl.reshader.Geometry({
        a_index: this._particleIndices
      }, this._particleIndices.length, 0, {
        primitive: 'point',
        positionAttribute: 'a_index',
        positionSize: 1
      });
      var particlesMesh = new gl.reshader.Mesh(particles);
      var scene = new gl.reshader.Scene([particlesMesh]);
      return scene;
    };

    _proto._getWindScene = function _getWindScene() {
      var map = this.layer.getMap();

      var extent = this._getMapExtent();

      var lt = coordinateToWorld(map, new maptalks.Coordinate([extent.xmin, extent.ymax]));
      var lb = coordinateToWorld(map, new maptalks.Coordinate(extent.xmin, extent.ymin));
      var rb = coordinateToWorld(map, new maptalks.Coordinate(extent.xmax, extent.ymin));
      var rt = coordinateToWorld(map, new maptalks.Coordinate(extent.xmax, extent.ymax));
      var plane = new gl.reshader.Geometry({
        a_pos: [lb[0], lb[1], lb[2], rb[0], rb[1], rb[2], lt[0], lt[1], lt[2], lt[0], lt[1], lt[2], rb[0], rb[1], rb[2], rt[0], rt[1], rt[2]],
        uv: [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]
      }, 6, 0, {
        primitive: 'triangle',
        positionAttribute: 'a_pos',
        positionSize: 3
      });
      var planeMesh = new gl.reshader.Mesh(plane);
      var scene = new gl.reshader.Scene([planeMesh]);
      return scene;
    };

    _proto._drawScreen = function _drawScreen() {
      this._framebuffer({
        color: this._screenTexture
      });

      this._drawParticles();

      var quadScene = this._getQuadScene();

      this.renderer.render(this.screenShader, {
        u_screen: this._backgroundTexture,
        u_opacity: this._fadeOpacity
      }, quadScene, this._framebuffer);

      var windScene = this._getWindScene();

      this.renderer.render(this.windShader, {
        u_screen: this._screenTexture,
        u_opacity: 1.0,
        projViewMatrix: map.projViewMatrix
      }, windScene);
      var temp = this._backgroundTexture;
      this._backgroundTexture = this._screenTexture;
      this._screenTexture = temp;
    };

    _proto._drawParticles = function _drawParticles() {
      var extent = this._getMapExtent();

      var particleScene = this._getParticlesScene();

      this.renderer.render(this.drawShader, {
        extent: [extent.xmin, extent.xmax, -extent.ymax, -extent.ymin],
        u_wind: this._windTexture,
        u_particles: this._particleStateTexture0,
        u_color_ramp: this._colorRampTexture,
        u_particles_res: this._particleStateResolution,
        u_wind_min: [this._windData.uMin, this._windData.vMin],
        u_wind_max: [this._windData.uMax, this._windData.vMax]
      }, particleScene, this._framebuffer);
    };

    _proto._updateParticles = function _updateParticles() {
      this._framebuffer({
        color: this._particleStateTexture1
      });

      var extent = this._getMapExtent();

      var quadScene = this._getQuadScene();

      this.renderer.render(this.updateSHader, {
        extent: [extent.xmin, extent.xmax, -extent.ymax, -extent.ymin],
        u_wind: this._windTexture,
        u_particles: this._particleStateTexture0,
        u_rand_seed: Math.random(),
        u_wind_res: [this._windData.width, this._windData.height],
        u_wind_min: [this._windData.uMin, this._windData.vMin],
        u_wind_max: [this._windData.uMax, this._windData.vMax],
        u_speed_factor: this._speedFactor,
        u_drop_rate: this._dropRate,
        u_drop_rate_bump: this._dropRateBump
      }, quadScene, this._framebuffer);
      var temp = this._particleStateTexture0;
      this._particleStateTexture0 = this._particleStateTexture1;
      this._particleStateTexture1 = temp;
    };

    _proto._renderWindScene = function _renderWindScene() {
      if (!this._screenTexture || !this._backgroundTexture || !this._windTexture) {
        return;
      }

      this._updateParams();

      this._drawScreen();

      this._updateParticles();
    };

    _proto._getMapExtent = function _getMapExtent() {
      var map = this.layer.getMap();
      var extent = map.getExtent();

      if (extent.xmax < extent.xmin) {
        extent.xmax = extent.xmax + 360;
      }

      return extent;
    };

    _proto._getSpeed = function _getSpeed(coordinate) {
      if (!this.regl) {
        return;
      }

      var t = coordinate.x % 180;
      var pixelX = (t + 180) / 360 * this._windData.width;

      if (coordinate.y < -90 || coordinate.y > 90) {
        throw new Error('Invalid y for coordinate');
      }

      var pixelY = (90 - coordinate.y) / 180 * this._windData.height;
      var framebuffer = this.regl.framebuffer({
        color: this._windTexture,
        width: this._windData.width,
        height: this._windData.height
      });
      var pixels = this.regl.read({
        x: pixelX,
        y: pixelY,
        width: 1,
        height: 1,
        framebuffer: framebuffer
      });
      var vx = pixels[0] * (this._windData.uMax - this._windData.uMin) / 255 + this._windData.uMin;
      var vy = pixels[1] * (this._windData.vMax - this._windData.vMin) / 255 + this._windData.vMin;
      return [vx, vy];
    };

    return WindLayerRenderer;
  }(maptalks.renderer.CanvasRenderer);

  function coordinateToWorld(map, coordinate, z) {
    if (z === void 0) {
      z = 0;
    }

    if (!map) {
      return null;
    }

    var p = map.coordinateToPoint(coordinate, map.getGLZoom());
    return [p.x, p.y, z];
  }

  var defaultRampColors = {
    0.0: '#3288bd',
    0.1: '#66c2a5',
    0.2: '#abdda4',
    0.3: '#e6f598',
    0.4: '#fee08b',
    0.5: '#fdae61',
    0.6: '#f46d43',
    1.0: '#d53e4f'
  };
  var options = {
    'renderer': 'gl',
    'count': 256 * 256,
    'fadeOpacity': 0.996,
    'speedFactor': 0.25,
    'dropRate': 0.003,
    'dropRateBump': 0.01,
    'colors': defaultRampColors
  };

  var WindLayer = function (_maptalks$Layer) {
    _inheritsLoose(WindLayer, _maptalks$Layer);

    function WindLayer(id, options) {
      var _this;

      _this = _maptalks$Layer.call(this, id, options) || this;

      if (_this.options.data) {
        _this.setWind(options.data);
      }

      return _this;
    }

    var _proto = WindLayer.prototype;

    _proto.setWind = function setWind(windData) {
      this._callRendererMethod('_setData', windData);
    };

    _proto.setParticlesCount = function setParticlesCount(count) {
      this._callRendererMethod('_setParticlesCount', count);
    };

    _proto.getParticlesCount = function getParticlesCount() {
      return this._callRendererMethod('_getParticlesCount');
    };

    _proto.setRampColors = function setRampColors(colors) {
      this._callRendererMethod('_setColorRamp', colors);
    };

    _proto.getWindSpeed = function getWindSpeed(coord) {
      return this._callRendererMethod('_getSpeed', coord);
    };

    _proto._callRendererMethod = function _callRendererMethod(func, params) {
      var renderer = this.getRenderer();

      if (renderer) {
        return renderer[func](params);
      } else {
        this.on('renderercreate', function (e) {
          return e.renderer[func](params);
        });
      }
    };

    return WindLayer;
  }(maptalks.Layer);
  WindLayer.mergeOptions(options);
  WindLayer.registerJSONType('WindLayer');
  WindLayer.registerRenderer('gl', WindLayerRenderer);

  return WindLayer;

  typeof console !== 'undefined' && console.log('@maptalks/wind-layer v0.1.1, requires maptalks@<2.0.0.');

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3Mud2luZC1kZXYuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9XaW5kTGF5ZXJSZW5kZXJlci5qcyIsIi4uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBtYXB0YWxrcyBmcm9tICdtYXB0YWxrcyc7XHJcbmltcG9ydCB7IGNyZWF0ZVJFR0wsIG1hdDQsIHJlc2hhZGVyIH0gZnJvbSAnQG1hcHRhbGtzL2dsJztcclxuaW1wb3J0IGRyYXdWZXJ0IGZyb20gJy4vZ2xzbC9kcmF3LnZlcnQnO1xyXG5pbXBvcnQgZHJhd0ZyYWcgZnJvbSAnLi9nbHNsL2RyYXcuZnJhZyc7XHJcblxyXG5pbXBvcnQgcXVhZFZlcnQgZnJvbSAnLi9nbHNsL3F1YWQudmVydCc7XHJcblxyXG5pbXBvcnQgc2NyZWVuRnJhZyBmcm9tICcuL2dsc2wvc2NyZWVuLmZyYWcnO1xyXG5pbXBvcnQgdXBkYXRlRnJhZyBmcm9tICcuL2dsc2wvdXBkYXRlLmZyYWcnO1xyXG5pbXBvcnQgd2luZFZlcnQgZnJvbSAnLi9nbHNsL3dpbmQudmVydCc7XHJcbmltcG9ydCB3aW5kRnJhZyBmcm9tICcuL2dsc2wvd2luZC5mcmFnJztcclxuXHJcbmNsYXNzIFdpbmRMYXllclJlbmRlcmVyIGV4dGVuZHMgbWFwdGFsa3MucmVuZGVyZXIuQ2FudmFzUmVuZGVyZXIge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGxheWVyKSB7XHJcbiAgICAgICAgc3VwZXIobGF5ZXIpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZVBhcmFtcygpO1xyXG4gICAgICAgIHRoaXMuX3dpbmREYXRhID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgZHJhdygpIHtcclxuICAgICAgICB0aGlzLnByZXBhcmVDYW52YXMoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJXaW5kU2NlbmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBkcmF3T25JbnRlcmFjdGluZygpIHtcclxuICAgICAgICB0aGlzLl9yZW5kZXJXaW5kU2NlbmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBuZWVkVG9SZWRyYXcoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgaGl0RGV0ZWN0KCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVDb250ZXh0KCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNhbnZhcy5nbCAmJiB0aGlzLmNhbnZhcy5nbC53cmFwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2wgPSB0aGlzLmNhbnZhcy5nbC53cmFwKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyO1xyXG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVzID0gbGF5ZXIub3B0aW9ucy5nbE9wdGlvbnMgfHwge1xyXG4gICAgICAgICAgICAgICAgYWxwaGE6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkZXB0aDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIC8vYW50aWFsaWFzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RlbmNpbCA6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5nbE9wdGlvbnMgPSBhdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLmdsID0gdGhpcy5nbCB8fCB0aGlzLl9jcmVhdGVHTENvbnRleHQodGhpcy5jYW52YXMsIGF0dHJpYnV0ZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBzaXplID0gdGhpcy5sYXllci5nZXRNYXAoKS5nZXRTaXplKCk7XHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSBzaXplLndpZHRoICogMi4wO1xyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHNpemUuaGVpZ2h0ICogMi4wO1xyXG4gICAgICAgIHRoaXMucmVnbCA9IGNyZWF0ZVJFR0woe1xyXG4gICAgICAgICAgICBnbCA6IHRoaXMuZ2wsXHJcbiAgICAgICAgICAgIGV4dGVuc2lvbnMgOiBbXHJcbiAgICAgICAgICAgICAgICAvLyAnQU5HTEVfaW5zdGFuY2VkX2FycmF5cycsXHJcbiAgICAgICAgICAgICAgICAvLyAnT0VTX3RleHR1cmVfZmxvYXQnLFxyXG4gICAgICAgICAgICAgICAgLy8gJ09FU190ZXh0dXJlX2Zsb2F0X2xpbmVhcicsXHJcbiAgICAgICAgICAgICAgICAnT0VTX2VsZW1lbnRfaW5kZXhfdWludCcsXHJcbiAgICAgICAgICAgICAgICAnT0VTX3N0YW5kYXJkX2Rlcml2YXRpdmVzJ1xyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBvcHRpb25hbEV4dGVuc2lvbnMgOiB0aGlzLmxheWVyLm9wdGlvbnNbJ2dsRXh0ZW5zaW9ucyddIHx8IFtdXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5faW5pdFJlbmRlcmVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXJDYW52YXMoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNhbnZhcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucmVnbC5jbGVhcih7XHJcbiAgICAgICAgICAgIGNvbG9yOiBbMCwgMCwgMCwgMF0sXHJcbiAgICAgICAgICAgIGRlcHRoOiAxLFxyXG4gICAgICAgICAgICBzdGVuY2lsIDogMFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHN1cGVyLmNsZWFyQ2FudmFzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgX3VwZGF0ZVBhcmFtcygpIHtcclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZXNDb3VudCA9IHRoaXMubGF5ZXIub3B0aW9ucy5jb3VudDtcclxuICAgICAgICB0aGlzLl9mYWRlT3BhY2l0eSA9IHRoaXMubGF5ZXIub3B0aW9ucy5mYWRlT3BhY2l0eTtcclxuICAgICAgICB0aGlzLl9zcGVlZEZhY3RvciA9IHRoaXMubGF5ZXIub3B0aW9ucy5zcGVlZEZhY3RvcjtcclxuICAgICAgICB0aGlzLl9kcm9wUmF0ZSA9IHRoaXMubGF5ZXIub3B0aW9ucy5kcm9wUmF0ZTtcclxuICAgICAgICB0aGlzLl9kcm9wUmF0ZUJ1bXAgPSB0aGlzLmxheWVyLm9wdGlvbnMuZHJvcFJhdGVCdW1wO1xyXG4gICAgICAgIHRoaXMuX3JhbXBDb2xvcnMgPSB0aGlzLmxheWVyLm9wdGlvbnMuY29sb3JzO1xyXG4gICAgfVxyXG5cclxuICAgIF9pbml0UmVuZGVyZXIoKSB7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJlciA9IG5ldyByZXNoYWRlci5SZW5kZXJlcih0aGlzLnJlZ2wpO1xyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5jYW52YXMud2lkdGg7XHJcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xyXG4gICAgICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICAgICAgdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVQYXJ0aWNsZXMoKTtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlVGV4dHVyZSgpO1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVTaGFkZXIoKTtcclxuICAgICAgICB0aGlzLl9zZXRDb2xvclJhbXAodGhpcy5fcmFtcENvbG9ycyk7XHJcbiAgICAgICAgdGhpcy5fZnJhbWVidWZmZXIgPSB0aGlzLnJlZ2wuZnJhbWVidWZmZXIoe1xyXG4gICAgICAgICAgICBjb2xvcjogdGhpcy5yZWdsLnRleHR1cmUoe1xyXG4gICAgICAgICAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgICAgICB3cmFwOiAnY2xhbXAnXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBkZXB0aDogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIF9wcmVwYXJlVGV4dHVyZSgpIHtcclxuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoO1xyXG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuY2FudmFzLmhlaWdodDtcclxuICAgICAgICBjb25zdCBlbXB0eVBpeGVscyA9IG5ldyBVaW50OEFycmF5KHdpZHRoICogaGVpZ2h0ICogNCk7XHJcbiAgICAgICAgdGhpcy5fYmFja2dyb3VuZFRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3NjcmVlblRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmKCF0aGlzLl93aW5kVGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9wcmVwYXJlV2luZFRleHR1cmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIF9wcmVwYXJlV2luZFRleHR1cmUoKSB7XHJcbiAgICAgICAgLy9pZiBpbWFnZSBpcyBzcmNcclxuICAgICAgICBpZiAobWFwdGFsa3MuVXRpbC5pc1N0cmluZyh0aGlzLl93aW5kRGF0YS5pbWFnZSkpIHtcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gdGhpcy5fd2luZERhdGEuaW1hZ2U7XHJcbiAgICAgICAgICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3dpbmREYXRhLmltYWdlID0gaW1hZ2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jcmVhdGVXaW5kVGV4dHVyZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXllci5maXJlKCd3aW5kdGV4dHVyZS1jcmVhdGUtZGVidWcnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVdpbmRUZXh0dXJlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9jcmVhdGVXaW5kVGV4dHVyZSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuX3dpbmREYXRhLmltYWdlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fd2luZFRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLl93aW5kRGF0YS5pbWFnZSxcclxuICAgICAgICAgICAgbWFnOiAnbGluZWFyJyxcclxuICAgICAgICAgICAgbWluOiAnbGluZWFyJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIF9wcmVwYXJlUGFydGljbGVzKCkge1xyXG4gICAgICAgIGNvbnN0IHBhcnRpY2xlUmVzID0gdGhpcy5fcGFydGljbGVTdGF0ZVJlc29sdXRpb24gPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KHRoaXMuX3BhcnRpY2xlc0NvdW50KSk7XHJcbiAgICAgICAgdGhpcy5fbnVtUGFydGljbGVzID0gcGFydGljbGVSZXMgKiBwYXJ0aWNsZVJlcztcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZVN0YXRlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5fbnVtUGFydGljbGVzICogNCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0aWNsZVN0YXRlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHBhcnRpY2xlU3RhdGVbaV0gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyNTYpOyAvLyByYW5kb21pemUgdGhlIGluaXRpYWwgcGFydGljbGUgcG9zaXRpb25zXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5yZWdsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGV4dHVyZXMgdG8gaG9sZCB0aGUgcGFydGljbGUgc3RhdGUgZm9yIHRoZSBjdXJyZW50IGFuZCB0aGUgbmV4dCBmcmFtZVxyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMCA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgZGF0YSA6IHBhcnRpY2xlU3RhdGUsXHJcbiAgICAgICAgICAgIHdpZHRoIDogcGFydGljbGVSZXMsXHJcbiAgICAgICAgICAgIGhlaWdodCA6IHBhcnRpY2xlUmVzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUxID0gdGhpcy5yZWdsLnRleHR1cmUoe1xyXG4gICAgICAgICAgICBkYXRhIDogcGFydGljbGVTdGF0ZSxcclxuICAgICAgICAgICAgd2lkdGggOiBwYXJ0aWNsZVJlcyxcclxuICAgICAgICAgICAgaGVpZ2h0IDogcGFydGljbGVSZXNcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVJbmRpY2VzID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLl9udW1QYXJ0aWNsZXMpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5fbnVtUGFydGljbGVzOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5fcGFydGljbGVJbmRpY2VzW2ldID0gaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX3ByZXBhcmVTaGFkZXIoKSB7XHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB7XHJcbiAgICAgICAgICAgIHggOiAwLFxyXG4gICAgICAgICAgICB5IDogMCxcclxuICAgICAgICAgICAgd2lkdGggOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYW52YXMgPyB0aGlzLmNhbnZhcy53aWR0aCA6IDE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGhlaWdodCA6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbnZhcyA/IHRoaXMuY2FudmFzLmhlaWdodCA6IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuZHJhd1NoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcclxuICAgICAgICAgICAgdmVydCA6IGRyYXdWZXJ0LFxyXG4gICAgICAgICAgICBmcmFnIDogZHJhd0ZyYWcsXHJcbiAgICAgICAgICAgIHVuaWZvcm1zIDogW1xyXG4gICAgICAgICAgICAgICAgJ2V4dGVudCcsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kJyxcclxuICAgICAgICAgICAgICAgICd1X3BhcnRpY2xlcycsXHJcbiAgICAgICAgICAgICAgICAndV9jb2xvcl9yYW1wJyxcclxuICAgICAgICAgICAgICAgICd1X3BhcnRpY2xlc19yZXMnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9taW4nLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9tYXgnXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzIDogeyB2aWV3cG9ydCB9LFxyXG4gICAgICAgICAgICBkZWZpbmVzIDoge31cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5zY3JlZW5TaGFkZXIgPSBuZXcgcmVzaGFkZXIuTWVzaFNoYWRlcih7XHJcbiAgICAgICAgICAgIHZlcnQgOiBxdWFkVmVydCxcclxuICAgICAgICAgICAgZnJhZyA6IHNjcmVlbkZyYWcsXHJcbiAgICAgICAgICAgIHVuaWZvcm1zOiBbXHJcbiAgICAgICAgICAgICAgICAndV9zY3JlZW4nLFxyXG4gICAgICAgICAgICAgICAgJ3Vfb3BhY2l0eSdcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgZXh0cmFDb21tYW5kUHJvcHMgOiB7XHJcbiAgICAgICAgICAgICAgICB2aWV3cG9ydFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZpbmVzIDoge31cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVTSGFkZXIgPSBuZXcgcmVzaGFkZXIuTWVzaFNoYWRlcih7XHJcbiAgICAgICAgICAgIHZlcnQgOiBxdWFkVmVydCxcclxuICAgICAgICAgICAgZnJhZyA6IHVwZGF0ZUZyYWcsXHJcbiAgICAgICAgICAgIHVuaWZvcm1zOiBbXHJcbiAgICAgICAgICAgICAgICAnZXh0ZW50JyxcclxuICAgICAgICAgICAgICAgICd1X3dpbmQnLFxyXG4gICAgICAgICAgICAgICAgJ3VfcGFydGljbGVzJyxcclxuICAgICAgICAgICAgICAgICd1X3JhbmRfc2VlZCcsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kX3JlcycsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kX21pbicsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kX21heCcsXHJcbiAgICAgICAgICAgICAgICAndV9zcGVlZF9mYWN0b3InLFxyXG4gICAgICAgICAgICAgICAgJ3VfZHJvcF9yYXRlJyxcclxuICAgICAgICAgICAgICAgICd1X2Ryb3BfcmF0ZV9idW1wJ1xyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBleHRyYUNvbW1hbmRQcm9wcyA6IHsgXHJcbiAgICAgICAgICAgICAgICB2aWV3cG9ydCA6IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGggOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXJ0aWNsZVN0YXRlUmVzb2x1dGlvbjtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodCA6KCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGFydGljbGVTdGF0ZVJlc29sdXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGRpdGhlcjogdHJ1ZSBcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmaW5lcyA6IHt9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMud2luZFNoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcclxuICAgICAgICAgICAgdmVydDogd2luZFZlcnQsXHJcbiAgICAgICAgICAgIGZyYWc6IHdpbmRGcmFnLFxyXG4gICAgICAgICAgICB1bmlmb3JtczogW1xyXG4gICAgICAgICAgICAgICAgJ3Vfc2NyZWVuJyxcclxuICAgICAgICAgICAgICAgICd1X29wYWNpdHknLFxyXG4gICAgICAgICAgICAgICAgJ3Byb2pWaWV3TWF0cml4JyxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lIDogJ3Byb2pWaWV3TW9kZWxNYXRyaXgnLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiAnZnVuY3Rpb24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGZuIDogZnVuY3Rpb24gKGNvbnRleHQsIHByb3BzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXQ0Lm11bHRpcGx5KFtdLCBwcm9wc1sncHJvalZpZXdNYXRyaXgnXSwgcHJvcHNbJ21vZGVsTWF0cml4J10pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgZXh0cmFDb21tYW5kUHJvcHM6IHsgXHJcbiAgICAgICAgICAgICAgICB2aWV3cG9ydFxyXG4gICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmaW5lczoge31cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBfY3JlYXRlR0xDb250ZXh0KGNhbnZhcywgb3B0aW9ucykge1xyXG4gICAgICAgIGNvbnN0IG5hbWVzID0gWyd3ZWJnbCcsICdleHBlcmltZW50YWwtd2ViZ2wnXTtcclxuICAgICAgICBsZXQgY29udGV4dCA9IG51bGw7XHJcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tZW1wdHkgKi9cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQobmFtZXNbaV0sIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxyXG4gICAgICAgICAgICBpZiAoY29udGV4dCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XHJcbiAgICAgICAgLyogZXNsaW50LWVuYWJsZSBuby1lbXB0eSAqL1xyXG4gICAgfVxyXG5cclxuICAgIHJlc2l6ZUNhbnZhcygpIHtcclxuICAgICAgICBpZih0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSAmJiB0aGlzLl9zY3JlZW5UZXh0dXJlICYmIHRoaXMuX2lzQ2FudmFzUmVzaXplKCkpIHtcclxuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmNhbnZhcy53aWR0aDtcclxuICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xyXG4gICAgICAgICAgICBjb25zdCBlbXB0eVBpeGVscyA9IG5ldyBVaW50OEFycmF5KHdpZHRoICogaGVpZ2h0ICogNCk7XHJcbiAgICAgICAgICAgIHRoaXMuX2JhY2tncm91bmRUZXh0dXJlKHtcclxuICAgICAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgZGF0YSA6IGVtcHR5UGl4ZWxzXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLl9zY3JlZW5UZXh0dXJlKHtcclxuICAgICAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgZGF0YSA6IGVtcHR5UGl4ZWxzXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLl9jYW52YXNXaWR0aCA9IHdpZHRoO1xyXG4gICAgICAgICAgICB0aGlzLl9jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN1cGVyLnJlc2l6ZUNhbnZhcygpO1xyXG4gICAgfVxyXG5cclxuICAgIF9pc0NhbnZhc1Jlc2l6ZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY2FudmFzV2lkdGggIT0gdGhpcy5jYW52YXMud2lkdGggfHwgdGhpcy5fY2FudmFzSGVpZ2h0ICE9IHRoaXMuY2FudmFzLmhlaWdodDtcclxuICAgIH1cclxuXHJcbiAgICBfc2V0RGF0YShkYXRhKSB7XHJcbiAgICAgICAgdGhpcy5fd2luZERhdGEgPSBkYXRhO1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVXaW5kVGV4dHVyZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIF9zZXRQYXJ0aWNsZXNDb3VudChjb3VudCkge1xyXG4gICAgICAgIC8vIHdlIGNyZWF0ZSBhIHNxdWFyZSB0ZXh0dXJlIHdoZXJlIGVhY2ggcGl4ZWwgd2lsbCBob2xkIGEgcGFydGljbGUgcG9zaXRpb24gZW5jb2RlZCBhcyBSR0JBXHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVzQ291bnQgPSBjb3VudDtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlUGFydGljbGVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFBhcnRpY2xlc0NvdW50KCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJ0aWNsZXNDb3VudDtcclxuICAgIH1cclxuXHJcbiAgICBfc2V0Q29sb3JSYW1wKGNvbG9ycykge1xyXG4gICAgICAgIC8vIGxvb2t1cCB0ZXh0dXJlIGZvciBjb2xvcml6aW5nIHRoZSBwYXJ0aWNsZXMgYWNjb3JkaW5nIHRvIHRoZWlyIHNwZWVkXHJcbiAgICAgICAgdGhpcy5fY29sb3JSYW1wVGV4dHVyZSA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgd2lkdGggOiAxNixcclxuICAgICAgICAgICAgaGVpZ2h0IDogMTYsXHJcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLl9nZXRDb2xvclJhbXAoY29sb3JzKSxcclxuICAgICAgICAgICAgbWFnIDogJ2xpbmVhcicsXHJcbiAgICAgICAgICAgIG1pbiA6ICdsaW5lYXInXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldENvbG9yUmFtcChjb2xvcnMpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgICBjYW52YXMud2lkdGggPSAyNTY7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IDE7XHJcbiAgICAgICAgY29uc3QgZ3JhZGllbnQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgMCwgMjU2LCAwKTtcclxuICAgICAgICBmb3IgKGNvbnN0IHN0b3AgaW4gY29sb3JzKSB7XHJcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgrc3RvcCwgY29sb3JzW3N0b3BdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCAyNTYsIDEpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIDI1NiwgMSkuZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFF1YWRTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBwbGFuZSA9IG5ldyByZXNoYWRlci5HZW9tZXRyeSh7XHJcbiAgICAgICAgICAgIGFfcG9zIDogWzAsIDAsIDEsIDAsIDAsIDEsIDAsIDEsIDEsIDAsIDEsIDFdXHJcbiAgICAgICAgfSwgNiwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmUgOiAndHJpYW5nbGUnLFxyXG4gICAgICAgICAgICBwb3NpdGlvbkF0dHJpYnV0ZTogJ2FfcG9zJyxcclxuICAgICAgICAgICAgcG9zaXRpb25TaXplIDogMlxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHBsYW5lTWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHBsYW5lKTtcclxuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyByZXNoYWRlci5TY2VuZShbcGxhbmVNZXNoXSk7XHJcbiAgICAgICAgcmV0dXJuIHNjZW5lO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRQYXJ0aWNsZXNTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZXMgPSBuZXcgcmVzaGFkZXIuR2VvbWV0cnkoe1xyXG4gICAgICAgICAgICBhX2luZGV4IDogdGhpcy5fcGFydGljbGVJbmRpY2VzXHJcbiAgICAgICAgfSwgdGhpcy5fcGFydGljbGVJbmRpY2VzLmxlbmd0aCwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmUgOiAncG9pbnQnLFxyXG4gICAgICAgICAgICBwb3NpdGlvbkF0dHJpYnV0ZTogJ2FfaW5kZXgnLFxyXG4gICAgICAgICAgICBwb3NpdGlvblNpemUgOiAxXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVzTWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHBhcnRpY2xlcyk7XHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3BhcnRpY2xlc01lc2hdKTtcclxuICAgICAgICByZXR1cm4gc2NlbmU7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFdpbmRTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmxheWVyLmdldE1hcCgpO1xyXG4gICAgICAgIGNvbnN0IGV4dGVudCA9IHRoaXMuX2dldE1hcEV4dGVudCgpO1xyXG4gICAgICAgIGNvbnN0IGx0ID0gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBuZXcgbWFwdGFsa3MuQ29vcmRpbmF0ZShbZXh0ZW50LnhtaW4sIGV4dGVudC55bWF4XSkpO1xyXG4gICAgICAgIGNvbnN0IGxiID0gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBuZXcgbWFwdGFsa3MuQ29vcmRpbmF0ZShleHRlbnQueG1pbiwgZXh0ZW50LnltaW4pKTtcclxuICAgICAgICBjb25zdCByYiA9IGNvb3JkaW5hdGVUb1dvcmxkKG1hcCwgbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZXh0ZW50LnhtYXgsIGV4dGVudC55bWluKSk7XHJcbiAgICAgICAgY29uc3QgcnQgPSBjb29yZGluYXRlVG9Xb3JsZChtYXAsIG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKGV4dGVudC54bWF4LCBleHRlbnQueW1heCkpO1xyXG4gICAgICAgIGNvbnN0IHBsYW5lID0gbmV3IHJlc2hhZGVyLkdlb21ldHJ5KHtcclxuICAgICAgICAgICAgYV9wb3M6IFtcclxuICAgICAgICAgICAgICAgIGxiWzBdLCBsYlsxXSwgbGJbMl0sLy/lt6bkuItcclxuICAgICAgICAgICAgICAgIHJiWzBdLCByYlsxXSwgcmJbMl0sLy/lj7PkuItcclxuICAgICAgICAgICAgICAgIGx0WzBdLCBsdFsxXSwgbHRbMl0sLy/lt6bkuIpcclxuICAgICAgICAgICAgICAgIGx0WzBdLCBsdFsxXSwgbHRbMl0sLy/lt6bkuIpcclxuICAgICAgICAgICAgICAgIHJiWzBdLCByYlsxXSwgcmJbMl0sLy/lj7PkuItcclxuICAgICAgICAgICAgICAgIHJ0WzBdLCBydFsxXSwgcnRbMl0vL+WPs+S4ilxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB1diA6IFtcclxuICAgICAgICAgICAgICAgIDAsIDAsXHJcbiAgICAgICAgICAgICAgICAxLCAwLFxyXG4gICAgICAgICAgICAgICAgMCwgMSxcclxuICAgICAgICAgICAgICAgIDAsIDEsXHJcbiAgICAgICAgICAgICAgICAxLCAwLFxyXG4gICAgICAgICAgICAgICAgMSwgMVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSwgNiwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmU6ICd0cmlhbmdsZScsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uQXR0cmlidXRlOiAnYV9wb3MnLFxyXG4gICAgICAgICAgICBwb3NpdGlvblNpemU6IDNcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCBwbGFuZU1lc2ggPSBuZXcgcmVzaGFkZXIuTWVzaChwbGFuZSk7XHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3BsYW5lTWVzaF0pO1xyXG4gICAgICAgIHJldHVybiBzY2VuZTtcclxuICAgIH1cclxuXHJcbiAgICBfZHJhd1NjcmVlbigpIHtcclxuICAgICAgICB0aGlzLl9mcmFtZWJ1ZmZlcih7XHJcbiAgICAgICAgICAgIGNvbG9yIDogdGhpcy5fc2NyZWVuVGV4dHVyZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX2RyYXdQYXJ0aWNsZXMoKTtcclxuICAgICAgICBjb25zdCBxdWFkU2NlbmUgPSB0aGlzLl9nZXRRdWFkU2NlbmUoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnNjcmVlblNoYWRlcix7XHJcbiAgICAgICAgICAgIHVfc2NyZWVuIDogdGhpcy5fYmFja2dyb3VuZFRleHR1cmUsXHJcbiAgICAgICAgICAgIHVfb3BhY2l0eSA6IHRoaXMuX2ZhZGVPcGFjaXR5XHJcbiAgICAgICAgfSwgcXVhZFNjZW5lLCB0aGlzLl9mcmFtZWJ1ZmZlcik7XHJcbiAgICAgICAgY29uc3Qgd2luZFNjZW5lID0gdGhpcy5fZ2V0V2luZFNjZW5lKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy53aW5kU2hhZGVyLCB7XHJcbiAgICAgICAgICAgIHVfc2NyZWVuOiB0aGlzLl9zY3JlZW5UZXh0dXJlLFxyXG4gICAgICAgICAgICB1X29wYWNpdHk6IDEuMCxcclxuICAgICAgICAgICAgcHJvalZpZXdNYXRyaXggOiBtYXAucHJvalZpZXdNYXRyaXhcclxuICAgICAgICB9LCB3aW5kU2NlbmUpO1xyXG4gICAgICAgIGNvbnN0IHRlbXAgPSB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZTtcclxuICAgICAgICB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSA9IHRoaXMuX3NjcmVlblRleHR1cmU7XHJcbiAgICAgICAgdGhpcy5fc2NyZWVuVGV4dHVyZSA9IHRlbXA7XHJcbiAgICB9XHJcblxyXG4gICAgX2RyYXdQYXJ0aWNsZXMoKSB7XHJcbiAgICAgICAgY29uc3QgZXh0ZW50ID0gdGhpcy5fZ2V0TWFwRXh0ZW50KCk7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVTY2VuZSA9IHRoaXMuX2dldFBhcnRpY2xlc1NjZW5lKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5kcmF3U2hhZGVyLCB7XHJcbiAgICAgICAgICAgIGV4dGVudCA6IFtleHRlbnQueG1pbiwgZXh0ZW50LnhtYXgsIC1leHRlbnQueW1heCwgLWV4dGVudC55bWluXSxcclxuICAgICAgICAgICAgdV93aW5kOiB0aGlzLl93aW5kVGV4dHVyZSxcclxuICAgICAgICAgICAgdV9wYXJ0aWNsZXM6IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMCxcclxuICAgICAgICAgICAgdV9jb2xvcl9yYW1wOiB0aGlzLl9jb2xvclJhbXBUZXh0dXJlLFxyXG4gICAgICAgICAgICB1X3BhcnRpY2xlc19yZXM6IHRoaXMuX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uLFxyXG4gICAgICAgICAgICB1X3dpbmRfbWluOiBbdGhpcy5fd2luZERhdGEudU1pbiwgdGhpcy5fd2luZERhdGEudk1pbl0sXHJcbiAgICAgICAgICAgIHVfd2luZF9tYXg6IFt0aGlzLl93aW5kRGF0YS51TWF4LCB0aGlzLl93aW5kRGF0YS52TWF4XVxyXG4gICAgICAgIH0sIHBhcnRpY2xlU2NlbmUsIHRoaXMuX2ZyYW1lYnVmZmVyKTtcclxuICAgIH1cclxuXHJcbiAgICBfdXBkYXRlUGFydGljbGVzKCkge1xyXG4gICAgICAgIHRoaXMuX2ZyYW1lYnVmZmVyKHtcclxuICAgICAgICAgICAgY29sb3I6IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IGV4dGVudCA9IHRoaXMuX2dldE1hcEV4dGVudCgpO1xyXG4gICAgICAgIGNvbnN0IHF1YWRTY2VuZSA9IHRoaXMuX2dldFF1YWRTY2VuZSgpO1xyXG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMudXBkYXRlU0hhZGVyLCB7XHJcbiAgICAgICAgICAgIGV4dGVudCA6IFtleHRlbnQueG1pbiwgZXh0ZW50LnhtYXgsIC1leHRlbnQueW1heCwgLWV4dGVudC55bWluXSxcclxuICAgICAgICAgICAgdV93aW5kOiB0aGlzLl93aW5kVGV4dHVyZSxcclxuICAgICAgICAgICAgdV9wYXJ0aWNsZXM6IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMCxcclxuICAgICAgICAgICAgdV9yYW5kX3NlZWQ6IE1hdGgucmFuZG9tKCksXHJcbiAgICAgICAgICAgIHVfd2luZF9yZXM6IFt0aGlzLl93aW5kRGF0YS53aWR0aCwgdGhpcy5fd2luZERhdGEuaGVpZ2h0XSxcclxuICAgICAgICAgICAgdV93aW5kX21pbjogW3RoaXMuX3dpbmREYXRhLnVNaW4sIHRoaXMuX3dpbmREYXRhLnZNaW5dLFxyXG4gICAgICAgICAgICB1X3dpbmRfbWF4OiBbdGhpcy5fd2luZERhdGEudU1heCwgdGhpcy5fd2luZERhdGEudk1heF0sXHJcbiAgICAgICAgICAgIHVfc3BlZWRfZmFjdG9yOiB0aGlzLl9zcGVlZEZhY3RvcixcclxuICAgICAgICAgICAgdV9kcm9wX3JhdGU6IHRoaXMuX2Ryb3BSYXRlLFxyXG4gICAgICAgICAgICB1X2Ryb3BfcmF0ZV9idW1wOiB0aGlzLl9kcm9wUmF0ZUJ1bXAsXHJcbiAgICAgICAgfSwgcXVhZFNjZW5lLCB0aGlzLl9mcmFtZWJ1ZmZlcik7XHJcblxyXG4gICAgICAgIGNvbnN0IHRlbXAgPSB0aGlzLl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTA7XHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwID0gdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUxO1xyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMSA9IHRlbXA7XHJcbiAgICB9XHJcblxyXG4gICAgX3JlbmRlcldpbmRTY2VuZSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuX3NjcmVlblRleHR1cmUgfHwhdGhpcy5fYmFja2dyb3VuZFRleHR1cmUgfHwgIXRoaXMuX3dpbmRUZXh0dXJlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlUGFyYW1zKCk7XHJcbiAgICAgICAgdGhpcy5fZHJhd1NjcmVlbigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZVBhcnRpY2xlcygpO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRNYXBFeHRlbnQoKSB7XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5sYXllci5nZXRNYXAoKTtcclxuICAgICAgICBjb25zdCBleHRlbnQgPSBtYXAuZ2V0RXh0ZW50KCk7XHJcbiAgICAgICAgaWYgKGV4dGVudC54bWF4IDwgZXh0ZW50LnhtaW4pIHtcclxuICAgICAgICAgICAgZXh0ZW50LnhtYXggPSBleHRlbnQueG1heCArIDM2MDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGV4dGVudDtcclxuICAgIH1cclxuXHJcbiAgICBfZ2V0U3BlZWQoY29vcmRpbmF0ZSkge1xyXG4gICAgICAgIGlmICghdGhpcy5yZWdsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgdCA9IGNvb3JkaW5hdGUueCAlIDE4MDtcclxuICAgICAgICBjb25zdCBwaXhlbFggPSAoKCB0ICsgMTgwKSAvIDM2MCkgKiB0aGlzLl93aW5kRGF0YS53aWR0aDtcclxuICAgICAgICBpZiAoY29vcmRpbmF0ZS55IDwgLTkwIHx8IGNvb3JkaW5hdGUueSA+IDkwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB5IGZvciBjb29yZGluYXRlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHBpeGVsWSA9ICgoOTAgLSBjb29yZGluYXRlLnkpIC8gMTgwKSAqIHRoaXMuX3dpbmREYXRhLmhlaWdodDtcclxuICAgICAgICBjb25zdCBmcmFtZWJ1ZmZlciA9IHRoaXMucmVnbC5mcmFtZWJ1ZmZlcih7XHJcbiAgICAgICAgICAgIGNvbG9yIDogdGhpcy5fd2luZFRleHR1cmUsXHJcbiAgICAgICAgICAgIHdpZHRoIDogdGhpcy5fd2luZERhdGEud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCA6IHRoaXMuX3dpbmREYXRhLmhlaWdodFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucmVnbC5yZWFkKHtcclxuICAgICAgICAgICAgeDogcGl4ZWxYLFxyXG4gICAgICAgICAgICB5OiBwaXhlbFksXHJcbiAgICAgICAgICAgIHdpZHRoOiAxLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgIGZyYW1lYnVmZmVyXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgdnggPSBwaXhlbHNbMF0gKiAodGhpcy5fd2luZERhdGEudU1heCAtIHRoaXMuX3dpbmREYXRhLnVNaW4pIC8gMjU1ICsgdGhpcy5fd2luZERhdGEudU1pbjtcclxuICAgICAgICBjb25zdCB2eSA9IHBpeGVsc1sxXSAqICh0aGlzLl93aW5kRGF0YS52TWF4IC0gdGhpcy5fd2luZERhdGEudk1pbikgLyAyNTUgKyB0aGlzLl93aW5kRGF0YS52TWluO1xyXG4gICAgICAgIHJldHVybiBbdngsIHZ5XTtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IFdpbmRMYXllclJlbmRlcmVyO1xyXG5cclxuZnVuY3Rpb24gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBjb29yZGluYXRlLCB6ID0gMCkge1xyXG4gICAgaWYgKCFtYXApIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIGNvbnN0IHAgPSBtYXAuY29vcmRpbmF0ZVRvUG9pbnQoY29vcmRpbmF0ZSwgbWFwLmdldEdMWm9vbSgpKTtcclxuICAgIHJldHVybiBbcC54LCBwLnksIHpdO1xyXG59XHJcbiIsImltcG9ydCAqIGFzIG1hcHRhbGtzIGZyb20gJ21hcHRhbGtzJztcclxuaW1wb3J0IFdpbmRMYXllclJlbmRlcmVyIGZyb20gJy4vV2luZExheWVyUmVuZGVyZXInO1xyXG5cclxuY29uc3QgZGVmYXVsdFJhbXBDb2xvcnMgPSB7XHJcbiAgICAwLjA6ICcjMzI4OGJkJyxcclxuICAgIDAuMTogJyM2NmMyYTUnLFxyXG4gICAgMC4yOiAnI2FiZGRhNCcsXHJcbiAgICAwLjM6ICcjZTZmNTk4JyxcclxuICAgIDAuNDogJyNmZWUwOGInLFxyXG4gICAgMC41OiAnI2ZkYWU2MScsXHJcbiAgICAwLjY6ICcjZjQ2ZDQzJyxcclxuICAgIDEuMDogJyNkNTNlNGYnXHJcbn07XHJcblxyXG5jb25zdCBvcHRpb25zID0ge1xyXG4gICAgJ3JlbmRlcmVyJyA6ICdnbCcsXHJcbiAgICAnY291bnQnIDogMjU2ICogMjU2LFxyXG4gICAgJ2ZhZGVPcGFjaXR5JyA6IDAuOTk2LFxyXG4gICAgJ3NwZWVkRmFjdG9yJyA6IDAuMjUsXHJcbiAgICAnZHJvcFJhdGUnIDogMC4wMDMsXHJcbiAgICAnZHJvcFJhdGVCdW1wJyA6IDAuMDEsXHJcbiAgICAnY29sb3JzJyA6IGRlZmF1bHRSYW1wQ29sb3JzXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5kTGF5ZXIgZXh0ZW5kcyBtYXB0YWxrcy5MYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihpZCwgb3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKGlkLCBvcHRpb25zKTtcclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRhdGEpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRXaW5kKG9wdGlvbnMuZGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldFdpbmQod2luZERhdGEpIHtcclxuICAgICAgICB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ19zZXREYXRhJywgd2luZERhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFBhcnRpY2xlc0NvdW50KGNvdW50KSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbFJlbmRlcmVyTWV0aG9kKCdfc2V0UGFydGljbGVzQ291bnQnLCBjb3VudCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UGFydGljbGVzQ291bnQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbGxSZW5kZXJlck1ldGhvZCgnX2dldFBhcnRpY2xlc0NvdW50Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0UmFtcENvbG9ycyhjb2xvcnMpIHtcclxuICAgICAgICB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ19zZXRDb2xvclJhbXAnLCBjb2xvcnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFdpbmRTcGVlZChjb29yZCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ19nZXRTcGVlZCcsIGNvb3JkKTtcclxuICAgIH1cclxuXHJcbiAgICBfY2FsbFJlbmRlcmVyTWV0aG9kKGZ1bmMsIHBhcmFtcykge1xyXG4gICAgICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5nZXRSZW5kZXJlcigpO1xyXG4gICAgICAgIGlmIChyZW5kZXJlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVuZGVyZXJbZnVuY10ocGFyYW1zKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXJlcmNyZWF0ZScsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZS5yZW5kZXJlcltmdW5jXShwYXJhbXMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuV2luZExheWVyLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcclxuV2luZExheWVyLnJlZ2lzdGVySlNPTlR5cGUoJ1dpbmRMYXllcicpO1xyXG5cclxuV2luZExheWVyLnJlZ2lzdGVyUmVuZGVyZXIoJ2dsJywgV2luZExheWVyUmVuZGVyZXIpO1xyXG4iXSwibmFtZXMiOlsiV2luZExheWVyUmVuZGVyZXIiLCJsYXllciIsIl91cGRhdGVQYXJhbXMiLCJfd2luZERhdGEiLCJkcmF3IiwicHJlcGFyZUNhbnZhcyIsIl9yZW5kZXJXaW5kU2NlbmUiLCJkcmF3T25JbnRlcmFjdGluZyIsIm5lZWRUb1JlZHJhdyIsImhpdERldGVjdCIsImNyZWF0ZUNvbnRleHQiLCJjYW52YXMiLCJnbCIsIndyYXAiLCJhdHRyaWJ1dGVzIiwib3B0aW9ucyIsImdsT3B0aW9ucyIsImFscGhhIiwiZGVwdGgiLCJzdGVuY2lsIiwiX2NyZWF0ZUdMQ29udGV4dCIsInNpemUiLCJnZXRNYXAiLCJnZXRTaXplIiwid2lkdGgiLCJoZWlnaHQiLCJyZWdsIiwiY3JlYXRlUkVHTCIsImV4dGVuc2lvbnMiLCJvcHRpb25hbEV4dGVuc2lvbnMiLCJfaW5pdFJlbmRlcmVyIiwiY2xlYXJDYW52YXMiLCJjbGVhciIsImNvbG9yIiwiX3BhcnRpY2xlc0NvdW50IiwiY291bnQiLCJfZmFkZU9wYWNpdHkiLCJmYWRlT3BhY2l0eSIsIl9zcGVlZEZhY3RvciIsInNwZWVkRmFjdG9yIiwiX2Ryb3BSYXRlIiwiZHJvcFJhdGUiLCJfZHJvcFJhdGVCdW1wIiwiZHJvcFJhdGVCdW1wIiwiX3JhbXBDb2xvcnMiLCJjb2xvcnMiLCJyZW5kZXJlciIsInJlc2hhZGVyIiwiUmVuZGVyZXIiLCJfY2FudmFzV2lkdGgiLCJfY2FudmFzSGVpZ2h0IiwiX3ByZXBhcmVQYXJ0aWNsZXMiLCJfcHJlcGFyZVRleHR1cmUiLCJfcHJlcGFyZVNoYWRlciIsIl9zZXRDb2xvclJhbXAiLCJfZnJhbWVidWZmZXIiLCJmcmFtZWJ1ZmZlciIsInRleHR1cmUiLCJlbXB0eVBpeGVscyIsIlVpbnQ4QXJyYXkiLCJfYmFja2dyb3VuZFRleHR1cmUiLCJkYXRhIiwiX3NjcmVlblRleHR1cmUiLCJfd2luZFRleHR1cmUiLCJfcHJlcGFyZVdpbmRUZXh0dXJlIiwibWFwdGFsa3MiLCJpc1N0cmluZyIsImltYWdlIiwiSW1hZ2UiLCJzcmMiLCJvbmxvYWQiLCJfY3JlYXRlV2luZFRleHR1cmUiLCJmaXJlIiwibWFnIiwibWluIiwicGFydGljbGVSZXMiLCJfcGFydGljbGVTdGF0ZVJlc29sdXRpb24iLCJNYXRoIiwiY2VpbCIsInNxcnQiLCJfbnVtUGFydGljbGVzIiwicGFydGljbGVTdGF0ZSIsImkiLCJsZW5ndGgiLCJmbG9vciIsInJhbmRvbSIsIl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTAiLCJfcGFydGljbGVTdGF0ZVRleHR1cmUxIiwiX3BhcnRpY2xlSW5kaWNlcyIsIkZsb2F0MzJBcnJheSIsInZpZXdwb3J0IiwieCIsInkiLCJkcmF3U2hhZGVyIiwiTWVzaFNoYWRlciIsInZlcnQiLCJkcmF3VmVydCIsImZyYWciLCJkcmF3RnJhZyIsInVuaWZvcm1zIiwiZXh0cmFDb21tYW5kUHJvcHMiLCJkZWZpbmVzIiwic2NyZWVuU2hhZGVyIiwicXVhZFZlcnQiLCJzY3JlZW5GcmFnIiwidXBkYXRlU0hhZGVyIiwidXBkYXRlRnJhZyIsImRpdGhlciIsIndpbmRTaGFkZXIiLCJ3aW5kVmVydCIsIndpbmRGcmFnIiwibmFtZSIsInR5cGUiLCJmbiIsImNvbnRleHQiLCJwcm9wcyIsIm1hdDQiLCJtdWx0aXBseSIsIm5hbWVzIiwiZ2V0Q29udGV4dCIsImUiLCJyZXNpemVDYW52YXMiLCJfaXNDYW52YXNSZXNpemUiLCJfc2V0RGF0YSIsIl9zZXRQYXJ0aWNsZXNDb3VudCIsIl9nZXRQYXJ0aWNsZXNDb3VudCIsIl9jb2xvclJhbXBUZXh0dXJlIiwiX2dldENvbG9yUmFtcCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImN0eCIsImdyYWRpZW50IiwiY3JlYXRlTGluZWFyR3JhZGllbnQiLCJzdG9wIiwiYWRkQ29sb3JTdG9wIiwiZmlsbFN0eWxlIiwiZmlsbFJlY3QiLCJnZXRJbWFnZURhdGEiLCJfZ2V0UXVhZFNjZW5lIiwicGxhbmUiLCJHZW9tZXRyeSIsImFfcG9zIiwicHJpbWl0aXZlIiwicG9zaXRpb25BdHRyaWJ1dGUiLCJwb3NpdGlvblNpemUiLCJwbGFuZU1lc2giLCJNZXNoIiwic2NlbmUiLCJTY2VuZSIsIl9nZXRQYXJ0aWNsZXNTY2VuZSIsInBhcnRpY2xlcyIsImFfaW5kZXgiLCJwYXJ0aWNsZXNNZXNoIiwiX2dldFdpbmRTY2VuZSIsIm1hcCIsImV4dGVudCIsIl9nZXRNYXBFeHRlbnQiLCJsdCIsImNvb3JkaW5hdGVUb1dvcmxkIiwieG1pbiIsInltYXgiLCJsYiIsInltaW4iLCJyYiIsInhtYXgiLCJydCIsInV2IiwiX2RyYXdTY3JlZW4iLCJfZHJhd1BhcnRpY2xlcyIsInF1YWRTY2VuZSIsInJlbmRlciIsInVfc2NyZWVuIiwidV9vcGFjaXR5Iiwid2luZFNjZW5lIiwicHJvalZpZXdNYXRyaXgiLCJ0ZW1wIiwicGFydGljbGVTY2VuZSIsInVfd2luZCIsInVfcGFydGljbGVzIiwidV9jb2xvcl9yYW1wIiwidV9wYXJ0aWNsZXNfcmVzIiwidV93aW5kX21pbiIsInVNaW4iLCJ2TWluIiwidV93aW5kX21heCIsInVNYXgiLCJ2TWF4IiwiX3VwZGF0ZVBhcnRpY2xlcyIsInVfcmFuZF9zZWVkIiwidV93aW5kX3JlcyIsInVfc3BlZWRfZmFjdG9yIiwidV9kcm9wX3JhdGUiLCJ1X2Ryb3BfcmF0ZV9idW1wIiwiZ2V0RXh0ZW50IiwiX2dldFNwZWVkIiwiY29vcmRpbmF0ZSIsInQiLCJwaXhlbFgiLCJFcnJvciIsInBpeGVsWSIsInBpeGVscyIsInJlYWQiLCJ2eCIsInZ5IiwiQ2FudmFzUmVuZGVyZXIiLCJ6IiwicCIsImNvb3JkaW5hdGVUb1BvaW50IiwiZ2V0R0xab29tIiwiZGVmYXVsdFJhbXBDb2xvcnMiLCJXaW5kTGF5ZXIiLCJpZCIsInNldFdpbmQiLCJ3aW5kRGF0YSIsIl9jYWxsUmVuZGVyZXJNZXRob2QiLCJzZXRQYXJ0aWNsZXNDb3VudCIsImdldFBhcnRpY2xlc0NvdW50Iiwic2V0UmFtcENvbG9ycyIsImdldFdpbmRTcGVlZCIsImNvb3JkIiwiZnVuYyIsInBhcmFtcyIsImdldFJlbmRlcmVyIiwib24iLCJtZXJnZU9wdGlvbnMiLCJyZWdpc3RlckpTT05UeXBlIiwicmVnaXN0ZXJSZW5kZXJlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQVlNQTs7O0VBRUYsNkJBQVlDLEtBQVosRUFBbUI7RUFBQTs7RUFDZiw2Q0FBTUEsS0FBTjs7RUFDQSxVQUFLQyxhQUFMOztFQUNBLFVBQUtDLFNBQUwsR0FBaUIsRUFBakI7RUFIZTtFQUlsQjs7OztXQUVEQyxPQUFBLGdCQUFPO0VBQ0gsU0FBS0MsYUFBTDs7RUFDQSxTQUFLQyxnQkFBTDtFQUNIOztXQUVEQyxvQkFBQSw2QkFBb0I7RUFDaEIsU0FBS0QsZ0JBQUw7RUFDSDs7V0FFREUsZUFBQSx3QkFBZTtFQUNYLFdBQU8sSUFBUDtFQUNIOztXQUVEQyxZQUFBLHFCQUFZO0VBQ1IsV0FBTyxLQUFQO0VBQ0g7O1dBRURDLGdCQUFBLHlCQUFnQjtFQUNaLFFBQUksS0FBS0Ms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
