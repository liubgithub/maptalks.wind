/*!
 * maptalks.wind v0.1.1
 * LICENSE : UNLICENSED
 * (c) 2016-2019 maptalks.org
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('maptalks'), require('@maptalks/gl')) :
  typeof define === 'function' && define.amd ? define(['exports', 'maptalks', '@maptalks/gl'], factory) :
  (global = global || self, factory(global.maptalks = global.maptalks || {}, global.maptalks, global.maptalksgl));
}(this, function (exports, maptalks, gl) { 'use strict';

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
      var width = this.canvas.width || 1;
      var height = this.canvas.height || 1;
      this._canvasWidth = width;
      this._canvasHeight = height;

      this._prepareParticles();

      this._prepareTexture();

      this._prepareShader();

      this.setColorRamp(this._rampColors);
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
      var width = this.canvas.width || 1;
      var height = this.canvas.height || 1;
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

    _proto.setData = function setData(data) {
      this._windData = data;

      this._prepareWindTexture();
    };

    _proto.setParticlesCount = function setParticlesCount(count) {
      this._particlesCount = count;

      this._prepareParticles();
    };

    _proto.getParticlesCount = function getParticlesCount() {
      return this._particlesCount;
    };

    _proto.setColorRamp = function setColorRamp(colors) {
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
      var map = this.layer.getMap();

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

    _proto.getSpeed = function getSpeed(coordinate) {
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
      this._callRendererMethod('setData', windData);
    };

    _proto.setParticlesCount = function setParticlesCount(count) {
      this._callRendererMethod('setParticlesCount', count);
    };

    _proto.getParticlesCount = function getParticlesCount() {
      return this._callRendererMethod('getParticlesCount');
    };

    _proto.setRampColors = function setRampColors(colors) {
      this._callRendererMethod('setColorRamp', colors);
    };

    _proto.getWindSpeed = function getWindSpeed(coord) {
      return this._callRendererMethod('getSpeed', coord);
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

  exports.WindLayer = WindLayer;

  Object.defineProperty(exports, '__esModule', { value: true });

  typeof console !== 'undefined' && console.log('maptalks.wind v0.1.1, requires maptalks@<2.0.0.');

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3Mud2luZC1kZXYuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9XaW5kTGF5ZXJSZW5kZXJlci5qcyIsIi4uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGhlcmUgYXJlIG1hbnkgcmVuZGVyaW5nIG1ldGhvZHMgYW5kIGdsc2wgY29kZVxyXG4gKiBiYXNlZCBvbiBwcm9qZWN0IGZpbmlzaGVkIGJ5IEBtb3VybmVyIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3VybmVyIFxyXG4gKiBhbmQgaGlzIHByb2plY3QgaXMgaGVyZSBodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L3dlYmdsLXdpbmQuXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBtYXB0YWxrcyBmcm9tICdtYXB0YWxrcyc7XHJcbmltcG9ydCB7IGNyZWF0ZVJFR0wsIG1hdDQsIHJlc2hhZGVyIH0gZnJvbSAnQG1hcHRhbGtzL2dsJztcclxuaW1wb3J0IGRyYXdWZXJ0IGZyb20gJy4vZ2xzbC9kcmF3LnZlcnQnO1xyXG5pbXBvcnQgZHJhd0ZyYWcgZnJvbSAnLi9nbHNsL2RyYXcuZnJhZyc7XHJcblxyXG5pbXBvcnQgcXVhZFZlcnQgZnJvbSAnLi9nbHNsL3F1YWQudmVydCc7XHJcblxyXG5pbXBvcnQgc2NyZWVuRnJhZyBmcm9tICcuL2dsc2wvc2NyZWVuLmZyYWcnO1xyXG5pbXBvcnQgdXBkYXRlRnJhZyBmcm9tICcuL2dsc2wvdXBkYXRlLmZyYWcnO1xyXG5pbXBvcnQgd2luZFZlcnQgZnJvbSAnLi9nbHNsL3dpbmQudmVydCc7XHJcbmltcG9ydCB3aW5kRnJhZyBmcm9tICcuL2dsc2wvd2luZC5mcmFnJztcclxuXHJcbmNsYXNzIFdpbmRMYXllclJlbmRlcmVyIGV4dGVuZHMgbWFwdGFsa3MucmVuZGVyZXIuQ2FudmFzUmVuZGVyZXIge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGxheWVyKSB7XHJcbiAgICAgICAgc3VwZXIobGF5ZXIpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZVBhcmFtcygpO1xyXG4gICAgICAgIHRoaXMuX3dpbmREYXRhID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgZHJhdygpIHtcclxuICAgICAgICB0aGlzLnByZXBhcmVDYW52YXMoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJXaW5kU2NlbmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBkcmF3T25JbnRlcmFjdGluZygpIHtcclxuICAgICAgICB0aGlzLl9yZW5kZXJXaW5kU2NlbmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBuZWVkVG9SZWRyYXcoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgaGl0RGV0ZWN0KCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVDb250ZXh0KCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNhbnZhcy5nbCAmJiB0aGlzLmNhbnZhcy5nbC53cmFwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2wgPSB0aGlzLmNhbnZhcy5nbC53cmFwKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyO1xyXG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVzID0gbGF5ZXIub3B0aW9ucy5nbE9wdGlvbnMgfHwge1xyXG4gICAgICAgICAgICAgICAgYWxwaGE6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkZXB0aDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIC8vYW50aWFsaWFzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RlbmNpbCA6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5nbE9wdGlvbnMgPSBhdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLmdsID0gdGhpcy5nbCB8fCB0aGlzLl9jcmVhdGVHTENvbnRleHQodGhpcy5jYW52YXMsIGF0dHJpYnV0ZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnJlZ2wgPSBjcmVhdGVSRUdMKHtcclxuICAgICAgICAgICAgZ2wgOiB0aGlzLmdsLFxyXG4gICAgICAgICAgICBleHRlbnNpb25zIDogW1xyXG4gICAgICAgICAgICAgICAgLy8gJ0FOR0xFX2luc3RhbmNlZF9hcnJheXMnLFxyXG4gICAgICAgICAgICAgICAgLy8gJ09FU190ZXh0dXJlX2Zsb2F0JyxcclxuICAgICAgICAgICAgICAgIC8vICdPRVNfdGV4dHVyZV9mbG9hdF9saW5lYXInLFxyXG4gICAgICAgICAgICAgICAgJ09FU19lbGVtZW50X2luZGV4X3VpbnQnLFxyXG4gICAgICAgICAgICAgICAgJ09FU19zdGFuZGFyZF9kZXJpdmF0aXZlcydcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgb3B0aW9uYWxFeHRlbnNpb25zIDogdGhpcy5sYXllci5vcHRpb25zWydnbEV4dGVuc2lvbnMnXSB8fCBbXVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX2luaXRSZW5kZXJlcigpO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyQ2FudmFzKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jYW52YXMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnJlZ2wuY2xlYXIoe1xyXG4gICAgICAgICAgICBjb2xvcjogWzAsIDAsIDAsIDBdLFxyXG4gICAgICAgICAgICBkZXB0aDogMSxcclxuICAgICAgICAgICAgc3RlbmNpbCA6IDBcclxuICAgICAgICB9KTtcclxuICAgICAgICBzdXBlci5jbGVhckNhbnZhcygpO1xyXG4gICAgfVxyXG5cclxuICAgIF91cGRhdGVQYXJhbXMoKSB7XHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVzQ291bnQgPSB0aGlzLmxheWVyLm9wdGlvbnMuY291bnQ7XHJcbiAgICAgICAgdGhpcy5fZmFkZU9wYWNpdHkgPSB0aGlzLmxheWVyLm9wdGlvbnMuZmFkZU9wYWNpdHk7XHJcbiAgICAgICAgdGhpcy5fc3BlZWRGYWN0b3IgPSB0aGlzLmxheWVyLm9wdGlvbnMuc3BlZWRGYWN0b3I7XHJcbiAgICAgICAgdGhpcy5fZHJvcFJhdGUgPSB0aGlzLmxheWVyLm9wdGlvbnMuZHJvcFJhdGU7XHJcbiAgICAgICAgdGhpcy5fZHJvcFJhdGVCdW1wID0gdGhpcy5sYXllci5vcHRpb25zLmRyb3BSYXRlQnVtcDtcclxuICAgICAgICB0aGlzLl9yYW1wQ29sb3JzID0gdGhpcy5sYXllci5vcHRpb25zLmNvbG9ycztcclxuICAgIH1cclxuXHJcbiAgICBfaW5pdFJlbmRlcmVyKCkge1xyXG4gICAgICAgIHRoaXMucmVuZGVyZXIgPSBuZXcgcmVzaGFkZXIuUmVuZGVyZXIodGhpcy5yZWdsKTtcclxuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoIHx8IDE7XHJcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0IHx8IDE7XHJcbiAgICAgICAgdGhpcy5fY2FudmFzV2lkdGggPSB3aWR0aDtcclxuICAgICAgICB0aGlzLl9jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZVBhcnRpY2xlcygpO1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVUZXh0dXJlKCk7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZVNoYWRlcigpO1xyXG4gICAgICAgIHRoaXMuc2V0Q29sb3JSYW1wKHRoaXMuX3JhbXBDb2xvcnMpO1xyXG4gICAgICAgIHRoaXMuX2ZyYW1lYnVmZmVyID0gdGhpcy5yZWdsLmZyYW1lYnVmZmVyKHtcclxuICAgICAgICAgICAgY29sb3I6IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgd3JhcDogJ2NsYW1wJ1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgZGVwdGg6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBfcHJlcGFyZVRleHR1cmUoKSB7XHJcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmNhbnZhcy53aWR0aCB8fCAxO1xyXG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuY2FudmFzLmhlaWdodCB8fCAxO1xyXG4gICAgICAgIGNvbnN0IGVtcHR5UGl4ZWxzID0gbmV3IFVpbnQ4QXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcclxuICAgICAgICB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgZGF0YSA6IGVtcHR5UGl4ZWxzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5fc2NyZWVuVGV4dHVyZSA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgZGF0YSA6IGVtcHR5UGl4ZWxzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYoIXRoaXMuX3dpbmRUZXh0dXJlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3ByZXBhcmVXaW5kVGV4dHVyZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgX3ByZXBhcmVXaW5kVGV4dHVyZSgpIHtcclxuICAgICAgICAvL2lmIGltYWdlIGlzIHNyY1xyXG4gICAgICAgIGlmIChtYXB0YWxrcy5VdGlsLmlzU3RyaW5nKHRoaXMuX3dpbmREYXRhLmltYWdlKSkge1xyXG4gICAgICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgICAgICBpbWFnZS5zcmMgPSB0aGlzLl93aW5kRGF0YS5pbWFnZTtcclxuICAgICAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd2luZERhdGEuaW1hZ2UgPSBpbWFnZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVdpbmRUZXh0dXJlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVyLmZpcmUoJ3dpbmR0ZXh0dXJlLWNyZWF0ZS1kZWJ1ZycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5fY3JlYXRlV2luZFRleHR1cmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX2NyZWF0ZVdpbmRUZXh0dXJlKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5fd2luZERhdGEuaW1hZ2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl93aW5kVGV4dHVyZSA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgZGF0YSA6IHRoaXMuX3dpbmREYXRhLmltYWdlLFxyXG4gICAgICAgICAgICBtYWc6ICdsaW5lYXInLFxyXG4gICAgICAgICAgICBtaW46ICdsaW5lYXInXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgX3ByZXBhcmVQYXJ0aWNsZXMoKSB7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVSZXMgPSB0aGlzLl9wYXJ0aWNsZVN0YXRlUmVzb2x1dGlvbiA9IE1hdGguY2VpbChNYXRoLnNxcnQodGhpcy5fcGFydGljbGVzQ291bnQpKTtcclxuICAgICAgICB0aGlzLl9udW1QYXJ0aWNsZXMgPSBwYXJ0aWNsZVJlcyAqIHBhcnRpY2xlUmVzO1xyXG4gICAgICAgIGNvbnN0IHBhcnRpY2xlU3RhdGUgPSBuZXcgVWludDhBcnJheSh0aGlzLl9udW1QYXJ0aWNsZXMgKiA0KTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnRpY2xlU3RhdGUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgcGFydGljbGVTdGF0ZVtpXSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDI1Nik7IC8vIHJhbmRvbWl6ZSB0aGUgaW5pdGlhbCBwYXJ0aWNsZSBwb3NpdGlvbnNcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCF0aGlzLnJlZ2wpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0ZXh0dXJlcyB0byBob2xkIHRoZSBwYXJ0aWNsZSBzdGF0ZSBmb3IgdGhlIGN1cnJlbnQgYW5kIHRoZSBuZXh0IGZyYW1lXHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwID0gdGhpcy5yZWdsLnRleHR1cmUoe1xyXG4gICAgICAgICAgICBkYXRhIDogcGFydGljbGVTdGF0ZSxcclxuICAgICAgICAgICAgd2lkdGggOiBwYXJ0aWNsZVJlcyxcclxuICAgICAgICAgICAgaGVpZ2h0IDogcGFydGljbGVSZXNcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTEgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIGRhdGEgOiBwYXJ0aWNsZVN0YXRlLFxyXG4gICAgICAgICAgICB3aWR0aCA6IHBhcnRpY2xlUmVzLFxyXG4gICAgICAgICAgICBoZWlnaHQgOiBwYXJ0aWNsZVJlc1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZUluZGljZXMgPSBuZXcgRmxvYXQzMkFycmF5KHRoaXMuX251bVBhcnRpY2xlcyk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLl9udW1QYXJ0aWNsZXM7IGkrKykge1xyXG4gICAgICAgICAgICB0aGlzLl9wYXJ0aWNsZUluZGljZXNbaV0gPSBpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBfcHJlcGFyZVNoYWRlcigpIHtcclxuICAgICAgICBjb25zdCB2aWV3cG9ydCA9IHtcclxuICAgICAgICAgICAgeCA6IDAsXHJcbiAgICAgICAgICAgIHkgOiAwLFxyXG4gICAgICAgICAgICB3aWR0aCA6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbnZhcyA/IHRoaXMuY2FudmFzLndpZHRoIDogMTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgaGVpZ2h0IDogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FudmFzID8gdGhpcy5jYW52YXMuaGVpZ2h0IDogMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5kcmF3U2hhZGVyID0gbmV3IHJlc2hhZGVyLk1lc2hTaGFkZXIoe1xyXG4gICAgICAgICAgICB2ZXJ0IDogZHJhd1ZlcnQsXHJcbiAgICAgICAgICAgIGZyYWcgOiBkcmF3RnJhZyxcclxuICAgICAgICAgICAgdW5pZm9ybXMgOiBbXHJcbiAgICAgICAgICAgICAgICAnZXh0ZW50JyxcclxuICAgICAgICAgICAgICAgICd1X3dpbmQnLFxyXG4gICAgICAgICAgICAgICAgJ3VfcGFydGljbGVzJyxcclxuICAgICAgICAgICAgICAgICd1X2NvbG9yX3JhbXAnLFxyXG4gICAgICAgICAgICAgICAgJ3VfcGFydGljbGVzX3JlcycsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kX21pbicsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kX21heCdcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgZXh0cmFDb21tYW5kUHJvcHMgOiB7IHZpZXdwb3J0IH0sXHJcbiAgICAgICAgICAgIGRlZmluZXMgOiB7fVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLnNjcmVlblNoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcclxuICAgICAgICAgICAgdmVydCA6IHF1YWRWZXJ0LFxyXG4gICAgICAgICAgICBmcmFnIDogc2NyZWVuRnJhZyxcclxuICAgICAgICAgICAgdW5pZm9ybXM6IFtcclxuICAgICAgICAgICAgICAgICd1X3NjcmVlbicsXHJcbiAgICAgICAgICAgICAgICAndV9vcGFjaXR5J1xyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBleHRyYUNvbW1hbmRQcm9wcyA6IHtcclxuICAgICAgICAgICAgICAgIHZpZXdwb3J0XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRlZmluZXMgOiB7fVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVNIYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcclxuICAgICAgICAgICAgdmVydCA6IHF1YWRWZXJ0LFxyXG4gICAgICAgICAgICBmcmFnIDogdXBkYXRlRnJhZyxcclxuICAgICAgICAgICAgdW5pZm9ybXM6IFtcclxuICAgICAgICAgICAgICAgICdleHRlbnQnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZCcsXHJcbiAgICAgICAgICAgICAgICAndV9wYXJ0aWNsZXMnLFxyXG4gICAgICAgICAgICAgICAgJ3VfcmFuZF9zZWVkJyxcclxuICAgICAgICAgICAgICAgICd1X3dpbmRfcmVzJyxcclxuICAgICAgICAgICAgICAgICd1X3dpbmRfbWluJyxcclxuICAgICAgICAgICAgICAgICd1X3dpbmRfbWF4JyxcclxuICAgICAgICAgICAgICAgICd1X3NwZWVkX2ZhY3RvcicsXHJcbiAgICAgICAgICAgICAgICAndV9kcm9wX3JhdGUnLFxyXG4gICAgICAgICAgICAgICAgJ3VfZHJvcF9yYXRlX2J1bXAnXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzIDogeyBcclxuICAgICAgICAgICAgICAgIHZpZXdwb3J0IDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogMCxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aCA6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0IDooKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXJ0aWNsZVN0YXRlUmVzb2x1dGlvbjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZGl0aGVyOiB0cnVlIFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZpbmVzIDoge31cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy53aW5kU2hhZGVyID0gbmV3IHJlc2hhZGVyLk1lc2hTaGFkZXIoe1xyXG4gICAgICAgICAgICB2ZXJ0OiB3aW5kVmVydCxcclxuICAgICAgICAgICAgZnJhZzogd2luZEZyYWcsXHJcbiAgICAgICAgICAgIHVuaWZvcm1zOiBbXHJcbiAgICAgICAgICAgICAgICAndV9zY3JlZW4nLFxyXG4gICAgICAgICAgICAgICAgJ3Vfb3BhY2l0eScsXHJcbiAgICAgICAgICAgICAgICAncHJvalZpZXdNYXRyaXgnLFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWUgOiAncHJvalZpZXdNb2RlbE1hdHJpeCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICdmdW5jdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgZm4gOiBmdW5jdGlvbiAoY29udGV4dCwgcHJvcHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hdDQubXVsdGlwbHkoW10sIHByb3BzWydwcm9qVmlld01hdHJpeCddLCBwcm9wc1snbW9kZWxNYXRyaXgnXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBleHRyYUNvbW1hbmRQcm9wczogeyBcclxuICAgICAgICAgICAgICAgIHZpZXdwb3J0XHJcbiAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZpbmVzOiB7fVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIF9jcmVhdGVHTENvbnRleHQoY2FudmFzLCBvcHRpb25zKSB7XHJcbiAgICAgICAgY29uc3QgbmFtZXMgPSBbJ3dlYmdsJywgJ2V4cGVyaW1lbnRhbC13ZWJnbCddO1xyXG4gICAgICAgIGxldCBjb250ZXh0ID0gbnVsbDtcclxuICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1lbXB0eSAqL1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChuYW1lc1tpXSwgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XHJcbiAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29udGV4dDtcclxuICAgICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWVtcHR5ICovXHJcbiAgICB9XHJcblxyXG4gICAgcmVzaXplQ2FudmFzKCkge1xyXG4gICAgICAgIGlmKHRoaXMuX2JhY2tncm91bmRUZXh0dXJlICYmIHRoaXMuX3NjcmVlblRleHR1cmUgJiYgdGhpcy5faXNDYW52YXNSZXNpemUoKSkge1xyXG4gICAgICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoO1xyXG4gICAgICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XHJcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5UGl4ZWxzID0gbmV3IFVpbnQ4QXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcclxuICAgICAgICAgICAgdGhpcy5fYmFja2dyb3VuZFRleHR1cmUoe1xyXG4gICAgICAgICAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgICAgICBkYXRhIDogZW1wdHlQaXhlbHNcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuX3NjcmVlblRleHR1cmUoe1xyXG4gICAgICAgICAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgICAgICBkYXRhIDogZW1wdHlQaXhlbHNcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhc0hlaWdodCA9IGhlaWdodDtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3VwZXIucmVzaXplQ2FudmFzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgX2lzQ2FudmFzUmVzaXplKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jYW52YXNXaWR0aCAhPSB0aGlzLmNhbnZhcy53aWR0aCB8fCB0aGlzLl9jYW52YXNIZWlnaHQgIT0gdGhpcy5jYW52YXMuaGVpZ2h0O1xyXG4gICAgfVxyXG5cclxuICAgIHNldERhdGEoZGF0YSkge1xyXG4gICAgICAgIHRoaXMuX3dpbmREYXRhID0gZGF0YTtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlV2luZFRleHR1cmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRQYXJ0aWNsZXNDb3VudChjb3VudCkge1xyXG4gICAgICAgIC8vIHdlIGNyZWF0ZSBhIHNxdWFyZSB0ZXh0dXJlIHdoZXJlIGVhY2ggcGl4ZWwgd2lsbCBob2xkIGEgcGFydGljbGUgcG9zaXRpb24gZW5jb2RlZCBhcyBSR0JBXHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVzQ291bnQgPSBjb3VudDtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlUGFydGljbGVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UGFydGljbGVzQ291bnQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcnRpY2xlc0NvdW50O1xyXG4gICAgfVxyXG5cclxuICAgIHNldENvbG9yUmFtcChjb2xvcnMpIHtcclxuICAgICAgICAvLyBsb29rdXAgdGV4dHVyZSBmb3IgY29sb3JpemluZyB0aGUgcGFydGljbGVzIGFjY29yZGluZyB0byB0aGVpciBzcGVlZFxyXG4gICAgICAgIHRoaXMuX2NvbG9yUmFtcFRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoIDogMTYsXHJcbiAgICAgICAgICAgIGhlaWdodCA6IDE2LFxyXG4gICAgICAgICAgICBkYXRhIDogdGhpcy5fZ2V0Q29sb3JSYW1wKGNvbG9ycyksXHJcbiAgICAgICAgICAgIG1hZyA6ICdsaW5lYXInLFxyXG4gICAgICAgICAgICBtaW4gOiAnbGluZWFyJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRDb2xvclJhbXAoY29sb3JzKSB7XHJcbiAgICAgICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gMjU2O1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAxO1xyXG4gICAgICAgIGNvbnN0IGdyYWRpZW50ID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIDAsIDI1NiwgMCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBzdG9wIGluIGNvbG9ycykge1xyXG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoK3N0b3AsIGNvbG9yc1tzdG9wXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBncmFkaWVudDtcclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMjU2LCAxKTtcclxuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoY3R4LmdldEltYWdlRGF0YSgwLCAwLCAyNTYsIDEpLmRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRRdWFkU2NlbmUoKSB7XHJcbiAgICAgICAgY29uc3QgcGxhbmUgPSBuZXcgcmVzaGFkZXIuR2VvbWV0cnkoe1xyXG4gICAgICAgICAgICBhX3BvcyA6IFswLCAwLCAxLCAwLCAwLCAxLCAwLCAxLCAxLCAwLCAxLCAxXVxyXG4gICAgICAgIH0sIDYsIDAsIHtcclxuICAgICAgICAgICAgcHJpbWl0aXZlIDogJ3RyaWFuZ2xlJyxcclxuICAgICAgICAgICAgcG9zaXRpb25BdHRyaWJ1dGU6ICdhX3BvcycsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uU2l6ZSA6IDJcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCBwbGFuZU1lc2ggPSBuZXcgcmVzaGFkZXIuTWVzaChwbGFuZSk7XHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3BsYW5lTWVzaF0pO1xyXG4gICAgICAgIHJldHVybiBzY2VuZTtcclxuICAgIH1cclxuXHJcbiAgICBfZ2V0UGFydGljbGVzU2NlbmUoKSB7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVzID0gbmV3IHJlc2hhZGVyLkdlb21ldHJ5KHtcclxuICAgICAgICAgICAgYV9pbmRleCA6IHRoaXMuX3BhcnRpY2xlSW5kaWNlc1xyXG4gICAgICAgIH0sIHRoaXMuX3BhcnRpY2xlSW5kaWNlcy5sZW5ndGgsIDAsIHtcclxuICAgICAgICAgICAgcHJpbWl0aXZlIDogJ3BvaW50JyxcclxuICAgICAgICAgICAgcG9zaXRpb25BdHRyaWJ1dGU6ICdhX2luZGV4JyxcclxuICAgICAgICAgICAgcG9zaXRpb25TaXplIDogMVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHBhcnRpY2xlc01lc2ggPSBuZXcgcmVzaGFkZXIuTWVzaChwYXJ0aWNsZXMpO1xyXG4gICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IHJlc2hhZGVyLlNjZW5lKFtwYXJ0aWNsZXNNZXNoXSk7XHJcbiAgICAgICAgcmV0dXJuIHNjZW5lO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRXaW5kU2NlbmUoKSB7XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5sYXllci5nZXRNYXAoKTtcclxuICAgICAgICBjb25zdCBleHRlbnQgPSB0aGlzLl9nZXRNYXBFeHRlbnQoKTtcclxuICAgICAgICBjb25zdCBsdCA9IGNvb3JkaW5hdGVUb1dvcmxkKG1hcCwgbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoW2V4dGVudC54bWluLCBleHRlbnQueW1heF0pKTtcclxuICAgICAgICBjb25zdCBsYiA9IGNvb3JkaW5hdGVUb1dvcmxkKG1hcCwgbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZXh0ZW50LnhtaW4sIGV4dGVudC55bWluKSk7XHJcbiAgICAgICAgY29uc3QgcmIgPSBjb29yZGluYXRlVG9Xb3JsZChtYXAsIG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKGV4dGVudC54bWF4LCBleHRlbnQueW1pbikpO1xyXG4gICAgICAgIGNvbnN0IHJ0ID0gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBuZXcgbWFwdGFsa3MuQ29vcmRpbmF0ZShleHRlbnQueG1heCwgZXh0ZW50LnltYXgpKTtcclxuICAgICAgICBjb25zdCBwbGFuZSA9IG5ldyByZXNoYWRlci5HZW9tZXRyeSh7XHJcbiAgICAgICAgICAgIGFfcG9zOiBbXHJcbiAgICAgICAgICAgICAgICBsYlswXSwgbGJbMV0sIGxiWzJdLC8v5bem5LiLXHJcbiAgICAgICAgICAgICAgICByYlswXSwgcmJbMV0sIHJiWzJdLC8v5Y+z5LiLXHJcbiAgICAgICAgICAgICAgICBsdFswXSwgbHRbMV0sIGx0WzJdLC8v5bem5LiKXHJcbiAgICAgICAgICAgICAgICBsdFswXSwgbHRbMV0sIGx0WzJdLC8v5bem5LiKXHJcbiAgICAgICAgICAgICAgICByYlswXSwgcmJbMV0sIHJiWzJdLC8v5Y+z5LiLXHJcbiAgICAgICAgICAgICAgICBydFswXSwgcnRbMV0sIHJ0WzJdLy/lj7PkuIpcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgdXYgOiBbXHJcbiAgICAgICAgICAgICAgICAwLCAwLFxyXG4gICAgICAgICAgICAgICAgMSwgMCxcclxuICAgICAgICAgICAgICAgIDAsIDEsXHJcbiAgICAgICAgICAgICAgICAwLCAxLFxyXG4gICAgICAgICAgICAgICAgMSwgMCxcclxuICAgICAgICAgICAgICAgIDEsIDFcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0sIDYsIDAsIHtcclxuICAgICAgICAgICAgcHJpbWl0aXZlOiAndHJpYW5nbGUnLFxyXG4gICAgICAgICAgICBwb3NpdGlvbkF0dHJpYnV0ZTogJ2FfcG9zJyxcclxuICAgICAgICAgICAgcG9zaXRpb25TaXplOiAzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgcGxhbmVNZXNoID0gbmV3IHJlc2hhZGVyLk1lc2gocGxhbmUpO1xyXG4gICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IHJlc2hhZGVyLlNjZW5lKFtwbGFuZU1lc2hdKTtcclxuICAgICAgICByZXR1cm4gc2NlbmU7XHJcbiAgICB9XHJcblxyXG4gICAgX2RyYXdTY3JlZW4oKSB7XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5sYXllci5nZXRNYXAoKTtcclxuICAgICAgICB0aGlzLl9mcmFtZWJ1ZmZlcih7XHJcbiAgICAgICAgICAgIGNvbG9yIDogdGhpcy5fc2NyZWVuVGV4dHVyZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX2RyYXdQYXJ0aWNsZXMoKTtcclxuICAgICAgICBjb25zdCBxdWFkU2NlbmUgPSB0aGlzLl9nZXRRdWFkU2NlbmUoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnNjcmVlblNoYWRlcix7XHJcbiAgICAgICAgICAgIHVfc2NyZWVuIDogdGhpcy5fYmFja2dyb3VuZFRleHR1cmUsXHJcbiAgICAgICAgICAgIHVfb3BhY2l0eSA6IHRoaXMuX2ZhZGVPcGFjaXR5XHJcbiAgICAgICAgfSwgcXVhZFNjZW5lLCB0aGlzLl9mcmFtZWJ1ZmZlcik7XHJcbiAgICAgICAgY29uc3Qgd2luZFNjZW5lID0gdGhpcy5fZ2V0V2luZFNjZW5lKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy53aW5kU2hhZGVyLCB7XHJcbiAgICAgICAgICAgIHVfc2NyZWVuOiB0aGlzLl9zY3JlZW5UZXh0dXJlLFxyXG4gICAgICAgICAgICB1X29wYWNpdHk6IDEuMCxcclxuICAgICAgICAgICAgcHJvalZpZXdNYXRyaXggOiBtYXAucHJvalZpZXdNYXRyaXhcclxuICAgICAgICB9LCB3aW5kU2NlbmUpO1xyXG4gICAgICAgIGNvbnN0IHRlbXAgPSB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZTtcclxuICAgICAgICB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSA9IHRoaXMuX3NjcmVlblRleHR1cmU7XHJcbiAgICAgICAgdGhpcy5fc2NyZWVuVGV4dHVyZSA9IHRlbXA7XHJcbiAgICB9XHJcblxyXG4gICAgX2RyYXdQYXJ0aWNsZXMoKSB7XHJcbiAgICAgICAgY29uc3QgZXh0ZW50ID0gdGhpcy5fZ2V0TWFwRXh0ZW50KCk7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVTY2VuZSA9IHRoaXMuX2dldFBhcnRpY2xlc1NjZW5lKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy5kcmF3U2hhZGVyLCB7XHJcbiAgICAgICAgICAgIGV4dGVudCA6IFtleHRlbnQueG1pbiwgZXh0ZW50LnhtYXgsIC1leHRlbnQueW1heCwgLWV4dGVudC55bWluXSxcclxuICAgICAgICAgICAgdV93aW5kOiB0aGlzLl93aW5kVGV4dHVyZSxcclxuICAgICAgICAgICAgdV9wYXJ0aWNsZXM6IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMCxcclxuICAgICAgICAgICAgdV9jb2xvcl9yYW1wOiB0aGlzLl9jb2xvclJhbXBUZXh0dXJlLFxyXG4gICAgICAgICAgICB1X3BhcnRpY2xlc19yZXM6IHRoaXMuX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uLFxyXG4gICAgICAgICAgICB1X3dpbmRfbWluOiBbdGhpcy5fd2luZERhdGEudU1pbiwgdGhpcy5fd2luZERhdGEudk1pbl0sXHJcbiAgICAgICAgICAgIHVfd2luZF9tYXg6IFt0aGlzLl93aW5kRGF0YS51TWF4LCB0aGlzLl93aW5kRGF0YS52TWF4XVxyXG4gICAgICAgIH0sIHBhcnRpY2xlU2NlbmUsIHRoaXMuX2ZyYW1lYnVmZmVyKTtcclxuICAgIH1cclxuXHJcbiAgICBfdXBkYXRlUGFydGljbGVzKCkge1xyXG4gICAgICAgIHRoaXMuX2ZyYW1lYnVmZmVyKHtcclxuICAgICAgICAgICAgY29sb3I6IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IGV4dGVudCA9IHRoaXMuX2dldE1hcEV4dGVudCgpO1xyXG4gICAgICAgIGNvbnN0IHF1YWRTY2VuZSA9IHRoaXMuX2dldFF1YWRTY2VuZSgpO1xyXG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMudXBkYXRlU0hhZGVyLCB7XHJcbiAgICAgICAgICAgIGV4dGVudCA6IFtleHRlbnQueG1pbiwgZXh0ZW50LnhtYXgsIC1leHRlbnQueW1heCwgLWV4dGVudC55bWluXSxcclxuICAgICAgICAgICAgdV93aW5kOiB0aGlzLl93aW5kVGV4dHVyZSxcclxuICAgICAgICAgICAgdV9wYXJ0aWNsZXM6IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMCxcclxuICAgICAgICAgICAgdV9yYW5kX3NlZWQ6IE1hdGgucmFuZG9tKCksXHJcbiAgICAgICAgICAgIHVfd2luZF9yZXM6IFt0aGlzLl93aW5kRGF0YS53aWR0aCwgdGhpcy5fd2luZERhdGEuaGVpZ2h0XSxcclxuICAgICAgICAgICAgdV93aW5kX21pbjogW3RoaXMuX3dpbmREYXRhLnVNaW4sIHRoaXMuX3dpbmREYXRhLnZNaW5dLFxyXG4gICAgICAgICAgICB1X3dpbmRfbWF4OiBbdGhpcy5fd2luZERhdGEudU1heCwgdGhpcy5fd2luZERhdGEudk1heF0sXHJcbiAgICAgICAgICAgIHVfc3BlZWRfZmFjdG9yOiB0aGlzLl9zcGVlZEZhY3RvcixcclxuICAgICAgICAgICAgdV9kcm9wX3JhdGU6IHRoaXMuX2Ryb3BSYXRlLFxyXG4gICAgICAgICAgICB1X2Ryb3BfcmF0ZV9idW1wOiB0aGlzLl9kcm9wUmF0ZUJ1bXAsXHJcbiAgICAgICAgfSwgcXVhZFNjZW5lLCB0aGlzLl9mcmFtZWJ1ZmZlcik7XHJcblxyXG4gICAgICAgIGNvbnN0IHRlbXAgPSB0aGlzLl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTA7XHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwID0gdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUxO1xyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMSA9IHRlbXA7XHJcbiAgICB9XHJcblxyXG4gICAgX3JlbmRlcldpbmRTY2VuZSgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuX3NjcmVlblRleHR1cmUgfHwhdGhpcy5fYmFja2dyb3VuZFRleHR1cmUgfHwgIXRoaXMuX3dpbmRUZXh0dXJlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlUGFyYW1zKCk7XHJcbiAgICAgICAgdGhpcy5fZHJhd1NjcmVlbigpO1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZVBhcnRpY2xlcygpO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRNYXBFeHRlbnQoKSB7XHJcbiAgICAgICAgY29uc3QgbWFwID0gdGhpcy5sYXllci5nZXRNYXAoKTtcclxuICAgICAgICBjb25zdCBleHRlbnQgPSBtYXAuZ2V0RXh0ZW50KCk7XHJcbiAgICAgICAgaWYgKGV4dGVudC54bWF4IDwgZXh0ZW50LnhtaW4pIHtcclxuICAgICAgICAgICAgZXh0ZW50LnhtYXggPSBleHRlbnQueG1heCArIDM2MDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGV4dGVudDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRTcGVlZChjb29yZGluYXRlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLnJlZ2wpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCB0ID0gY29vcmRpbmF0ZS54ICUgMTgwO1xyXG4gICAgICAgIGNvbnN0IHBpeGVsWCA9ICgoIHQgKyAxODApIC8gMzYwKSAqIHRoaXMuX3dpbmREYXRhLndpZHRoO1xyXG4gICAgICAgIGlmIChjb29yZGluYXRlLnkgPCAtOTAgfHwgY29vcmRpbmF0ZS55ID4gOTApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHkgZm9yIGNvb3JkaW5hdGUnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcGl4ZWxZID0gKCg5MCAtIGNvb3JkaW5hdGUueSkgLyAxODApICogdGhpcy5fd2luZERhdGEuaGVpZ2h0O1xyXG4gICAgICAgIGNvbnN0IGZyYW1lYnVmZmVyID0gdGhpcy5yZWdsLmZyYW1lYnVmZmVyKHtcclxuICAgICAgICAgICAgY29sb3IgOiB0aGlzLl93aW5kVGV4dHVyZSxcclxuICAgICAgICAgICAgd2lkdGggOiB0aGlzLl93aW5kRGF0YS53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0IDogdGhpcy5fd2luZERhdGEuaGVpZ2h0XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgcGl4ZWxzID0gdGhpcy5yZWdsLnJlYWQoe1xyXG4gICAgICAgICAgICB4OiBwaXhlbFgsXHJcbiAgICAgICAgICAgIHk6IHBpeGVsWSxcclxuICAgICAgICAgICAgd2lkdGg6IDEsXHJcbiAgICAgICAgICAgIGhlaWdodDogMSxcclxuICAgICAgICAgICAgZnJhbWVidWZmZXJcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCB2eCA9IHBpeGVsc1swXSAqICh0aGlzLl93aW5kRGF0YS51TWF4IC0gdGhpcy5fd2luZERhdGEudU1pbikgLyAyNTUgKyB0aGlzLl93aW5kRGF0YS51TWluO1xyXG4gICAgICAgIGNvbnN0IHZ5ID0gcGl4ZWxzWzFdICogKHRoaXMuX3dpbmREYXRhLnZNYXggLSB0aGlzLl93aW5kRGF0YS52TWluKSAvIDI1NSArIHRoaXMuX3dpbmREYXRhLnZNaW47XHJcbiAgICAgICAgcmV0dXJuIFt2eCwgdnldO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgV2luZExheWVyUmVuZGVyZXI7XHJcblxyXG5mdW5jdGlvbiBjb29yZGluYXRlVG9Xb3JsZChtYXAsIGNvb3JkaW5hdGUsIHogPSAwKSB7XHJcbiAgICBpZiAoIW1hcCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgY29uc3QgcCA9IG1hcC5jb29yZGluYXRlVG9Qb2ludChjb29yZGluYXRlLCBtYXAuZ2V0R0xab29tKCkpO1xyXG4gICAgcmV0dXJuIFtwLngsIHAueSwgel07XHJcbn1cclxuIiwiaW1wb3J0ICogYXMgbWFwdGFsa3MgZnJvbSAnbWFwdGFsa3MnO1xyXG5pbXBvcnQgV2luZExheWVyUmVuZGVyZXIgZnJvbSAnLi9XaW5kTGF5ZXJSZW5kZXJlcic7XHJcblxyXG5jb25zdCBkZWZhdWx0UmFtcENvbG9ycyA9IHtcclxuICAgIDAuMDogJyMzMjg4YmQnLFxyXG4gICAgMC4xOiAnIzY2YzJhNScsXHJcbiAgICAwLjI6ICcjYWJkZGE0JyxcclxuICAgIDAuMzogJyNlNmY1OTgnLFxyXG4gICAgMC40OiAnI2ZlZTA4YicsXHJcbiAgICAwLjU6ICcjZmRhZTYxJyxcclxuICAgIDAuNjogJyNmNDZkNDMnLFxyXG4gICAgMS4wOiAnI2Q1M2U0ZidcclxufTtcclxuXHJcbmNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICAncmVuZGVyZXInIDogJ2dsJyxcclxuICAgICdjb3VudCcgOiAyNTYgKiAyNTYsXHJcbiAgICAnZmFkZU9wYWNpdHknIDogMC45OTYsXHJcbiAgICAnc3BlZWRGYWN0b3InIDogMC4yNSxcclxuICAgICdkcm9wUmF0ZScgOiAwLjAwMyxcclxuICAgICdkcm9wUmF0ZUJ1bXAnIDogMC4wMSxcclxuICAgICdjb2xvcnMnIDogZGVmYXVsdFJhbXBDb2xvcnNcclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBXaW5kTGF5ZXIgZXh0ZW5kcyBtYXB0YWxrcy5MYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihpZCwgb3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKGlkLCBvcHRpb25zKTtcclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRhdGEpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRXaW5kKG9wdGlvbnMuZGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldFdpbmQod2luZERhdGEpIHtcclxuICAgICAgICB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ3NldERhdGEnLCB3aW5kRGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0UGFydGljbGVzQ291bnQoY291bnQpIHtcclxuICAgICAgICB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ3NldFBhcnRpY2xlc0NvdW50JywgY291bnQpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFBhcnRpY2xlc0NvdW50KCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ2dldFBhcnRpY2xlc0NvdW50Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0UmFtcENvbG9ycyhjb2xvcnMpIHtcclxuICAgICAgICB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ3NldENvbG9yUmFtcCcsIGNvbG9ycyk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0V2luZFNwZWVkKGNvb3JkKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbGxSZW5kZXJlck1ldGhvZCgnZ2V0U3BlZWQnLCBjb29yZCk7XHJcbiAgICB9XHJcblxyXG4gICAgX2NhbGxSZW5kZXJlck1ldGhvZChmdW5jLCBwYXJhbXMpIHtcclxuICAgICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIoKTtcclxuICAgICAgICBpZiAocmVuZGVyZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlbmRlcmVyW2Z1bmNdKHBhcmFtcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyZXJjcmVhdGUnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGUucmVuZGVyZXJbZnVuY10ocGFyYW1zKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbldpbmRMYXllci5tZXJnZU9wdGlvbnMob3B0aW9ucyk7XHJcbldpbmRMYXllci5yZWdpc3RlckpTT05UeXBlKCdXaW5kTGF5ZXInKTtcclxuXHJcbldpbmRMYXllci5yZWdpc3RlclJlbmRlcmVyKCdnbCcsIFdpbmRMYXllclJlbmRlcmVyKTtcclxuIl0sIm5hbWVzIjpbIldpbmRMYXllclJlbmRlcmVyIiwibGF5ZXIiLCJfdXBkYXRlUGFyYW1zIiwiX3dpbmREYXRhIiwiZHJhdyIsInByZXBhcmVDYW52YXMiLCJfcmVuZGVyV2luZFNjZW5lIiwiZHJhd09uSW50ZXJhY3RpbmciLCJuZWVkVG9SZWRyYXciLCJoaXREZXRlY3QiLCJjcmVhdGVDb250ZXh0IiwiY2FudmFzIiwiZ2wiLCJ3cmFwIiwiYXR0cmlidXRlcyIsIm9wdGlvbnMiLCJnbE9wdGlvbnMiLCJhbHBoYSIsImRlcHRoIiwic3RlbmNpbCIsIl9jcmVhdGVHTENvbnRleHQiLCJyZWdsIiwiY3JlYXRlUkVHTCIsImV4dGVuc2lvbnMiLCJvcHRpb25hbEV4dGVuc2lvbnMiLCJfaW5pdFJlbmRlcmVyIiwiY2xlYXJDYW52YXMiLCJjbGVhciIsImNvbG9yIiwiX3BhcnRpY2xlc0NvdW50IiwiY291bnQiLCJfZmFkZU9wYWNpdHkiLCJmYWRlT3BhY2l0eSIsIl9zcGVlZEZhY3RvciIsInNwZWVkRmFjdG9yIiwiX2Ryb3BSYXRlIiwiZHJvcFJhdGUiLCJfZHJvcFJhdGVCdW1wIiwiZHJvcFJhdGVCdW1wIiwiX3JhbXBDb2xvcnMiLCJjb2xvcnMiLCJyZW5kZXJlciIsInJlc2hhZGVyIiwiUmVuZGVyZXIiLCJ3aWR0aCIsImhlaWdodCIsIl9jYW52YXNXaWR0aCIsIl9jYW52YXNIZWlnaHQiLCJfcHJlcGFyZVBhcnRpY2xlcyIsIl9wcmVwYXJlVGV4dHVyZSIsIl9wcmVwYXJlU2hhZGVyIiwic2V0Q29sb3JSYW1wIiwiX2ZyYW1lYnVmZmVyIiwiZnJhbWVidWZmZXIiLCJ0ZXh0dXJlIiwiZW1wdHlQaXhlbHMiLCJVaW50OEFycmF5IiwiX2JhY2tncm91bmRUZXh0dXJlIiwiZGF0YSIsIl9zY3JlZW5UZXh0dXJlIiwiX3dpbmRUZXh0dXJlIiwiX3ByZXBhcmVXaW5kVGV4dHVyZSIsIm1hcHRhbGtzIiwiaXNTdHJpbmciLCJpbWFnZSIsIkltYWdlIiwic3JjIiwib25sb2FkIiwiX2NyZWF0ZVdpbmRUZXh0dXJlIiwiZmlyZSIsIm1hZyIsIm1pbiIsInBhcnRpY2xlUmVzIiwiX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uIiwiTWF0aCIsImNlaWwiLCJzcXJ0IiwiX251bVBhcnRpY2xlcyIsInBhcnRpY2xlU3RhdGUiLCJpIiwibGVuZ3RoIiwiZmxvb3IiLCJyYW5kb20iLCJfcGFydGljbGVTdGF0ZVRleHR1cmUwIiwiX3BhcnRpY2xlU3RhdGVUZXh0dXJlMSIsIl9wYXJ0aWNsZUluZGljZXMiLCJGbG9hdDMyQXJyYXkiLCJ2aWV3cG9ydCIsIngiLCJ5IiwiZHJhd1NoYWRlciIsIk1lc2hTaGFkZXIiLCJ2ZXJ0IiwiZHJhd1ZlcnQiLCJmcmFnIiwiZHJhd0ZyYWciLCJ1bmlmb3JtcyIsImV4dHJhQ29tbWFuZFByb3BzIiwiZGVmaW5lcyIsInNjcmVlblNoYWRlciIsInF1YWRWZXJ0Iiwic2NyZWVuRnJhZyIsInVwZGF0ZVNIYWRlciIsInVwZGF0ZUZyYWciLCJkaXRoZXIiLCJ3aW5kU2hhZGVyIiwid2luZFZlcnQiLCJ3aW5kRnJhZyIsIm5hbWUiLCJ0eXBlIiwiZm4iLCJjb250ZXh0IiwicHJvcHMiLCJtYXQ0IiwibXVsdGlwbHkiLCJuYW1lcyIsImdldENvbnRleHQiLCJlIiwicmVzaXplQ2FudmFzIiwiX2lzQ2FudmFzUmVzaXplIiwic2V0RGF0YSIsInNldFBhcnRpY2xlc0NvdW50IiwiZ2V0UGFydGljbGVzQ291bnQiLCJfY29sb3JSYW1wVGV4dHVyZSIsIl9nZXRDb2xvclJhbXAiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjdHgiLCJncmFkaWVudCIsImNyZWF0ZUxpbmVhckdyYWRpZW50Iiwic3RvcCIsImFkZENvbG9yU3RvcCIsImZpbGxTdHlsZSIsImZpbGxSZWN0IiwiZ2V0SW1hZ2VEYXRhIiwiX2dldFF1YWRTY2VuZSIsInBsYW5lIiwiR2VvbWV0cnkiLCJhX3BvcyIsInByaW1pdGl2ZSIsInBvc2l0aW9uQXR0cmlidXRlIiwicG9zaXRpb25TaXplIiwicGxhbmVNZXNoIiwiTWVzaCIsInNjZW5lIiwiU2NlbmUiLCJfZ2V0UGFydGljbGVzU2NlbmUiLCJwYXJ0aWNsZXMiLCJhX2luZGV4IiwicGFydGljbGVzTWVzaCIsIl9nZXRXaW5kU2NlbmUiLCJtYXAiLCJnZXRNYXAiLCJleHRlbnQiLCJfZ2V0TWFwRXh0ZW50IiwibHQiLCJjb29yZGluYXRlVG9Xb3JsZCIsInhtaW4iLCJ5bWF4IiwibGIiLCJ5bWluIiwicmIiLCJ4bWF4IiwicnQiLCJ1diIsIl9kcmF3U2NyZWVuIiwiX2RyYXdQYXJ0aWNsZXMiLCJxdWFkU2NlbmUiLCJyZW5kZXIiLCJ1X3NjcmVlbiIsInVfb3BhY2l0eSIsIndpbmRTY2VuZSIsInByb2pWaWV3TWF0cml4IiwidGVtcCIsInBhcnRpY2xlU2NlbmUiLCJ1X3dpbmQiLCJ1X3BhcnRpY2xlcyIsInVfY29sb3JfcmFtcCIsInVfcGFydGljbGVzX3JlcyIsInVfd2luZF9taW4iLCJ1TWluIiwidk1pbiIsInVfd2luZF9tYXgiLCJ1TWF4Iiwidk1heCIsIl91cGRhdGVQYXJ0aWNsZXMiLCJ1X3JhbmRfc2VlZCIsInVfd2luZF9yZXMiLCJ1X3NwZWVkX2ZhY3RvciIsInVfZHJvcF9yYXRlIiwidV9kcm9wX3JhdGVfYnVtcCIsImdldEV4dGVudCIsImdldFNwZWVkIiwiY29vcmRpbmF0ZSIsInQiLCJwaXhlbFgiLCJFcnJvciIsInBpeGVsWSIsInBpeGVscyIsInJlYWQiLCJ2eCIsInZ5IiwiQ2FudmFzUmVuZGVyZXIiLCJ6IiwicCIsImNvb3JkaW5hdGVUb1BvaW50IiwiZ2V0R0xab29tIiwiZGVmYXVsdFJhbXBDb2xvcnMiLCJXaW5kTGF5ZXIiLCJpZCIsInNldFdpbmQiLCJ3aW5kRGF0YSIsIl9jYWxsUmVuZGVyZXJNZXRob2QiLCJzZXRSYW1wQ29sb3JzIiwiZ2V0V2luZFNwZWVkIiwiY29vcmQiLCJmdW5jIiwicGFyYW1zIiwiZ2V0UmVuZGVyZXIiLCJvbiIsIm1lcmdlT3B0aW9ucyIsInJlZ2lzdGVySlNPTlR5cGUiLCJyZWdpc3RlclJlbmRlcmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BaUJNQTs7O0VBRUYsNkJBQVlDLEtBQVosRUFBbUI7RUFBQTs7RUFDZiw2Q0FBTUEsS0FBTjs7RUFDQSxVQUFLQyxhQUFMOztFQUNBLFVBQUtDLFNBQUwsR0FBaUIsRUFBakI7RUFIZTtFQUlsQjs7OztXQUVEQyxPQUFBLGdCQUFPO0VBQ0gsU0FBS0MsYUFBTDs7RUFDQSxTQUFLQyxnQkFBTDtFQUNIOztXQUVEQyxvQkFBQSw2QkFBb0I7RUFDaEIsU0FBS0QsZ0JBQUw7RUFDSDs7V0FFREUsZUFBQSx3QkFBZTtFQUNYLFdBQU8sSUFBUDtFQUNIOztXQUVEQyxZQUFBLHFCQUFZO0VBQ1IsV0FBTyxLQUFQO0VBQ0g7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
