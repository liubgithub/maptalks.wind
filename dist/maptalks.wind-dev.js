/*!
 * maptalks.wind v0.1.4
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

  var drawFrag = "precision mediump float;\n\n\n\nuniform sampler2D u_wind;\n\nuniform vec2 u_wind_min;\n\nuniform vec2 u_wind_max;\n\nuniform sampler2D u_color_ramp;\n\n\n\nvarying vec2 v_particle_pos;\n\nuniform vec4 extent;\n\n\n\nuniform vec4 full_extent;\n\nuniform float full_width;\n\nuniform float full_height;\n\nuniform float dx;\n\nuniform float dy;\n\n\n\n//重新计算视图区域的纹理采样坐标，将粒子缩放到extent范围内\n\nvec2 computeUV(vec2 v_particle_pos) {\n\n    // float xmin = (extent.x - full_extent.x) / (full_width * dx);\n\n    // float ymin = (extent.z - full_extent.z) / (full_height * dy);\n\n    // float xmax = (extent.y - full_extent.x) / (full_width * dx);\n\n    // float ymax = (extent.w - full_extent.z) / (full_height * dy);\n\n    float xmin = (extent.x - (-180.0)) / (360.0 * 1.0);\n\n    float ymin = (extent.z - (-90.0)) / (180.0 * 1.0);\n\n    float xmax = (extent.y - (-180.0)) / (360.0 * 1.0);\n\n    float ymax = (extent.w - (-90.0)) / (180.0 * 1.0);\n\n    float xWidth = xmax - xmin;\n\n    float yHeight = ymax - ymin;\n\n    vec2 centerUv = vec2(0.5, 0.5);\n\n\n\n    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x - 1.0) * xWidth + xmax;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax;\n\n    }\n\n    if (v_particle_pos.x > 1.0) {\n\n        v_particle_pos.x = v_particle_pos.x - 1.0;\n\n    } else if(v_particle_pos.x < 0.0) {\n\n        v_particle_pos.x = v_particle_pos.x + 1.0;\n\n    }\n\n    return v_particle_pos;\n\n}\n\n\n\nvoid main() {\n\n    vec2 particle_pos = computeUV(v_particle_pos);\n\n    if (particle_pos.y < 0.0 || particle_pos.y > 1.0) {\n\n        gl_FragColor = vec4(0.0);\n\n    } else {\n\n        vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, particle_pos).rg);\n\n        float speed_t = length(velocity) / length(u_wind_max);\n\n    \n\n        // color ramp is encoded in a 16x16 texture\n\n        vec2 ramp_pos = vec2(\n\n            fract(16.0 * speed_t),\n\n            floor(16.0 * speed_t) / 16.0);\n\n    \n\n        gl_FragColor = texture2D(u_color_ramp, ramp_pos);\n\n    }\n\n}\n\n";

  var quadVert = "precision mediump float;\n\n\n\nattribute vec2 a_pos;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    v_tex_pos = a_pos;\n\n    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);\n\n}\n\n";

  var screenFrag = "precision mediump float;\n\n\n\nuniform sampler2D u_screen;\n\nuniform float u_opacity;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);\n\n    // a hack to guarantee opacity fade out even with a value close to 1.0\n\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\n\n}\n\n";

  var updateFrag = "precision highp float;\n\n\n\nuniform sampler2D u_particles;\n\nuniform sampler2D u_wind;\n\nuniform vec2 u_wind_res;\n\nuniform vec2 u_wind_min;\n\nuniform vec2 u_wind_max;\n\nuniform float u_rand_seed;\n\nuniform float u_speed_factor;\n\nuniform float u_drop_rate;\n\nuniform float u_drop_rate_bump;\n\nuniform vec4 full_extent;\n\nuniform float full_width;\n\nuniform float full_height;\n\n\n\nvarying vec2 v_tex_pos;\n\n\n\nuniform vec4 extent;\n\nuniform float dx;\n\nuniform float dy;\n\n\n\n// pseudo-random generator\n\nconst vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);\n\nfloat rand(const vec2 co) {\n\n    float t = dot(rand_constants.xy, co);\n\n    return fract(sin(t) * (rand_constants.z + t));\n\n}\n\n\n\nvec2 getNewUV(vec2 uv) {\n\n    // float xmin = (extent.x - full_extent.x) / (full_width * dx);\n\n    // float ymin = (extent.z - full_extent.z) / (full_height * dy);\n\n    // float xmax = (extent.y - full_extent.x) / (full_width * dx);\n\n    // float ymax = (extent.w - full_extent.z) / (full_height * dy);\n\n    float xmin = (extent.x - (-180.0)) / (360.0);\n\n    float ymin = (extent.z - (-90.0)) / (180.0);\n\n    float xmax = (extent.y - (-180.0)) / (360.0);\n\n    float ymax = (extent.w - (-90.0)) / (180.0);\n\n    float xWidth = xmax - xmin;\n\n    float yHeight = ymax - ymin;\n\n    vec2 centerUv = vec2(0.5, 0.5);\n\n    vec2 v_particle_pos = uv;\n\n\n\n    if(v_particle_pos.x < centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x < centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = v_particle_pos.x * xWidth + xmin;\n\n        v_particle_pos.y = (v_particle_pos.y - 1.0) * yHeight + ymax ;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y < centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;\n\n        v_particle_pos.y = v_particle_pos.y * yHeight + ymin;\n\n    } else if(v_particle_pos.x > centerUv.x && v_particle_pos.y > centerUv.y) {\n\n        v_particle_pos.x = (v_particle_pos.x -  1.0) * xWidth + xmax;\n\n        v_particle_pos.y = (v_particle_pos.y -  1.0) * yHeight + ymax;\n\n    }\n\n    if (v_particle_pos.x > 1.0) {\n\n        v_particle_pos.x = v_particle_pos.x - 1.0;\n\n    } else if(v_particle_pos.x < 0.0) {\n\n        v_particle_pos.x = v_particle_pos.x + 1.0;\n\n    }\n\n    return v_particle_pos;\n\n}\n\n\n\n// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation\n\nvec2 lookup_wind(const vec2 uv) {\n\n    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering\n\n    vec2 px = 1.0 / u_wind_res;\n\n    // vec2 vc = (floor(uv * u_wind_res)) * px;\n\n    // vec2 f = fract(uv * u_wind_res);\n\n    vec2 vc = (floor(uv * u_wind_res)) * px;\n\n    vec2 f = fract(uv * u_wind_res);\n\n    vec2 tl = texture2D(u_wind, vc).rg;\n\n    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;\n\n    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;\n\n    vec2 br = texture2D(u_wind, vc + px).rg;\n\n    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);\n\n}\n\n\n\nvoid main() {\n\n    vec4 color = texture2D(u_particles, v_tex_pos);\n\n    vec2 pos = vec2(\n\n        color.r / 255.0 + color.b,\n\n        color.g / 255.0 + color.a); // decode particle position from pixel RGBA\n\n    vec2 newUV = getNewUV(pos);\n\n    if (newUV.y < 0.0 || newUV.y > 1.0) {\n\n        gl_FragColor = vec4(0.0);\n\n    } else {\n\n        vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(newUV));\n\n        float speed_t = length(velocity) / length(u_wind_max);\n\n    \n\n        // take EPSG:4236 distortion into account for calculating where the particle moved\n\n        float distortion = cos(radians(newUV.y));\n\n        vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;\n\n    \n\n        // update particle position, wrapping around the date line\n\n        pos = fract(1.0 + pos + offset);\n\n    \n\n        // a random seed to use for the particle drop\n\n        vec2 seed = (pos + v_tex_pos) * u_rand_seed;\n\n    \n\n        // drop rate is a chance a particle will restart at random position, to avoid degeneration\n\n        float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;\n\n        float drop = step(1.0 - drop_rate, rand(seed));\n\n    \n\n        vec2 random_pos = vec2(\n\n            rand(seed + 1.3),\n\n            rand(seed + 2.1));\n\n        pos = mix(pos, random_pos, drop);\n\n    \n\n        // encode the new particle position back into RGBA\n\n        gl_FragColor = vec4(\n\n            fract(pos * 255.0),\n\n            floor(pos * 255.0) / 255.0);\n\n    }\n\n}\n\n";

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

      if (maptalks.Util.isString(this._windData) && this._windData.indexOf('.json') > -1) {
        maptalks.Ajax.get(this._windData, function (err, data) {
          if (err) {
            throw new Error(err);
          }

          _this2._windData = _this2._resolveGFS(JSON.parse(data));

          _this2._createWindTexture();
        });
      } else if (this.isGFSObject()) {
        this._windData = this._resolveGFS(this._windData);

        this._createWindTexture();
      } else if (maptalks.Util.isString(this._windData.image)) {
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
      if (!this._windData) {
        return;
      }

      this._windTexture = this.regl.texture({
        width: this._windData.width,
        height: this._windData.height,
        data: this._windData.image,
        mag: 'linear',
        min: 'linear'
      });
    };

    _proto.isGFSObject = function isGFSObject() {
      if (this._windData[0] && this._windData[0].header && typeof this._windData[0].header === 'object') {
        return true;
      }

      return false;
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
        uniforms: ['extent', 'u_wind', 'u_particles', 'u_color_ramp', 'u_particles_res', 'u_wind_min', 'u_wind_max', 'full_width', 'full_height', 'full_extent', 'dx', 'dy'],
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
        uniforms: ['extent', 'u_wind', 'u_particles', 'u_rand_seed', 'u_wind_res', 'u_wind_min', 'u_wind_max', 'u_speed_factor', 'u_drop_rate', 'u_drop_rate_bump', 'full_width', 'full_height', 'full_extent', 'dx', 'dy'],
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

    _proto._resolveGFS = function _resolveGFS(gfsData) {
      var uData = gfsData[0];
      var vData = gfsData[1];
      var uMin = Math.min.apply(null, uData.data);
      var uMax = Math.max.apply(null, uData.data);
      var vMin = Math.min.apply(null, vData.data);
      var vMax = Math.max.apply(null, vData.data);
      var velocityData = [];

      for (var i = 0; i < uData.data.length; i++) {
        var r = Math.floor(255 * (uData.data[i] - uMin) / (uMax - uMin));
        velocityData.push(r);
        var g = Math.floor(255 * (vData.data[i] - vMin) / (vMax - vMin));
        velocityData.push(g);
        velocityData.push(0);
        velocityData.push(255);
      }

      return {
        'width': uData.header.nx,
        'height': uData.header.ny,
        'uMin': uMin,
        'uMax': uMax,
        'vMin': vMin,
        'vMax': vMax,
        'image': velocityData,
        'full_extent': [uData.header.lo1, uData.header.lo2, uData.header.la1, uData.header.la2],
        'dx': uData.header.dx,
        'dy': uData.header.dy
      };
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

      if (this.regl) {
        this._prepareWindTexture();
      }
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
        u_wind_max: [this._windData.uMax, this._windData.vMax],
        full_width: this._windData.width,
        full_height: this._windData.height,
        full_extent: this._windData.full_extent,
        dx: this._windData.dx,
        dy: this._windData.dy
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
        u_drop_rate_bump: this._dropRateBump,
        full_width: this._windData.width,
        full_height: this._windData.height,
        full_extent: this._windData.full_extent,
        dx: this._windData.dx,
        dy: this._windData.dy
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

      extent.xmin = extent.xmin < this._windData.full_extent[0] ? this._windData.full_extent[0] : extent.xmin;
      extent.xmax = extent.xmax > this._windData.full_extent[1] ? this._windData.full_extent[1] : extent.xmax;
      extent.ymin = extent.ymin < this._windData.full_extent[2] ? this._windData.full_extent[2] : extent.ymin;
      extent.ymax = extent.ymax > this._windData.full_extent[3] ? this._windData.full_extent[3] : extent.ymax;
      return extent;
    };

    _proto.getSpeed = function getSpeed(coordinate) {
      if (!this.regl || !this._windData || !this._windData.width) {
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

  typeof console !== 'undefined' && console.log('maptalks.wind v0.1.4, requires maptalks@<2.0.0.');

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3Mud2luZC1kZXYuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9XaW5kTGF5ZXJSZW5kZXJlci5qcyIsIi4uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGhlcmUgYXJlIG1hbnkgcmVuZGVyaW5nIG1ldGhvZHMgYW5kIGdsc2wgY29kZVxyXG4gKiBiYXNlZCBvbiBwcm9qZWN0IGZpbmlzaGVkIGJ5IEBtb3VybmVyIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3VybmVyIFxyXG4gKiBhbmQgaGlzIHByb2plY3QgaXMgaGVyZSBodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L3dlYmdsLXdpbmQuXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBtYXB0YWxrcyBmcm9tICdtYXB0YWxrcyc7XHJcbmltcG9ydCB7IGNyZWF0ZVJFR0wsIG1hdDQsIHJlc2hhZGVyIH0gZnJvbSAnQG1hcHRhbGtzL2dsJztcclxuaW1wb3J0IGRyYXdWZXJ0IGZyb20gJy4vZ2xzbC9kcmF3LnZlcnQnO1xyXG5pbXBvcnQgZHJhd0ZyYWcgZnJvbSAnLi9nbHNsL2RyYXcuZnJhZyc7XHJcbmltcG9ydCBxdWFkVmVydCBmcm9tICcuL2dsc2wvcXVhZC52ZXJ0JztcclxuaW1wb3J0IHNjcmVlbkZyYWcgZnJvbSAnLi9nbHNsL3NjcmVlbi5mcmFnJztcclxuaW1wb3J0IHVwZGF0ZUZyYWcgZnJvbSAnLi9nbHNsL3VwZGF0ZS5mcmFnJztcclxuaW1wb3J0IHdpbmRWZXJ0IGZyb20gJy4vZ2xzbC93aW5kLnZlcnQnO1xyXG5pbXBvcnQgd2luZEZyYWcgZnJvbSAnLi9nbHNsL3dpbmQuZnJhZyc7XHJcblxyXG5jbGFzcyBXaW5kTGF5ZXJSZW5kZXJlciBleHRlbmRzIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihsYXllcikge1xyXG4gICAgICAgIHN1cGVyKGxheWVyKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVQYXJhbXMoKTtcclxuICAgICAgICB0aGlzLl93aW5kRGF0YSA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoKSB7XHJcbiAgICAgICAgdGhpcy5wcmVwYXJlQ2FudmFzKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyV2luZFNjZW5lKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZHJhd09uSW50ZXJhY3RpbmcoKSB7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyV2luZFNjZW5lKCk7XHJcbiAgICB9XHJcblxyXG4gICAgbmVlZFRvUmVkcmF3KCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGhpdERldGVjdCgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlQ29udGV4dCgpIHtcclxuICAgICAgICBpZiAodGhpcy5jYW52YXMuZ2wgJiYgdGhpcy5jYW52YXMuZ2wud3JhcCkge1xyXG4gICAgICAgICAgICB0aGlzLmdsID0gdGhpcy5jYW52YXMuZ2wud3JhcCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcjtcclxuICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlcyA9IGxheWVyLm9wdGlvbnMuZ2xPcHRpb25zIHx8IHtcclxuICAgICAgICAgICAgICAgIGFscGhhOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGVwdGg6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAvL2FudGlhbGlhczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHN0ZW5jaWwgOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuZ2xPcHRpb25zID0gYXR0cmlidXRlcztcclxuICAgICAgICAgICAgdGhpcy5nbCA9IHRoaXMuZ2wgfHwgdGhpcy5fY3JlYXRlR0xDb250ZXh0KHRoaXMuY2FudmFzLCBhdHRyaWJ1dGVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZWdsID0gY3JlYXRlUkVHTCh7XHJcbiAgICAgICAgICAgIGdsIDogdGhpcy5nbCxcclxuICAgICAgICAgICAgZXh0ZW5zaW9ucyA6IFtcclxuICAgICAgICAgICAgICAgIC8vICdBTkdMRV9pbnN0YW5jZWRfYXJyYXlzJyxcclxuICAgICAgICAgICAgICAgIC8vICdPRVNfdGV4dHVyZV9mbG9hdCcsXHJcbiAgICAgICAgICAgICAgICAvLyAnT0VTX3RleHR1cmVfZmxvYXRfbGluZWFyJyxcclxuICAgICAgICAgICAgICAgICdPRVNfZWxlbWVudF9pbmRleF91aW50JyxcclxuICAgICAgICAgICAgICAgICdPRVNfc3RhbmRhcmRfZGVyaXZhdGl2ZXMnXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIG9wdGlvbmFsRXh0ZW5zaW9ucyA6IHRoaXMubGF5ZXIub3B0aW9uc1snZ2xFeHRlbnNpb25zJ10gfHwgW11cclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLl9pbml0UmVuZGVyZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBjbGVhckNhbnZhcygpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY2FudmFzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZWdsLmNsZWFyKHtcclxuICAgICAgICAgICAgY29sb3I6IFswLCAwLCAwLCAwXSxcclxuICAgICAgICAgICAgZGVwdGg6IDEsXHJcbiAgICAgICAgICAgIHN0ZW5jaWwgOiAwXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc3VwZXIuY2xlYXJDYW52YXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBfdXBkYXRlUGFyYW1zKCkge1xyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlc0NvdW50ID0gdGhpcy5sYXllci5vcHRpb25zLmNvdW50O1xyXG4gICAgICAgIHRoaXMuX2ZhZGVPcGFjaXR5ID0gdGhpcy5sYXllci5vcHRpb25zLmZhZGVPcGFjaXR5O1xyXG4gICAgICAgIHRoaXMuX3NwZWVkRmFjdG9yID0gdGhpcy5sYXllci5vcHRpb25zLnNwZWVkRmFjdG9yO1xyXG4gICAgICAgIHRoaXMuX2Ryb3BSYXRlID0gdGhpcy5sYXllci5vcHRpb25zLmRyb3BSYXRlO1xyXG4gICAgICAgIHRoaXMuX2Ryb3BSYXRlQnVtcCA9IHRoaXMubGF5ZXIub3B0aW9ucy5kcm9wUmF0ZUJ1bXA7XHJcbiAgICAgICAgdGhpcy5fcmFtcENvbG9ycyA9IHRoaXMubGF5ZXIub3B0aW9ucy5jb2xvcnM7XHJcbiAgICB9XHJcblxyXG4gICAgX2luaXRSZW5kZXJlcigpIHtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyID0gbmV3IHJlc2hhZGVyLlJlbmRlcmVyKHRoaXMucmVnbCk7XHJcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmNhbnZhcy53aWR0aCB8fCAxO1xyXG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuY2FudmFzLmhlaWdodCB8fCAxO1xyXG4gICAgICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICAgICAgdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVQYXJ0aWNsZXMoKTtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlVGV4dHVyZSgpO1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVTaGFkZXIoKTtcclxuICAgICAgICB0aGlzLnNldENvbG9yUmFtcCh0aGlzLl9yYW1wQ29sb3JzKTtcclxuICAgICAgICB0aGlzLl9mcmFtZWJ1ZmZlciA9IHRoaXMucmVnbC5mcmFtZWJ1ZmZlcih7XHJcbiAgICAgICAgICAgIGNvbG9yOiB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgICAgICB3aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgICAgIHdyYXA6ICdjbGFtcCdcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGRlcHRoOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgX3ByZXBhcmVUZXh0dXJlKCkge1xyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5jYW52YXMud2lkdGggfHwgMTtcclxuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmNhbnZhcy5oZWlnaHQgfHwgMTtcclxuICAgICAgICBjb25zdCBlbXB0eVBpeGVscyA9IG5ldyBVaW50OEFycmF5KHdpZHRoICogaGVpZ2h0ICogNCk7XHJcbiAgICAgICAgdGhpcy5fYmFja2dyb3VuZFRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3NjcmVlblRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmKCF0aGlzLl93aW5kVGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9wcmVwYXJlV2luZFRleHR1cmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIF9wcmVwYXJlV2luZFRleHR1cmUoKSB7XHJcbiAgICAgICAgLy9pZiBnZnMgZGF0YVxyXG4gICAgICAgIGlmIChtYXB0YWxrcy5VdGlsLmlzU3RyaW5nKHRoaXMuX3dpbmREYXRhKSAmJiB0aGlzLl93aW5kRGF0YS5pbmRleE9mKCcuanNvbicpID4gLTEpIHtcclxuICAgICAgICAgICAgbWFwdGFsa3MuQWpheC5nZXQodGhpcy5fd2luZERhdGEsIChlcnIsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuX3dpbmREYXRhID0gdGhpcy5fcmVzb2x2ZUdGUyhKU09OLnBhcnNlKGRhdGEpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVdpbmRUZXh0dXJlKCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzR0ZTT2JqZWN0KCkpIHtcclxuICAgICAgICAgICAgdGhpcy5fd2luZERhdGEgPSB0aGlzLl9yZXNvbHZlR0ZTKHRoaXMuX3dpbmREYXRhKTtcclxuICAgICAgICAgICAgdGhpcy5fY3JlYXRlV2luZFRleHR1cmUoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1hcHRhbGtzLlV0aWwuaXNTdHJpbmcodGhpcy5fd2luZERhdGEuaW1hZ2UpKSB7IC8vaWYgaW1hZ2Ugc3JjXHJcbiAgICAgICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgICAgIGltYWdlLnNyYyA9IHRoaXMuX3dpbmREYXRhLmltYWdlO1xyXG4gICAgICAgICAgICBpbWFnZS5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl93aW5kRGF0YS5pbWFnZSA9IGltYWdlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlV2luZFRleHR1cmUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXIuZmlyZSgnd2luZHRleHR1cmUtY3JlYXRlLWRlYnVnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVXaW5kVGV4dHVyZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBfY3JlYXRlV2luZFRleHR1cmUoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl93aW5kRGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3dpbmRUZXh0dXJlID0gdGhpcy5yZWdsLnRleHR1cmUoe1xyXG4gICAgICAgICAgICB3aWR0aCA6IHRoaXMuX3dpbmREYXRhLndpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQgOiB0aGlzLl93aW5kRGF0YS5oZWlnaHQsXHJcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLl93aW5kRGF0YS5pbWFnZSxcclxuICAgICAgICAgICAgbWFnOiAnbGluZWFyJyxcclxuICAgICAgICAgICAgbWluOiAnbGluZWFyJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlzR0ZTT2JqZWN0KCkge1xyXG4gICAgICAgIGlmICh0aGlzLl93aW5kRGF0YVswXSAmJiB0aGlzLl93aW5kRGF0YVswXS5oZWFkZXIgJiYgdHlwZW9mIHRoaXMuX3dpbmREYXRhWzBdLmhlYWRlciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIF9wcmVwYXJlUGFydGljbGVzKCkge1xyXG4gICAgICAgIGNvbnN0IHBhcnRpY2xlUmVzID0gdGhpcy5fcGFydGljbGVTdGF0ZVJlc29sdXRpb24gPSBNYXRoLmNlaWwoTWF0aC5zcXJ0KHRoaXMuX3BhcnRpY2xlc0NvdW50KSk7XHJcbiAgICAgICAgdGhpcy5fbnVtUGFydGljbGVzID0gcGFydGljbGVSZXMgKiBwYXJ0aWNsZVJlcztcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZVN0YXRlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5fbnVtUGFydGljbGVzICogNCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0aWNsZVN0YXRlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHBhcnRpY2xlU3RhdGVbaV0gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyNTYpOyAvLyByYW5kb21pemUgdGhlIGluaXRpYWwgcGFydGljbGUgcG9zaXRpb25zXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5yZWdsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGV4dHVyZXMgdG8gaG9sZCB0aGUgcGFydGljbGUgc3RhdGUgZm9yIHRoZSBjdXJyZW50IGFuZCB0aGUgbmV4dCBmcmFtZVxyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMCA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgZGF0YSA6IHBhcnRpY2xlU3RhdGUsXHJcbiAgICAgICAgICAgIHdpZHRoIDogcGFydGljbGVSZXMsXHJcbiAgICAgICAgICAgIGhlaWdodCA6IHBhcnRpY2xlUmVzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUxID0gdGhpcy5yZWdsLnRleHR1cmUoe1xyXG4gICAgICAgICAgICBkYXRhIDogcGFydGljbGVTdGF0ZSxcclxuICAgICAgICAgICAgd2lkdGggOiBwYXJ0aWNsZVJlcyxcclxuICAgICAgICAgICAgaGVpZ2h0IDogcGFydGljbGVSZXNcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVJbmRpY2VzID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLl9udW1QYXJ0aWNsZXMpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5fbnVtUGFydGljbGVzOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5fcGFydGljbGVJbmRpY2VzW2ldID0gaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX3ByZXBhcmVTaGFkZXIoKSB7XHJcbiAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB7XHJcbiAgICAgICAgICAgIHggOiAwLFxyXG4gICAgICAgICAgICB5IDogMCxcclxuICAgICAgICAgICAgd2lkdGggOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYW52YXMgPyB0aGlzLmNhbnZhcy53aWR0aCA6IDE7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGhlaWdodCA6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbnZhcyA/IHRoaXMuY2FudmFzLmhlaWdodCA6IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuZHJhd1NoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcclxuICAgICAgICAgICAgdmVydCA6IGRyYXdWZXJ0LFxyXG4gICAgICAgICAgICBmcmFnIDogZHJhd0ZyYWcsXHJcbiAgICAgICAgICAgIHVuaWZvcm1zIDogW1xyXG4gICAgICAgICAgICAgICAgJ2V4dGVudCcsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kJyxcclxuICAgICAgICAgICAgICAgICd1X3BhcnRpY2xlcycsXHJcbiAgICAgICAgICAgICAgICAndV9jb2xvcl9yYW1wJyxcclxuICAgICAgICAgICAgICAgICd1X3BhcnRpY2xlc19yZXMnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9taW4nLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9tYXgnLFxyXG4gICAgICAgICAgICAgICAgJ2Z1bGxfd2lkdGgnLFxyXG4gICAgICAgICAgICAgICAgJ2Z1bGxfaGVpZ2h0JyxcclxuICAgICAgICAgICAgICAgICdmdWxsX2V4dGVudCcsXHJcbiAgICAgICAgICAgICAgICAnZHgnLFxyXG4gICAgICAgICAgICAgICAgJ2R5J1xyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBleHRyYUNvbW1hbmRQcm9wcyA6IHsgdmlld3BvcnQgfSxcclxuICAgICAgICAgICAgZGVmaW5lcyA6IHt9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuc2NyZWVuU2hhZGVyID0gbmV3IHJlc2hhZGVyLk1lc2hTaGFkZXIoe1xyXG4gICAgICAgICAgICB2ZXJ0IDogcXVhZFZlcnQsXHJcbiAgICAgICAgICAgIGZyYWcgOiBzY3JlZW5GcmFnLFxyXG4gICAgICAgICAgICB1bmlmb3JtczogW1xyXG4gICAgICAgICAgICAgICAgJ3Vfc2NyZWVuJyxcclxuICAgICAgICAgICAgICAgICd1X29wYWNpdHknXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzIDoge1xyXG4gICAgICAgICAgICAgICAgdmlld3BvcnRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmaW5lcyA6IHt9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlU0hhZGVyID0gbmV3IHJlc2hhZGVyLk1lc2hTaGFkZXIoe1xyXG4gICAgICAgICAgICB2ZXJ0IDogcXVhZFZlcnQsXHJcbiAgICAgICAgICAgIGZyYWcgOiB1cGRhdGVGcmFnLFxyXG4gICAgICAgICAgICB1bmlmb3JtczogW1xyXG4gICAgICAgICAgICAgICAgJ2V4dGVudCcsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kJyxcclxuICAgICAgICAgICAgICAgICd1X3BhcnRpY2xlcycsXHJcbiAgICAgICAgICAgICAgICAndV9yYW5kX3NlZWQnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9yZXMnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9taW4nLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9tYXgnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfc3BlZWRfZmFjdG9yJyxcclxuICAgICAgICAgICAgICAgICd1X2Ryb3BfcmF0ZScsXHJcbiAgICAgICAgICAgICAgICAndV9kcm9wX3JhdGVfYnVtcCcsXHJcbiAgICAgICAgICAgICAgICAnZnVsbF93aWR0aCcsXHJcbiAgICAgICAgICAgICAgICAnZnVsbF9oZWlnaHQnLFxyXG4gICAgICAgICAgICAgICAgJ2Z1bGxfZXh0ZW50JyxcclxuICAgICAgICAgICAgICAgICdkeCcsXHJcbiAgICAgICAgICAgICAgICAnZHknXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzIDogeyBcclxuICAgICAgICAgICAgICAgIHZpZXdwb3J0IDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogMCxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aCA6ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0IDooKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXJ0aWNsZVN0YXRlUmVzb2x1dGlvbjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZGl0aGVyOiB0cnVlIFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZpbmVzIDoge31cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy53aW5kU2hhZGVyID0gbmV3IHJlc2hhZGVyLk1lc2hTaGFkZXIoe1xyXG4gICAgICAgICAgICB2ZXJ0OiB3aW5kVmVydCxcclxuICAgICAgICAgICAgZnJhZzogd2luZEZyYWcsXHJcbiAgICAgICAgICAgIHVuaWZvcm1zOiBbXHJcbiAgICAgICAgICAgICAgICAndV9zY3JlZW4nLFxyXG4gICAgICAgICAgICAgICAgJ3Vfb3BhY2l0eScsXHJcbiAgICAgICAgICAgICAgICAncHJvalZpZXdNYXRyaXgnLFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWUgOiAncHJvalZpZXdNb2RlbE1hdHJpeCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICdmdW5jdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgZm4gOiBmdW5jdGlvbiAoY29udGV4dCwgcHJvcHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hdDQubXVsdGlwbHkoW10sIHByb3BzWydwcm9qVmlld01hdHJpeCddLCBwcm9wc1snbW9kZWxNYXRyaXgnXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBleHRyYUNvbW1hbmRQcm9wczogeyBcclxuICAgICAgICAgICAgICAgIHZpZXdwb3J0XHJcbiAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZpbmVzOiB7fVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBfcmVzb2x2ZUdGUyhnZnNEYXRhKSB7XHJcbiAgICAgICAgY29uc3QgdURhdGEgPSBnZnNEYXRhWzBdO1xyXG4gICAgICAgIGNvbnN0IHZEYXRhID0gZ2ZzRGF0YVsxXTtcclxuICAgICAgICBjb25zdCB1TWluID0gTWF0aC5taW4uYXBwbHkobnVsbCwgdURhdGEuZGF0YSk7XHJcbiAgICAgICAgY29uc3QgdU1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIHVEYXRhLmRhdGEpO1xyXG4gICAgICAgIGNvbnN0IHZNaW4gPSBNYXRoLm1pbi5hcHBseShudWxsLCB2RGF0YS5kYXRhKTtcclxuICAgICAgICBjb25zdCB2TWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdkRhdGEuZGF0YSk7XHJcbiAgICAgICAgY29uc3QgdmVsb2NpdHlEYXRhID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7aSA8IHVEYXRhLmRhdGEubGVuZ3RoO2krKykge1xyXG4gICAgICAgICAgICBjb25zdCByID0gTWF0aC5mbG9vcigyNTUgKiAodURhdGEuZGF0YVtpXSAtIHVNaW4pIC8gKHVNYXggLSB1TWluKSk7XHJcbiAgICAgICAgICAgIHZlbG9jaXR5RGF0YS5wdXNoKHIpO1xyXG4gICAgICAgICAgICBjb25zdCBnID0gTWF0aC5mbG9vcigyNTUgKiAodkRhdGEuZGF0YVtpXSAtIHZNaW4pIC8gKHZNYXggLSB2TWluKSk7XHJcbiAgICAgICAgICAgIHZlbG9jaXR5RGF0YS5wdXNoKGcpO1xyXG4gICAgICAgICAgICB2ZWxvY2l0eURhdGEucHVzaCgwKTtcclxuICAgICAgICAgICAgdmVsb2NpdHlEYXRhLnB1c2goMjU1KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgJ3dpZHRoJzogdURhdGEuaGVhZGVyLm54LFxyXG4gICAgICAgICAgICAnaGVpZ2h0JzogdURhdGEuaGVhZGVyLm55LFxyXG4gICAgICAgICAgICAndU1pbic6IHVNaW4sXHJcbiAgICAgICAgICAgICd1TWF4JzogdU1heCxcclxuICAgICAgICAgICAgJ3ZNaW4nOiB2TWluLFxyXG4gICAgICAgICAgICAndk1heCc6IHZNYXgsXHJcbiAgICAgICAgICAgICdpbWFnZScgOiB2ZWxvY2l0eURhdGEsXHJcbiAgICAgICAgICAgICdmdWxsX2V4dGVudCcgOiBbdURhdGEuaGVhZGVyLmxvMSwgdURhdGEuaGVhZGVyLmxvMiwgdURhdGEuaGVhZGVyLmxhMSwgdURhdGEuaGVhZGVyLmxhMl0sXHJcbiAgICAgICAgICAgICdkeCcgOiB1RGF0YS5oZWFkZXIuZHgsXHJcbiAgICAgICAgICAgICdkeScgOiB1RGF0YS5oZWFkZXIuZHlcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgX2NyZWF0ZUdMQ29udGV4dChjYW52YXMsIG9wdGlvbnMpIHtcclxuICAgICAgICBjb25zdCBuYW1lcyA9IFsnd2ViZ2wnLCAnZXhwZXJpbWVudGFsLXdlYmdsJ107XHJcbiAgICAgICAgbGV0IGNvbnRleHQgPSBudWxsO1xyXG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWVtcHR5ICovXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KG5hbWVzW2ldLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb250ZXh0O1xyXG4gICAgICAgIC8qIGVzbGludC1lbmFibGUgbm8tZW1wdHkgKi9cclxuICAgIH1cclxuXHJcbiAgICByZXNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgaWYodGhpcy5fYmFja2dyb3VuZFRleHR1cmUgJiYgdGhpcy5fc2NyZWVuVGV4dHVyZSAmJiB0aGlzLl9pc0NhbnZhc1Jlc2l6ZSgpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5jYW52YXMud2lkdGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuY2FudmFzLmhlaWdodDtcclxuICAgICAgICAgICAgY29uc3QgZW1wdHlQaXhlbHMgPSBuZXcgVWludDhBcnJheSh3aWR0aCAqIGhlaWdodCAqIDQpO1xyXG4gICAgICAgICAgICB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSh7XHJcbiAgICAgICAgICAgICAgICB3aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5fc2NyZWVuVGV4dHVyZSh7XHJcbiAgICAgICAgICAgICAgICB3aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5fY2FudmFzV2lkdGggPSB3aWR0aDtcclxuICAgICAgICAgICAgdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdXBlci5yZXNpemVDYW52YXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBfaXNDYW52YXNSZXNpemUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc1dpZHRoICE9IHRoaXMuY2FudmFzLndpZHRoIHx8IHRoaXMuX2NhbnZhc0hlaWdodCAhPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0RGF0YShkYXRhKSB7XHJcbiAgICAgICAgdGhpcy5fd2luZERhdGEgPSBkYXRhO1xyXG4gICAgICAgIGlmICh0aGlzLnJlZ2wpIHtcclxuICAgICAgICAgICAgdGhpcy5fcHJlcGFyZVdpbmRUZXh0dXJlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldFBhcnRpY2xlc0NvdW50KGNvdW50KSB7XHJcbiAgICAgICAgLy8gd2UgY3JlYXRlIGEgc3F1YXJlIHRleHR1cmUgd2hlcmUgZWFjaCBwaXhlbCB3aWxsIGhvbGQgYSBwYXJ0aWNsZSBwb3NpdGlvbiBlbmNvZGVkIGFzIFJHQkFcclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZXNDb3VudCA9IGNvdW50O1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVQYXJ0aWNsZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQYXJ0aWNsZXNDb3VudCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fcGFydGljbGVzQ291bnQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q29sb3JSYW1wKGNvbG9ycykge1xyXG4gICAgICAgIC8vIGxvb2t1cCB0ZXh0dXJlIGZvciBjb2xvcml6aW5nIHRoZSBwYXJ0aWNsZXMgYWNjb3JkaW5nIHRvIHRoZWlyIHNwZWVkXHJcbiAgICAgICAgdGhpcy5fY29sb3JSYW1wVGV4dHVyZSA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgd2lkdGggOiAxNixcclxuICAgICAgICAgICAgaGVpZ2h0IDogMTYsXHJcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLl9nZXRDb2xvclJhbXAoY29sb3JzKSxcclxuICAgICAgICAgICAgbWFnIDogJ2xpbmVhcicsXHJcbiAgICAgICAgICAgIG1pbiA6ICdsaW5lYXInXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldENvbG9yUmFtcChjb2xvcnMpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgICBjYW52YXMud2lkdGggPSAyNTY7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IDE7XHJcbiAgICAgICAgY29uc3QgZ3JhZGllbnQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgMCwgMjU2LCAwKTtcclxuICAgICAgICBmb3IgKGNvbnN0IHN0b3AgaW4gY29sb3JzKSB7XHJcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgrc3RvcCwgY29sb3JzW3N0b3BdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCAyNTYsIDEpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIDI1NiwgMSkuZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFF1YWRTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBwbGFuZSA9IG5ldyByZXNoYWRlci5HZW9tZXRyeSh7XHJcbiAgICAgICAgICAgIGFfcG9zIDogWzAsIDAsIDEsIDAsIDAsIDEsIDAsIDEsIDEsIDAsIDEsIDFdXHJcbiAgICAgICAgfSwgNiwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmUgOiAndHJpYW5nbGUnLFxyXG4gICAgICAgICAgICBwb3NpdGlvbkF0dHJpYnV0ZTogJ2FfcG9zJyxcclxuICAgICAgICAgICAgcG9zaXRpb25TaXplIDogMlxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHBsYW5lTWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHBsYW5lKTtcclxuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyByZXNoYWRlci5TY2VuZShbcGxhbmVNZXNoXSk7XHJcbiAgICAgICAgcmV0dXJuIHNjZW5lO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRQYXJ0aWNsZXNTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZXMgPSBuZXcgcmVzaGFkZXIuR2VvbWV0cnkoe1xyXG4gICAgICAgICAgICBhX2luZGV4IDogdGhpcy5fcGFydGljbGVJbmRpY2VzXHJcbiAgICAgICAgfSwgdGhpcy5fcGFydGljbGVJbmRpY2VzLmxlbmd0aCwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmUgOiAncG9pbnQnLFxyXG4gICAgICAgICAgICBwb3NpdGlvbkF0dHJpYnV0ZTogJ2FfaW5kZXgnLFxyXG4gICAgICAgICAgICBwb3NpdGlvblNpemUgOiAxXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVzTWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHBhcnRpY2xlcyk7XHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3BhcnRpY2xlc01lc2hdKTtcclxuICAgICAgICByZXR1cm4gc2NlbmU7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFdpbmRTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmxheWVyLmdldE1hcCgpO1xyXG4gICAgICAgIGNvbnN0IGV4dGVudCA9IHRoaXMuX2dldE1hcEV4dGVudCgpO1xyXG4gICAgICAgIGNvbnN0IGx0ID0gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBuZXcgbWFwdGFsa3MuQ29vcmRpbmF0ZShbZXh0ZW50LnhtaW4sIGV4dGVudC55bWF4XSkpO1xyXG4gICAgICAgIGNvbnN0IGxiID0gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBuZXcgbWFwdGFsa3MuQ29vcmRpbmF0ZShleHRlbnQueG1pbiwgZXh0ZW50LnltaW4pKTtcclxuICAgICAgICBjb25zdCByYiA9IGNvb3JkaW5hdGVUb1dvcmxkKG1hcCwgbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZXh0ZW50LnhtYXgsIGV4dGVudC55bWluKSk7XHJcbiAgICAgICAgY29uc3QgcnQgPSBjb29yZGluYXRlVG9Xb3JsZChtYXAsIG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKGV4dGVudC54bWF4LCBleHRlbnQueW1heCkpO1xyXG4gICAgICAgIGNvbnN0IHBsYW5lID0gbmV3IHJlc2hhZGVyLkdlb21ldHJ5KHtcclxuICAgICAgICAgICAgYV9wb3M6IFtcclxuICAgICAgICAgICAgICAgIGxiWzBdLCBsYlsxXSwgbGJbMl0sLy/lt6bkuItcclxuICAgICAgICAgICAgICAgIHJiWzBdLCByYlsxXSwgcmJbMl0sLy/lj7PkuItcclxuICAgICAgICAgICAgICAgIGx0WzBdLCBsdFsxXSwgbHRbMl0sLy/lt6bkuIpcclxuICAgICAgICAgICAgICAgIGx0WzBdLCBsdFsxXSwgbHRbMl0sLy/lt6bkuIpcclxuICAgICAgICAgICAgICAgIHJiWzBdLCByYlsxXSwgcmJbMl0sLy/lj7PkuItcclxuICAgICAgICAgICAgICAgIHJ0WzBdLCBydFsxXSwgcnRbMl0vL+WPs+S4ilxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB1diA6IFtcclxuICAgICAgICAgICAgICAgIDAsIDAsXHJcbiAgICAgICAgICAgICAgICAxLCAwLFxyXG4gICAgICAgICAgICAgICAgMCwgMSxcclxuICAgICAgICAgICAgICAgIDAsIDEsXHJcbiAgICAgICAgICAgICAgICAxLCAwLFxyXG4gICAgICAgICAgICAgICAgMSwgMVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSwgNiwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmU6ICd0cmlhbmdsZScsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uQXR0cmlidXRlOiAnYV9wb3MnLFxyXG4gICAgICAgICAgICBwb3NpdGlvblNpemU6IDNcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCBwbGFuZU1lc2ggPSBuZXcgcmVzaGFkZXIuTWVzaChwbGFuZSk7XHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3BsYW5lTWVzaF0pO1xyXG4gICAgICAgIHJldHVybiBzY2VuZTtcclxuICAgIH1cclxuXHJcbiAgICBfZHJhd1NjcmVlbigpIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmxheWVyLmdldE1hcCgpO1xyXG4gICAgICAgIHRoaXMuX2ZyYW1lYnVmZmVyKHtcclxuICAgICAgICAgICAgY29sb3IgOiB0aGlzLl9zY3JlZW5UZXh0dXJlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5fZHJhd1BhcnRpY2xlcygpO1xyXG4gICAgICAgIGNvbnN0IHF1YWRTY2VuZSA9IHRoaXMuX2dldFF1YWRTY2VuZSgpO1xyXG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuc2NyZWVuU2hhZGVyLHtcclxuICAgICAgICAgICAgdV9zY3JlZW4gOiB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSxcclxuICAgICAgICAgICAgdV9vcGFjaXR5IDogdGhpcy5fZmFkZU9wYWNpdHlcclxuICAgICAgICB9LCBxdWFkU2NlbmUsIHRoaXMuX2ZyYW1lYnVmZmVyKTtcclxuICAgICAgICBjb25zdCB3aW5kU2NlbmUgPSB0aGlzLl9nZXRXaW5kU2NlbmUoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLndpbmRTaGFkZXIsIHtcclxuICAgICAgICAgICAgdV9zY3JlZW46IHRoaXMuX3NjcmVlblRleHR1cmUsXHJcbiAgICAgICAgICAgIHVfb3BhY2l0eTogMS4wLFxyXG4gICAgICAgICAgICBwcm9qVmlld01hdHJpeCA6IG1hcC5wcm9qVmlld01hdHJpeFxyXG4gICAgICAgIH0sIHdpbmRTY2VuZSk7XHJcbiAgICAgICAgY29uc3QgdGVtcCA9IHRoaXMuX2JhY2tncm91bmRUZXh0dXJlO1xyXG4gICAgICAgIHRoaXMuX2JhY2tncm91bmRUZXh0dXJlID0gdGhpcy5fc2NyZWVuVGV4dHVyZTtcclxuICAgICAgICB0aGlzLl9zY3JlZW5UZXh0dXJlID0gdGVtcDtcclxuICAgIH1cclxuXHJcbiAgICBfZHJhd1BhcnRpY2xlcygpIHtcclxuICAgICAgICBjb25zdCBleHRlbnQgPSB0aGlzLl9nZXRNYXBFeHRlbnQoKTtcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZVNjZW5lID0gdGhpcy5fZ2V0UGFydGljbGVzU2NlbmUoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLmRyYXdTaGFkZXIsIHtcclxuICAgICAgICAgICAgZXh0ZW50IDogW2V4dGVudC54bWluLCBleHRlbnQueG1heCwgLWV4dGVudC55bWF4LCAtZXh0ZW50LnltaW5dLFxyXG4gICAgICAgICAgICB1X3dpbmQ6IHRoaXMuX3dpbmRUZXh0dXJlLFxyXG4gICAgICAgICAgICB1X3BhcnRpY2xlczogdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwLFxyXG4gICAgICAgICAgICB1X2NvbG9yX3JhbXA6IHRoaXMuX2NvbG9yUmFtcFRleHR1cmUsXHJcbiAgICAgICAgICAgIHVfcGFydGljbGVzX3JlczogdGhpcy5fcGFydGljbGVTdGF0ZVJlc29sdXRpb24sXHJcbiAgICAgICAgICAgIHVfd2luZF9taW46IFt0aGlzLl93aW5kRGF0YS51TWluLCB0aGlzLl93aW5kRGF0YS52TWluXSxcclxuICAgICAgICAgICAgdV93aW5kX21heDogW3RoaXMuX3dpbmREYXRhLnVNYXgsIHRoaXMuX3dpbmREYXRhLnZNYXhdLFxyXG4gICAgICAgICAgICBmdWxsX3dpZHRoIDogdGhpcy5fd2luZERhdGEud2lkdGgsXHJcbiAgICAgICAgICAgIGZ1bGxfaGVpZ2h0IDogdGhpcy5fd2luZERhdGEuaGVpZ2h0LFxyXG4gICAgICAgICAgICBmdWxsX2V4dGVudCA6IHRoaXMuX3dpbmREYXRhLmZ1bGxfZXh0ZW50LFxyXG4gICAgICAgICAgICBkeCA6IHRoaXMuX3dpbmREYXRhLmR4LFxyXG4gICAgICAgICAgICBkeSA6IHRoaXMuX3dpbmREYXRhLmR5XHJcbiAgICAgICAgfSwgcGFydGljbGVTY2VuZSwgdGhpcy5fZnJhbWVidWZmZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIF91cGRhdGVQYXJ0aWNsZXMoKSB7XHJcbiAgICAgICAgdGhpcy5fZnJhbWVidWZmZXIoe1xyXG4gICAgICAgICAgICBjb2xvcjogdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUxXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgZXh0ZW50ID0gdGhpcy5fZ2V0TWFwRXh0ZW50KCk7XHJcbiAgICAgICAgY29uc3QgcXVhZFNjZW5lID0gdGhpcy5fZ2V0UXVhZFNjZW5lKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy51cGRhdGVTSGFkZXIsIHtcclxuICAgICAgICAgICAgZXh0ZW50IDogW2V4dGVudC54bWluLCBleHRlbnQueG1heCwgLWV4dGVudC55bWF4LCAtZXh0ZW50LnltaW5dLFxyXG4gICAgICAgICAgICB1X3dpbmQ6IHRoaXMuX3dpbmRUZXh0dXJlLFxyXG4gICAgICAgICAgICB1X3BhcnRpY2xlczogdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwLFxyXG4gICAgICAgICAgICB1X3JhbmRfc2VlZDogTWF0aC5yYW5kb20oKSxcclxuICAgICAgICAgICAgdV93aW5kX3JlczogW3RoaXMuX3dpbmREYXRhLndpZHRoLCB0aGlzLl93aW5kRGF0YS5oZWlnaHRdLFxyXG4gICAgICAgICAgICB1X3dpbmRfbWluOiBbdGhpcy5fd2luZERhdGEudU1pbiwgdGhpcy5fd2luZERhdGEudk1pbl0sXHJcbiAgICAgICAgICAgIHVfd2luZF9tYXg6IFt0aGlzLl93aW5kRGF0YS51TWF4LCB0aGlzLl93aW5kRGF0YS52TWF4XSxcclxuICAgICAgICAgICAgdV9zcGVlZF9mYWN0b3I6IHRoaXMuX3NwZWVkRmFjdG9yLFxyXG4gICAgICAgICAgICB1X2Ryb3BfcmF0ZTogdGhpcy5fZHJvcFJhdGUsXHJcbiAgICAgICAgICAgIHVfZHJvcF9yYXRlX2J1bXA6IHRoaXMuX2Ryb3BSYXRlQnVtcCxcclxuICAgICAgICAgICAgZnVsbF93aWR0aCA6IHRoaXMuX3dpbmREYXRhLndpZHRoLFxyXG4gICAgICAgICAgICBmdWxsX2hlaWdodCA6IHRoaXMuX3dpbmREYXRhLmhlaWdodCxcclxuICAgICAgICAgICAgZnVsbF9leHRlbnQgOiB0aGlzLl93aW5kRGF0YS5mdWxsX2V4dGVudCxcclxuICAgICAgICAgICAgZHggOiB0aGlzLl93aW5kRGF0YS5keCxcclxuICAgICAgICAgICAgZHkgOiB0aGlzLl93aW5kRGF0YS5keVxyXG4gICAgICAgIH0sIHF1YWRTY2VuZSwgdGhpcy5fZnJhbWVidWZmZXIpO1xyXG5cclxuICAgICAgICBjb25zdCB0ZW1wID0gdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwO1xyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMCA9IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMTtcclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTEgPSB0ZW1wO1xyXG4gICAgfVxyXG5cclxuICAgIF9yZW5kZXJXaW5kU2NlbmUoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl9zY3JlZW5UZXh0dXJlIHx8IXRoaXMuX2JhY2tncm91bmRUZXh0dXJlIHx8ICF0aGlzLl93aW5kVGV4dHVyZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3VwZGF0ZVBhcmFtcygpO1xyXG4gICAgICAgIHRoaXMuX2RyYXdTY3JlZW4oKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVQYXJ0aWNsZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBfZ2V0TWFwRXh0ZW50KCkge1xyXG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMubGF5ZXIuZ2V0TWFwKCk7XHJcbiAgICAgICAgY29uc3QgZXh0ZW50ID0gbWFwLmdldEV4dGVudCgpO1xyXG4gICAgICAgIGlmIChleHRlbnQueG1heCA8IGV4dGVudC54bWluKSB7XHJcbiAgICAgICAgICAgIGV4dGVudC54bWF4ID0gZXh0ZW50LnhtYXggKyAzNjA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGV4dGVudC54bWluID0gZXh0ZW50LnhtaW4gPCB0aGlzLl93aW5kRGF0YS5mdWxsX2V4dGVudFswXSA/IHRoaXMuX3dpbmREYXRhLmZ1bGxfZXh0ZW50WzBdIDogZXh0ZW50LnhtaW47XHJcbiAgICAgICAgZXh0ZW50LnhtYXggPSBleHRlbnQueG1heCA+IHRoaXMuX3dpbmREYXRhLmZ1bGxfZXh0ZW50WzFdID8gdGhpcy5fd2luZERhdGEuZnVsbF9leHRlbnRbMV0gOiBleHRlbnQueG1heDtcclxuICAgICAgICBleHRlbnQueW1pbiA9IGV4dGVudC55bWluIDwgdGhpcy5fd2luZERhdGEuZnVsbF9leHRlbnRbMl0gPyB0aGlzLl93aW5kRGF0YS5mdWxsX2V4dGVudFsyXSA6IGV4dGVudC55bWluO1xyXG4gICAgICAgIGV4dGVudC55bWF4ID0gZXh0ZW50LnltYXggPiB0aGlzLl93aW5kRGF0YS5mdWxsX2V4dGVudFszXSA/IHRoaXMuX3dpbmREYXRhLmZ1bGxfZXh0ZW50WzNdIDogZXh0ZW50LnltYXg7XHJcbiAgICAgICAgcmV0dXJuIGV4dGVudDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRTcGVlZChjb29yZGluYXRlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLnJlZ2wgfHwgIXRoaXMuX3dpbmREYXRhIHx8ICF0aGlzLl93aW5kRGF0YS53aWR0aCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHQgPSBjb29yZGluYXRlLnggJSAxODA7XHJcbiAgICAgICAgY29uc3QgcGl4ZWxYID0gKCggdCArIDE4MCkgLyAzNjApICogdGhpcy5fd2luZERhdGEud2lkdGg7XHJcbiAgICAgICAgaWYgKGNvb3JkaW5hdGUueSA8IC05MCB8fCBjb29yZGluYXRlLnkgPiA5MCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgeSBmb3IgY29vcmRpbmF0ZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBwaXhlbFkgPSAoKDkwIC0gY29vcmRpbmF0ZS55KSAvIDE4MCkgKiB0aGlzLl93aW5kRGF0YS5oZWlnaHQ7XHJcbiAgICAgICAgY29uc3QgZnJhbWVidWZmZXIgPSB0aGlzLnJlZ2wuZnJhbWVidWZmZXIoe1xyXG4gICAgICAgICAgICBjb2xvciA6IHRoaXMuX3dpbmRUZXh0dXJlLFxyXG4gICAgICAgICAgICB3aWR0aCA6IHRoaXMuX3dpbmREYXRhLndpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQgOiB0aGlzLl93aW5kRGF0YS5oZWlnaHRcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSB0aGlzLnJlZ2wucmVhZCh7XHJcbiAgICAgICAgICAgIHg6IHBpeGVsWCxcclxuICAgICAgICAgICAgeTogcGl4ZWxZLFxyXG4gICAgICAgICAgICB3aWR0aDogMSxcclxuICAgICAgICAgICAgaGVpZ2h0OiAxLFxyXG4gICAgICAgICAgICBmcmFtZWJ1ZmZlclxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHZ4ID0gcGl4ZWxzWzBdICogKHRoaXMuX3dpbmREYXRhLnVNYXggLSB0aGlzLl93aW5kRGF0YS51TWluKSAvIDI1NSArIHRoaXMuX3dpbmREYXRhLnVNaW47XHJcbiAgICAgICAgY29uc3QgdnkgPSBwaXhlbHNbMV0gKiAodGhpcy5fd2luZERhdGEudk1heCAtIHRoaXMuX3dpbmREYXRhLnZNaW4pIC8gMjU1ICsgdGhpcy5fd2luZERhdGEudk1pbjtcclxuICAgICAgICByZXR1cm4gW3Z4LCB2eV07XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBXaW5kTGF5ZXJSZW5kZXJlcjtcclxuXHJcbmZ1bmN0aW9uIGNvb3JkaW5hdGVUb1dvcmxkKG1hcCwgY29vcmRpbmF0ZSwgeiA9IDApIHtcclxuICAgIGlmICghbWFwKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBjb25zdCBwID0gbWFwLmNvb3JkaW5hdGVUb1BvaW50KGNvb3JkaW5hdGUsIG1hcC5nZXRHTFpvb20oKSk7XHJcbiAgICByZXR1cm4gW3AueCwgcC55LCB6XTtcclxufVxyXG4iLCJpbXBvcnQgKiBhcyBtYXB0YWxrcyBmcm9tICdtYXB0YWxrcyc7XHJcbmltcG9ydCBXaW5kTGF5ZXJSZW5kZXJlciBmcm9tICcuL1dpbmRMYXllclJlbmRlcmVyJztcclxuXHJcbmNvbnN0IGRlZmF1bHRSYW1wQ29sb3JzID0ge1xyXG4gICAgMC4wOiAnIzMyODhiZCcsXHJcbiAgICAwLjE6ICcjNjZjMmE1JyxcclxuICAgIDAuMjogJyNhYmRkYTQnLFxyXG4gICAgMC4zOiAnI2U2ZjU5OCcsXHJcbiAgICAwLjQ6ICcjZmVlMDhiJyxcclxuICAgIDAuNTogJyNmZGFlNjEnLFxyXG4gICAgMC42OiAnI2Y0NmQ0MycsXHJcbiAgICAxLjA6ICcjZDUzZTRmJ1xyXG59O1xyXG5cclxuY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICdyZW5kZXJlcicgOiAnZ2wnLFxyXG4gICAgJ2NvdW50JyA6IDI1NiAqIDI1NixcclxuICAgICdmYWRlT3BhY2l0eScgOiAwLjk5NixcclxuICAgICdzcGVlZEZhY3RvcicgOiAwLjI1LFxyXG4gICAgJ2Ryb3BSYXRlJyA6IDAuMDAzLFxyXG4gICAgJ2Ryb3BSYXRlQnVtcCcgOiAwLjAxLFxyXG4gICAgJ2NvbG9ycycgOiBkZWZhdWx0UmFtcENvbG9yc1xyXG59O1xyXG5cclxuZXhwb3J0IGNsYXNzIFdpbmRMYXllciBleHRlbmRzIG1hcHRhbGtzLkxheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKGlkLCBvcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoaWQsIG9wdGlvbnMpO1xyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xyXG4gICAgICAgICAgICB0aGlzLnNldFdpbmQob3B0aW9ucy5kYXRhKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0V2luZCh3aW5kRGF0YSkge1xyXG4gICAgICAgIHRoaXMuX2NhbGxSZW5kZXJlck1ldGhvZCgnc2V0RGF0YScsIHdpbmREYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRQYXJ0aWNsZXNDb3VudChjb3VudCkge1xyXG4gICAgICAgIHRoaXMuX2NhbGxSZW5kZXJlck1ldGhvZCgnc2V0UGFydGljbGVzQ291bnQnLCBjb3VudCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UGFydGljbGVzQ291bnQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbGxSZW5kZXJlck1ldGhvZCgnZ2V0UGFydGljbGVzQ291bnQnKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRSYW1wQ29sb3JzKGNvbG9ycykge1xyXG4gICAgICAgIHRoaXMuX2NhbGxSZW5kZXJlck1ldGhvZCgnc2V0Q29sb3JSYW1wJywgY29sb3JzKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRXaW5kU3BlZWQoY29vcmQpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY2FsbFJlbmRlcmVyTWV0aG9kKCdnZXRTcGVlZCcsIGNvb3JkKTtcclxuICAgIH1cclxuXHJcbiAgICBfY2FsbFJlbmRlcmVyTWV0aG9kKGZ1bmMsIHBhcmFtcykge1xyXG4gICAgICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5nZXRSZW5kZXJlcigpO1xyXG4gICAgICAgIGlmIChyZW5kZXJlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVuZGVyZXJbZnVuY10ocGFyYW1zKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXJlcmNyZWF0ZScsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZS5yZW5kZXJlcltmdW5jXShwYXJhbXMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuV2luZExheWVyLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcclxuV2luZExheWVyLnJlZ2lzdGVySlNPTlR5cGUoJ1dpbmRMYXllcicpO1xyXG5cclxuV2luZExheWVyLnJlZ2lzdGVyUmVuZGVyZXIoJ2dsJywgV2luZExheWVyUmVuZGVyZXIpO1xyXG4iXSwibmFtZXMiOlsiV2luZExheWVyUmVuZGVyZXIiLCJsYXllciIsIl91cGRhdGVQYXJhbXMiLCJfd2luZERhdGEiLCJkcmF3IiwicHJlcGFyZUNhbnZhcyIsIl9yZW5kZXJXaW5kU2NlbmUiLCJkcmF3T25JbnRlcmFjdGluZyIsIm5lZWRUb1JlZHJhdyIsImhpdERldGVjdCIsImNyZWF0ZUNvbnRleHQiLCJjYW52YXMiLCJnbCIsIndyYXAiLCJhdHRyaWJ1dGVzIiwib3B0aW9ucyIsImdsT3B0aW9ucyIsImFscGhhIiwiZGVwdGgiLCJzdGVuY2lsIiwiX2NyZWF0ZUdMQ29udGV4dCIsInJlZ2wiLCJjcmVhdGVSRUdMIiwiZXh0ZW5zaW9ucyIsIm9wdGlvbmFsRXh0ZW5zaW9ucyIsIl9pbml0UmVuZGVyZXIiLCJjbGVhckNhbnZhcyIsImNsZWFyIiwiY29sb3IiLCJfcGFydGljbGVzQ291bnQiLCJjb3VudCIsIl9mYWRlT3BhY2l0eSIsImZhZGVPcGFjaXR5IiwiX3NwZWVkRmFjdG9yIiwic3BlZWRGYWN0b3IiLCJfZHJvcFJhdGUiLCJkcm9wUmF0ZSIsIl9kcm9wUmF0ZUJ1bXAiLCJkcm9wUmF0ZUJ1bXAiLCJfcmFtcENvbG9ycyIsImNvbG9ycyIsInJlbmRlcmVyIiwicmVzaGFkZXIiLCJSZW5kZXJlciIsIndpZHRoIiwiaGVpZ2h0IiwiX2NhbnZhc1dpZHRoIiwiX2NhbnZhc0hlaWdodCIsIl9wcmVwYXJlUGFydGljbGVzIiwiX3ByZXBhcmVUZXh0dXJlIiwiX3ByZXBhcmVTaGFkZXIiLCJzZXRDb2xvclJhbXAiLCJfZnJhbWVidWZmZXIiLCJmcmFtZWJ1ZmZlciIsInRleHR1cmUiLCJlbXB0eVBpeGVscyIsIlVpbnQ4QXJyYXkiLCJfYmFja2dyb3VuZFRleHR1cmUiLCJkYXRhIiwiX3NjcmVlblRleHR1cmUiLCJfd2luZFRleHR1cmUiLCJfcHJlcGFyZVdpbmRUZXh0dXJlIiwibWFwdGFsa3MiLCJpc1N0cmluZyIsImluZGV4T2YiLCJnZXQiLCJlcnIiLCJFcnJvciIsIl9yZXNvbHZlR0ZTIiwiSlNPTiIsInBhcnNlIiwiX2NyZWF0ZVdpbmRUZXh0dXJlIiwiaXNHRlNPYmplY3QiLCJpbWFnZSIsIkltYWdlIiwic3JjIiwib25sb2FkIiwiZmlyZSIsIm1hZyIsIm1pbiIsImhlYWRlciIsInBhcnRpY2xlUmVzIiwiX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uIiwiTWF0aCIsImNlaWwiLCJzcXJ0IiwiX251bVBhcnRpY2xlcyIsInBhcnRpY2xlU3RhdGUiLCJpIiwibGVuZ3RoIiwiZmxvb3IiLCJyYW5kb20iLCJfcGFydGljbGVTdGF0ZVRleHR1cmUwIiwiX3BhcnRpY2xlU3RhdGVUZXh0dXJlMSIsIl9wYXJ0aWNsZUluZGljZXMiLCJGbG9hdDMyQXJyYXkiLCJ2aWV3cG9ydCIsIngiLCJ5IiwiZHJhd1NoYWRlciIsIk1lc2hTaGFkZXIiLCJ2ZXJ0IiwiZHJhd1ZlcnQiLCJmcmFnIiwiZHJhd0ZyYWciLCJ1bmlmb3JtcyIsImV4dHJhQ29tbWFuZFByb3BzIiwiZGVmaW5lcyIsInNjcmVlblNoYWRlciIsInF1YWRWZXJ0Iiwic2NyZWVuRnJhZyIsInVwZGF0ZVNIYWRlciIsInVwZGF0ZUZyYWciLCJkaXRoZXIiLCJ3aW5kU2hhZGVyIiwid2luZFZlcnQiLCJ3aW5kRnJhZyIsIm5hbWUiLCJ0eXBlIiwiZm4iLCJjb250ZXh0IiwicHJvcHMiLCJtYXQ0IiwibXVsdGlwbHkiLCJnZnNEYXRhIiwidURhdGEiLCJ2RGF0YSIsInVNaW4iLCJhcHBseSIsInVNYXgiLCJtYXgiLCJ2TWluIiwidk1heCIsInZlbG9jaXR5RGF0YSIsInIiLCJwdXNoIiwiZyIsIm54IiwibnkiLCJsbzEiLCJsbzIiLCJsYTEiLCJsYTIiLCJkeCIsImR5IiwibmFtZXMiLCJnZXRDb250ZXh0IiwiZSIsInJlc2l6ZUNhbnZhcyIsIl9pc0NhbnZhc1Jlc2l6ZSIsInNldERhdGEiLCJzZXRQYXJ0aWNsZXNDb3VudCIsImdldFBhcnRpY2xlc0NvdW50IiwiX2NvbG9yUmFtcFRleHR1cmUiLCJfZ2V0Q29sb3JSYW1wIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY3R4IiwiZ3JhZGllbnQiLCJjcmVhdGVMaW5lYXJHcmFkaWVudCIsInN0b3AiLCJhZGRDb2xvclN0b3AiLCJmaWxsU3R5bGUiLCJmaWxsUmVjdCIsImdldEltYWdlRGF0YSIsIl9nZXRRdWFkU2NlbmUiLCJwbGFuZSIsIkdlb21ldHJ5IiwiYV9wb3MiLCJwcmltaXRpdmUiLCJwb3NpdGlvbkF0dHJpYnV0ZSIsInBvc2l0aW9uU2l6ZSIsInBsYW5lTWVzaCIsIk1lc2giLCJzY2VuZSIsIlNjZW5lIiwiX2dldFBhcnRpY2xlc1NjZW5lIiwicGFydGljbGVzIiwiYV9pbmRleCIsInBhcnRpY2xlc01lc2giLCJfZ2V0V2luZFNjZW5lIiwibWFwIiwiZ2V0TWFwIiwiZXh0ZW50IiwiX2dldE1hcEV4dGVudCIsImx0IiwiY29vcmRpbmF0ZVRvV29ybGQiLCJ4bWluIiwieW1heCIsImxiIiwieW1pbiIsInJiIiwieG1heCIsInJ0IiwidXYiLCJfZHJhd1NjcmVlbiIsIl9kcmF3UGFydGljbGVzIiwicXVhZFNjZW5lIiwicmVuZGVyIiwidV9zY3JlZW4iLCJ1X29wYWNpdHkiLCJ3aW5kU2NlbmUiLCJwcm9qVmlld01hdHJpeCIsInRlbXAiLCJwYXJ0aWNsZVNjZW5lIiwidV93aW5kIiwidV9wYXJ0aWNsZXMiLCJ1X2NvbG9yX3JhbXAiLCJ1X3BhcnRpY2xlc19yZXMiLCJ1X3dpbmRfbWluIiwidV93aW5kX21heCIsImZ1bGxfd2lkdGgiLCJmdWxsX2hlaWdodCIsImZ1bGxfZXh0ZW50IiwiX3VwZGF0ZVBhcnRpY2xlcyIsInVfcmFuZF9zZWVkIiwidV93aW5kX3JlcyIsInVfc3BlZWRfZmFjdG9yIiwidV9kcm9wX3JhdGUiLCJ1X2Ryb3BfcmF0ZV9idW1wIiwiZ2V0RXh0ZW50IiwiZ2V0U3BlZWQiLCJjb29yZGluYXRlIiwidCIsInBpeGVsWCIsInBpeGVsWSIsInBpeGVscyIsInJlYWQiLCJ2eCIsInZ5IiwiQ2FudmFzUmVuZGVyZXIiLCJ6IiwicCIsImNvb3JkaW5hdGVUb1BvaW50IiwiZ2V0R0xab29tIiwiZGVmYXVsdFJhbXBDb2xvcnMiLCJXaW5kTGF5ZXIiLCJpZCIsInNldFdpbmQiLCJ3aW5kRGF0YSIsIl9jYWxsUmVuZGVyZXJNZXRob2QiLCJzZXRSYW1wQ29sb3JzIiwiZ2V0V2luZFNwZWVkIiwiY29vcmQiLCJmdW5jIiwicGFyYW1zIiwiZ2V0UmVuZGVyZXIiLCJvbiIsIm1lcmdlT3B0aW9ucyIsInJlZ2lzdGVySlNPTlR5cGUiLCJyZWdpc3RlclJlbmRlcmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BZU1BOzs7RUFFRiw2QkFBWUMsS0FBWixFQUFtQjtFQUFBOztFQUNmLDZDQUFNQSxLQUFOOztFQUNBLFVBQUtDLGFBQUw7O0VBQ0EsVUFBS0MsU0FBTCxHQUFpQixFQUFqQjtFQUhlO0VBSWxCOzs7O1dBRURDLE9BQUEsZ0JBQU87RUFDSCxTQUFLQyxhQUFMOztFQUNBLFNBQUtDLGdCQUFMO0VBQ0g7O1dBRURDLG9CQUFBLDZCQUFvQjtFQUNoQixTQUFLRCxnQkFBTDtFQUNIOztXQUVERSxlQUFBLHdCQUFlO0VBQ1gsV0FBTyxJQUFQO0VBQ0g7O1dB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
