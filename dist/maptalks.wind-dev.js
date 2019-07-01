/*!
 * maptalks.wind v0.1.3
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
      } else if (maptalks.Util.isString(this._windData.data)) {
        var image = new Image();
        image.src = this._windData.data;

        image.onload = function () {
          _this2._windData.data = image;

          _this2._createWindTexture();

          _this2.layer.fire('windtexture-create-debug');
        };
      } else {
        this._createWindTexture();
      }
    };

    _proto._createWindTexture = function _createWindTexture() {
      if (!this._windData.data) {
        return;
      }

      this._windTexture = this.regl.texture({
        width: this._windData.width,
        height: this._windData.height,
        data: this._windData.data,
        mag: 'linear',
        min: 'linear'
      });
    };

    _proto.isGFSObject = function isGFSObject() {
      if (this._windData[0].header && typeof this._windData[0].header === 'object') {
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
        "date": uData.meta.date,
        "width": uData.header.nx,
        "height": uData.header.ny,
        "uMin": uMin,
        "uMax": uMax,
        "vMin": vMin,
        "vMax": vMax,
        "data": velocityData
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

  typeof console !== 'undefined' && console.log('maptalks.wind v0.1.3, requires maptalks@<2.0.0.');

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3Mud2luZC1kZXYuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9XaW5kTGF5ZXJSZW5kZXJlci5qcyIsIi4uL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGhlcmUgYXJlIG1hbnkgcmVuZGVyaW5nIG1ldGhvZHMgYW5kIGdsc2wgY29kZVxyXG4gKiBiYXNlZCBvbiBwcm9qZWN0IGZpbmlzaGVkIGJ5IEBtb3VybmVyIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3VybmVyIFxyXG4gKiBhbmQgaGlzIHByb2plY3QgaXMgaGVyZSBodHRwczovL2dpdGh1Yi5jb20vbWFwYm94L3dlYmdsLXdpbmQuXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBtYXB0YWxrcyBmcm9tICdtYXB0YWxrcyc7XHJcbmltcG9ydCB7IGNyZWF0ZVJFR0wsIG1hdDQsIHJlc2hhZGVyIH0gZnJvbSAnQG1hcHRhbGtzL2dsJztcclxuaW1wb3J0IGRyYXdWZXJ0IGZyb20gJy4vZ2xzbC9kcmF3LnZlcnQnO1xyXG5pbXBvcnQgZHJhd0ZyYWcgZnJvbSAnLi9nbHNsL2RyYXcuZnJhZyc7XHJcbmltcG9ydCBxdWFkVmVydCBmcm9tICcuL2dsc2wvcXVhZC52ZXJ0JztcclxuaW1wb3J0IHNjcmVlbkZyYWcgZnJvbSAnLi9nbHNsL3NjcmVlbi5mcmFnJztcclxuaW1wb3J0IHVwZGF0ZUZyYWcgZnJvbSAnLi9nbHNsL3VwZGF0ZS5mcmFnJztcclxuaW1wb3J0IHdpbmRWZXJ0IGZyb20gJy4vZ2xzbC93aW5kLnZlcnQnO1xyXG5pbXBvcnQgd2luZEZyYWcgZnJvbSAnLi9nbHNsL3dpbmQuZnJhZyc7XHJcblxyXG5jbGFzcyBXaW5kTGF5ZXJSZW5kZXJlciBleHRlbmRzIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihsYXllcikge1xyXG4gICAgICAgIHN1cGVyKGxheWVyKTtcclxuICAgICAgICB0aGlzLl91cGRhdGVQYXJhbXMoKTtcclxuICAgICAgICB0aGlzLl93aW5kRGF0YSA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoKSB7XHJcbiAgICAgICAgdGhpcy5wcmVwYXJlQ2FudmFzKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyV2luZFNjZW5lKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZHJhd09uSW50ZXJhY3RpbmcoKSB7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyV2luZFNjZW5lKCk7XHJcbiAgICB9XHJcblxyXG4gICAgbmVlZFRvUmVkcmF3KCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGhpdERldGVjdCgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlQ29udGV4dCgpIHtcclxuICAgICAgICBpZiAodGhpcy5jYW52YXMuZ2wgJiYgdGhpcy5jYW52YXMuZ2wud3JhcCkge1xyXG4gICAgICAgICAgICB0aGlzLmdsID0gdGhpcy5jYW52YXMuZ2wud3JhcCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcjtcclxuICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlcyA9IGxheWVyLm9wdGlvbnMuZ2xPcHRpb25zIHx8IHtcclxuICAgICAgICAgICAgICAgIGFscGhhOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGVwdGg6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAvL2FudGlhbGlhczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHN0ZW5jaWwgOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuZ2xPcHRpb25zID0gYXR0cmlidXRlcztcclxuICAgICAgICAgICAgdGhpcy5nbCA9IHRoaXMuZ2wgfHwgdGhpcy5fY3JlYXRlR0xDb250ZXh0KHRoaXMuY2FudmFzLCBhdHRyaWJ1dGVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZWdsID0gY3JlYXRlUkVHTCh7XHJcbiAgICAgICAgICAgIGdsIDogdGhpcy5nbCxcclxuICAgICAgICAgICAgZXh0ZW5zaW9ucyA6IFtcclxuICAgICAgICAgICAgICAgIC8vICdBTkdMRV9pbnN0YW5jZWRfYXJyYXlzJyxcclxuICAgICAgICAgICAgICAgIC8vICdPRVNfdGV4dHVyZV9mbG9hdCcsXHJcbiAgICAgICAgICAgICAgICAvLyAnT0VTX3RleHR1cmVfZmxvYXRfbGluZWFyJyxcclxuICAgICAgICAgICAgICAgICdPRVNfZWxlbWVudF9pbmRleF91aW50JyxcclxuICAgICAgICAgICAgICAgICdPRVNfc3RhbmRhcmRfZGVyaXZhdGl2ZXMnXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIG9wdGlvbmFsRXh0ZW5zaW9ucyA6IHRoaXMubGF5ZXIub3B0aW9uc1snZ2xFeHRlbnNpb25zJ10gfHwgW11cclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLl9pbml0UmVuZGVyZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBjbGVhckNhbnZhcygpIHtcclxuICAgICAgICBpZiAoIXRoaXMuY2FudmFzKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZWdsLmNsZWFyKHtcclxuICAgICAgICAgICAgY29sb3I6IFswLCAwLCAwLCAwXSxcclxuICAgICAgICAgICAgZGVwdGg6IDEsXHJcbiAgICAgICAgICAgIHN0ZW5jaWwgOiAwXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc3VwZXIuY2xlYXJDYW52YXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBfdXBkYXRlUGFyYW1zKCkge1xyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlc0NvdW50ID0gdGhpcy5sYXllci5vcHRpb25zLmNvdW50O1xyXG4gICAgICAgIHRoaXMuX2ZhZGVPcGFjaXR5ID0gdGhpcy5sYXllci5vcHRpb25zLmZhZGVPcGFjaXR5O1xyXG4gICAgICAgIHRoaXMuX3NwZWVkRmFjdG9yID0gdGhpcy5sYXllci5vcHRpb25zLnNwZWVkRmFjdG9yO1xyXG4gICAgICAgIHRoaXMuX2Ryb3BSYXRlID0gdGhpcy5sYXllci5vcHRpb25zLmRyb3BSYXRlO1xyXG4gICAgICAgIHRoaXMuX2Ryb3BSYXRlQnVtcCA9IHRoaXMubGF5ZXIub3B0aW9ucy5kcm9wUmF0ZUJ1bXA7XHJcbiAgICAgICAgdGhpcy5fcmFtcENvbG9ycyA9IHRoaXMubGF5ZXIub3B0aW9ucy5jb2xvcnM7XHJcbiAgICB9XHJcblxyXG4gICAgX2luaXRSZW5kZXJlcigpIHtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyID0gbmV3IHJlc2hhZGVyLlJlbmRlcmVyKHRoaXMucmVnbCk7XHJcbiAgICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLmNhbnZhcy53aWR0aCB8fCAxO1xyXG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuY2FudmFzLmhlaWdodCB8fCAxO1xyXG4gICAgICAgIHRoaXMuX2NhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICAgICAgdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVQYXJ0aWNsZXMoKTtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlVGV4dHVyZSgpO1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVTaGFkZXIoKTtcclxuICAgICAgICB0aGlzLnNldENvbG9yUmFtcCh0aGlzLl9yYW1wQ29sb3JzKTtcclxuICAgICAgICB0aGlzLl9mcmFtZWJ1ZmZlciA9IHRoaXMucmVnbC5mcmFtZWJ1ZmZlcih7XHJcbiAgICAgICAgICAgIGNvbG9yOiB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgICAgICB3aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgICAgIHdyYXA6ICdjbGFtcCdcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGRlcHRoOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgX3ByZXBhcmVUZXh0dXJlKCkge1xyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5jYW52YXMud2lkdGggfHwgMTtcclxuICAgICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLmNhbnZhcy5oZWlnaHQgfHwgMTtcclxuICAgICAgICBjb25zdCBlbXB0eVBpeGVscyA9IG5ldyBVaW50OEFycmF5KHdpZHRoICogaGVpZ2h0ICogNCk7XHJcbiAgICAgICAgdGhpcy5fYmFja2dyb3VuZFRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3NjcmVlblRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmKCF0aGlzLl93aW5kVGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9wcmVwYXJlV2luZFRleHR1cmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIF9wcmVwYXJlV2luZFRleHR1cmUoKSB7XHJcbiAgICAgICAgLy9pZiBnZnMgZGF0YVxyXG4gICAgICAgIGlmIChtYXB0YWxrcy5VdGlsLmlzU3RyaW5nKHRoaXMuX3dpbmREYXRhKSAmJiB0aGlzLl93aW5kRGF0YS5pbmRleE9mKCcuanNvbicpID4gLTEpIHtcclxuICAgICAgICAgICAgbWFwdGFsa3MuQWpheC5nZXQodGhpcy5fd2luZERhdGEsIChlcnIsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuX3dpbmREYXRhID0gdGhpcy5fcmVzb2x2ZUdGUyhKU09OLnBhcnNlKGRhdGEpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVdpbmRUZXh0dXJlKCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzR0ZTT2JqZWN0KCkpIHtcclxuICAgICAgICAgICAgdGhpcy5fd2luZERhdGEgPSB0aGlzLl9yZXNvbHZlR0ZTKHRoaXMuX3dpbmREYXRhKTtcclxuICAgICAgICAgICAgdGhpcy5fY3JlYXRlV2luZFRleHR1cmUoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1hcHRhbGtzLlV0aWwuaXNTdHJpbmcodGhpcy5fd2luZERhdGEuZGF0YSkpIHsgLy9pZiBpbWFnZSBzcmNcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICAgICAgaW1hZ2Uuc3JjID0gdGhpcy5fd2luZERhdGEuZGF0YTtcclxuICAgICAgICAgICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fd2luZERhdGEuZGF0YSA9IGltYWdlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlV2luZFRleHR1cmUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubGF5ZXIuZmlyZSgnd2luZHRleHR1cmUtY3JlYXRlLWRlYnVnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVXaW5kVGV4dHVyZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBfY3JlYXRlV2luZFRleHR1cmUoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl93aW5kRGF0YS5kYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fd2luZFRleHR1cmUgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIHdpZHRoIDogdGhpcy5fd2luZERhdGEud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCA6IHRoaXMuX3dpbmREYXRhLmhlaWdodCxcclxuICAgICAgICAgICAgZGF0YSA6IHRoaXMuX3dpbmREYXRhLmRhdGEsXHJcbiAgICAgICAgICAgIG1hZzogJ2xpbmVhcicsXHJcbiAgICAgICAgICAgIG1pbjogJ2xpbmVhcidcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpc0dGU09iamVjdCgpIHtcclxuICAgICAgICBpZiAodGhpcy5fd2luZERhdGFbMF0uaGVhZGVyICYmIHR5cGVvZiB0aGlzLl93aW5kRGF0YVswXS5oZWFkZXIgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBfcHJlcGFyZVBhcnRpY2xlcygpIHtcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZVJlcyA9IHRoaXMuX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uID0gTWF0aC5jZWlsKE1hdGguc3FydCh0aGlzLl9wYXJ0aWNsZXNDb3VudCkpO1xyXG4gICAgICAgIHRoaXMuX251bVBhcnRpY2xlcyA9IHBhcnRpY2xlUmVzICogcGFydGljbGVSZXM7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVTdGF0ZSA9IG5ldyBVaW50OEFycmF5KHRoaXMuX251bVBhcnRpY2xlcyAqIDQpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydGljbGVTdGF0ZS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBwYXJ0aWNsZVN0YXRlW2ldID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMjU2KTsgLy8gcmFuZG9taXplIHRoZSBpbml0aWFsIHBhcnRpY2xlIHBvc2l0aW9uc1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXRoaXMucmVnbCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRleHR1cmVzIHRvIGhvbGQgdGhlIHBhcnRpY2xlIHN0YXRlIGZvciB0aGUgY3VycmVudCBhbmQgdGhlIG5leHQgZnJhbWVcclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTAgPSB0aGlzLnJlZ2wudGV4dHVyZSh7XHJcbiAgICAgICAgICAgIGRhdGEgOiBwYXJ0aWNsZVN0YXRlLFxyXG4gICAgICAgICAgICB3aWR0aCA6IHBhcnRpY2xlUmVzLFxyXG4gICAgICAgICAgICBoZWlnaHQgOiBwYXJ0aWNsZVJlc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMSA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgZGF0YSA6IHBhcnRpY2xlU3RhdGUsXHJcbiAgICAgICAgICAgIHdpZHRoIDogcGFydGljbGVSZXMsXHJcbiAgICAgICAgICAgIGhlaWdodCA6IHBhcnRpY2xlUmVzXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcnRpY2xlSW5kaWNlcyA9IG5ldyBGbG9hdDMyQXJyYXkodGhpcy5fbnVtUGFydGljbGVzKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuX251bVBhcnRpY2xlczsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3BhcnRpY2xlSW5kaWNlc1tpXSA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9wcmVwYXJlU2hhZGVyKCkge1xyXG4gICAgICAgIGNvbnN0IHZpZXdwb3J0ID0ge1xyXG4gICAgICAgICAgICB4IDogMCxcclxuICAgICAgICAgICAgeSA6IDAsXHJcbiAgICAgICAgICAgIHdpZHRoIDogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FudmFzID8gdGhpcy5jYW52YXMud2lkdGggOiAxO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBoZWlnaHQgOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYW52YXMgPyB0aGlzLmNhbnZhcy5oZWlnaHQgOiAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmRyYXdTaGFkZXIgPSBuZXcgcmVzaGFkZXIuTWVzaFNoYWRlcih7XHJcbiAgICAgICAgICAgIHZlcnQgOiBkcmF3VmVydCxcclxuICAgICAgICAgICAgZnJhZyA6IGRyYXdGcmFnLFxyXG4gICAgICAgICAgICB1bmlmb3JtcyA6IFtcclxuICAgICAgICAgICAgICAgICdleHRlbnQnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZCcsXHJcbiAgICAgICAgICAgICAgICAndV9wYXJ0aWNsZXMnLFxyXG4gICAgICAgICAgICAgICAgJ3VfY29sb3JfcmFtcCcsXHJcbiAgICAgICAgICAgICAgICAndV9wYXJ0aWNsZXNfcmVzJyxcclxuICAgICAgICAgICAgICAgICd1X3dpbmRfbWluJyxcclxuICAgICAgICAgICAgICAgICd1X3dpbmRfbWF4J1xyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBleHRyYUNvbW1hbmRQcm9wcyA6IHsgdmlld3BvcnQgfSxcclxuICAgICAgICAgICAgZGVmaW5lcyA6IHt9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuc2NyZWVuU2hhZGVyID0gbmV3IHJlc2hhZGVyLk1lc2hTaGFkZXIoe1xyXG4gICAgICAgICAgICB2ZXJ0IDogcXVhZFZlcnQsXHJcbiAgICAgICAgICAgIGZyYWcgOiBzY3JlZW5GcmFnLFxyXG4gICAgICAgICAgICB1bmlmb3JtczogW1xyXG4gICAgICAgICAgICAgICAgJ3Vfc2NyZWVuJyxcclxuICAgICAgICAgICAgICAgICd1X29wYWNpdHknXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzIDoge1xyXG4gICAgICAgICAgICAgICAgdmlld3BvcnRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZGVmaW5lcyA6IHt9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlU0hhZGVyID0gbmV3IHJlc2hhZGVyLk1lc2hTaGFkZXIoe1xyXG4gICAgICAgICAgICB2ZXJ0IDogcXVhZFZlcnQsXHJcbiAgICAgICAgICAgIGZyYWcgOiB1cGRhdGVGcmFnLFxyXG4gICAgICAgICAgICB1bmlmb3JtczogW1xyXG4gICAgICAgICAgICAgICAgJ2V4dGVudCcsXHJcbiAgICAgICAgICAgICAgICAndV93aW5kJyxcclxuICAgICAgICAgICAgICAgICd1X3BhcnRpY2xlcycsXHJcbiAgICAgICAgICAgICAgICAndV9yYW5kX3NlZWQnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9yZXMnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9taW4nLFxyXG4gICAgICAgICAgICAgICAgJ3Vfd2luZF9tYXgnLFxyXG4gICAgICAgICAgICAgICAgJ3Vfc3BlZWRfZmFjdG9yJyxcclxuICAgICAgICAgICAgICAgICd1X2Ryb3BfcmF0ZScsXHJcbiAgICAgICAgICAgICAgICAndV9kcm9wX3JhdGVfYnVtcCdcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgZXh0cmFDb21tYW5kUHJvcHMgOiB7IFxyXG4gICAgICAgICAgICAgICAgdmlld3BvcnQgOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogMCxcclxuICAgICAgICAgICAgICAgICAgICB5OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoIDogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGFydGljbGVTdGF0ZVJlc29sdXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQgOigpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhcnRpY2xlU3RhdGVSZXNvbHV0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBkaXRoZXI6IHRydWUgXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRlZmluZXMgOiB7fVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLndpbmRTaGFkZXIgPSBuZXcgcmVzaGFkZXIuTWVzaFNoYWRlcih7XHJcbiAgICAgICAgICAgIHZlcnQ6IHdpbmRWZXJ0LFxyXG4gICAgICAgICAgICBmcmFnOiB3aW5kRnJhZyxcclxuICAgICAgICAgICAgdW5pZm9ybXM6IFtcclxuICAgICAgICAgICAgICAgICd1X3NjcmVlbicsXHJcbiAgICAgICAgICAgICAgICAndV9vcGFjaXR5JyxcclxuICAgICAgICAgICAgICAgICdwcm9qVmlld01hdHJpeCcsXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA6ICdwcm9qVmlld01vZGVsTWF0cml4JyxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ2Z1bmN0aW9uJyxcclxuICAgICAgICAgICAgICAgICAgICBmbiA6IGZ1bmN0aW9uIChjb250ZXh0LCBwcm9wcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWF0NC5tdWx0aXBseShbXSwgcHJvcHNbJ3Byb2pWaWV3TWF0cml4J10sIHByb3BzWydtb2RlbE1hdHJpeCddKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzOiB7IFxyXG4gICAgICAgICAgICAgICAgdmlld3BvcnRcclxuICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRlZmluZXM6IHt9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIF9yZXNvbHZlR0ZTKGdmc0RhdGEpIHtcclxuICAgICAgICBjb25zdCB1RGF0YSA9IGdmc0RhdGFbMF07XHJcbiAgICAgICAgY29uc3QgdkRhdGEgPSBnZnNEYXRhWzFdO1xyXG4gICAgICAgIGNvbnN0IHVNaW4gPSBNYXRoLm1pbi5hcHBseShudWxsLCB1RGF0YS5kYXRhKTtcclxuICAgICAgICBjb25zdCB1TWF4ID0gTWF0aC5tYXguYXBwbHkobnVsbCwgdURhdGEuZGF0YSk7XHJcbiAgICAgICAgY29uc3Qgdk1pbiA9IE1hdGgubWluLmFwcGx5KG51bGwsIHZEYXRhLmRhdGEpO1xyXG4gICAgICAgIGNvbnN0IHZNYXggPSBNYXRoLm1heC5hcHBseShudWxsLCB2RGF0YS5kYXRhKTtcclxuICAgICAgICBjb25zdCB2ZWxvY2l0eURhdGEgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDtpIDwgdURhdGEuZGF0YS5sZW5ndGg7aSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHIgPSBNYXRoLmZsb29yKDI1NSAqICh1RGF0YS5kYXRhW2ldIC0gdU1pbikgLyAodU1heCAtIHVNaW4pKTtcclxuICAgICAgICAgICAgdmVsb2NpdHlEYXRhLnB1c2gocik7XHJcbiAgICAgICAgICAgIGNvbnN0IGcgPSBNYXRoLmZsb29yKDI1NSAqICh2RGF0YS5kYXRhW2ldIC0gdk1pbikgLyAodk1heCAtIHZNaW4pKTtcclxuICAgICAgICAgICAgdmVsb2NpdHlEYXRhLnB1c2goZyk7XHJcbiAgICAgICAgICAgIHZlbG9jaXR5RGF0YS5wdXNoKDApO1xyXG4gICAgICAgICAgICB2ZWxvY2l0eURhdGEucHVzaCgyNTUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBcImRhdGVcIiA6IHVEYXRhLm1ldGEuZGF0ZSxcclxuICAgICAgICAgICAgXCJ3aWR0aFwiOiB1RGF0YS5oZWFkZXIubngsXHJcbiAgICAgICAgICAgIFwiaGVpZ2h0XCI6IHVEYXRhLmhlYWRlci5ueSxcclxuICAgICAgICAgICAgXCJ1TWluXCI6IHVNaW4sXHJcbiAgICAgICAgICAgIFwidU1heFwiOiB1TWF4LFxyXG4gICAgICAgICAgICBcInZNaW5cIjogdk1pbixcclxuICAgICAgICAgICAgXCJ2TWF4XCI6IHZNYXgsXHJcbiAgICAgICAgICAgIFwiZGF0YVwiIDogdmVsb2NpdHlEYXRhXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgX2NyZWF0ZUdMQ29udGV4dChjYW52YXMsIG9wdGlvbnMpIHtcclxuICAgICAgICBjb25zdCBuYW1lcyA9IFsnd2ViZ2wnLCAnZXhwZXJpbWVudGFsLXdlYmdsJ107XHJcbiAgICAgICAgbGV0IGNvbnRleHQgPSBudWxsO1xyXG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWVtcHR5ICovXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KG5hbWVzW2ldLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb250ZXh0O1xyXG4gICAgICAgIC8qIGVzbGludC1lbmFibGUgbm8tZW1wdHkgKi9cclxuICAgIH1cclxuXHJcbiAgICByZXNpemVDYW52YXMoKSB7XHJcbiAgICAgICAgaWYodGhpcy5fYmFja2dyb3VuZFRleHR1cmUgJiYgdGhpcy5fc2NyZWVuVGV4dHVyZSAmJiB0aGlzLl9pc0NhbnZhc1Jlc2l6ZSgpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5jYW52YXMud2lkdGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuY2FudmFzLmhlaWdodDtcclxuICAgICAgICAgICAgY29uc3QgZW1wdHlQaXhlbHMgPSBuZXcgVWludDhBcnJheSh3aWR0aCAqIGhlaWdodCAqIDQpO1xyXG4gICAgICAgICAgICB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSh7XHJcbiAgICAgICAgICAgICAgICB3aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5fc2NyZWVuVGV4dHVyZSh7XHJcbiAgICAgICAgICAgICAgICB3aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgICAgICAgIGRhdGEgOiBlbXB0eVBpeGVsc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5fY2FudmFzV2lkdGggPSB3aWR0aDtcclxuICAgICAgICAgICAgdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdXBlci5yZXNpemVDYW52YXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBfaXNDYW52YXNSZXNpemUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbnZhc1dpZHRoICE9IHRoaXMuY2FudmFzLndpZHRoIHx8IHRoaXMuX2NhbnZhc0hlaWdodCAhPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0RGF0YShkYXRhKSB7XHJcbiAgICAgICAgdGhpcy5fd2luZERhdGEgPSBkYXRhO1xyXG4gICAgICAgIGlmICh0aGlzLnJlZ2wpIHtcclxuICAgICAgICAgICAgdGhpcy5fcHJlcGFyZVdpbmRUZXh0dXJlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldFBhcnRpY2xlc0NvdW50KGNvdW50KSB7XHJcbiAgICAgICAgLy8gd2UgY3JlYXRlIGEgc3F1YXJlIHRleHR1cmUgd2hlcmUgZWFjaCBwaXhlbCB3aWxsIGhvbGQgYSBwYXJ0aWNsZSBwb3NpdGlvbiBlbmNvZGVkIGFzIFJHQkFcclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZXNDb3VudCA9IGNvdW50O1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVQYXJ0aWNsZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQYXJ0aWNsZXNDb3VudCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fcGFydGljbGVzQ291bnQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q29sb3JSYW1wKGNvbG9ycykge1xyXG4gICAgICAgIC8vIGxvb2t1cCB0ZXh0dXJlIGZvciBjb2xvcml6aW5nIHRoZSBwYXJ0aWNsZXMgYWNjb3JkaW5nIHRvIHRoZWlyIHNwZWVkXHJcbiAgICAgICAgdGhpcy5fY29sb3JSYW1wVGV4dHVyZSA9IHRoaXMucmVnbC50ZXh0dXJlKHtcclxuICAgICAgICAgICAgd2lkdGggOiAxNixcclxuICAgICAgICAgICAgaGVpZ2h0IDogMTYsXHJcbiAgICAgICAgICAgIGRhdGEgOiB0aGlzLl9nZXRDb2xvclJhbXAoY29sb3JzKSxcclxuICAgICAgICAgICAgbWFnIDogJ2xpbmVhcicsXHJcbiAgICAgICAgICAgIG1pbiA6ICdsaW5lYXInXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldENvbG9yUmFtcChjb2xvcnMpIHtcclxuICAgICAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgICBjYW52YXMud2lkdGggPSAyNTY7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IDE7XHJcbiAgICAgICAgY29uc3QgZ3JhZGllbnQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQoMCwgMCwgMjU2LCAwKTtcclxuICAgICAgICBmb3IgKGNvbnN0IHN0b3AgaW4gY29sb3JzKSB7XHJcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgrc3RvcCwgY29sb3JzW3N0b3BdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCAyNTYsIDEpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIDI1NiwgMSkuZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFF1YWRTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBwbGFuZSA9IG5ldyByZXNoYWRlci5HZW9tZXRyeSh7XHJcbiAgICAgICAgICAgIGFfcG9zIDogWzAsIDAsIDEsIDAsIDAsIDEsIDAsIDEsIDEsIDAsIDEsIDFdXHJcbiAgICAgICAgfSwgNiwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmUgOiAndHJpYW5nbGUnLFxyXG4gICAgICAgICAgICBwb3NpdGlvbkF0dHJpYnV0ZTogJ2FfcG9zJyxcclxuICAgICAgICAgICAgcG9zaXRpb25TaXplIDogMlxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHBsYW5lTWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHBsYW5lKTtcclxuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyByZXNoYWRlci5TY2VuZShbcGxhbmVNZXNoXSk7XHJcbiAgICAgICAgcmV0dXJuIHNjZW5lO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRQYXJ0aWNsZXNTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZXMgPSBuZXcgcmVzaGFkZXIuR2VvbWV0cnkoe1xyXG4gICAgICAgICAgICBhX2luZGV4IDogdGhpcy5fcGFydGljbGVJbmRpY2VzXHJcbiAgICAgICAgfSwgdGhpcy5fcGFydGljbGVJbmRpY2VzLmxlbmd0aCwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmUgOiAncG9pbnQnLFxyXG4gICAgICAgICAgICBwb3NpdGlvbkF0dHJpYnV0ZTogJ2FfaW5kZXgnLFxyXG4gICAgICAgICAgICBwb3NpdGlvblNpemUgOiAxXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgcGFydGljbGVzTWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHBhcnRpY2xlcyk7XHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3BhcnRpY2xlc01lc2hdKTtcclxuICAgICAgICByZXR1cm4gc2NlbmU7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFdpbmRTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmxheWVyLmdldE1hcCgpO1xyXG4gICAgICAgIGNvbnN0IGV4dGVudCA9IHRoaXMuX2dldE1hcEV4dGVudCgpO1xyXG4gICAgICAgIGNvbnN0IGx0ID0gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBuZXcgbWFwdGFsa3MuQ29vcmRpbmF0ZShbZXh0ZW50LnhtaW4sIGV4dGVudC55bWF4XSkpO1xyXG4gICAgICAgIGNvbnN0IGxiID0gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBuZXcgbWFwdGFsa3MuQ29vcmRpbmF0ZShleHRlbnQueG1pbiwgZXh0ZW50LnltaW4pKTtcclxuICAgICAgICBjb25zdCByYiA9IGNvb3JkaW5hdGVUb1dvcmxkKG1hcCwgbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZXh0ZW50LnhtYXgsIGV4dGVudC55bWluKSk7XHJcbiAgICAgICAgY29uc3QgcnQgPSBjb29yZGluYXRlVG9Xb3JsZChtYXAsIG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKGV4dGVudC54bWF4LCBleHRlbnQueW1heCkpO1xyXG4gICAgICAgIGNvbnN0IHBsYW5lID0gbmV3IHJlc2hhZGVyLkdlb21ldHJ5KHtcclxuICAgICAgICAgICAgYV9wb3M6IFtcclxuICAgICAgICAgICAgICAgIGxiWzBdLCBsYlsxXSwgbGJbMl0sLy/lt6bkuItcclxuICAgICAgICAgICAgICAgIHJiWzBdLCByYlsxXSwgcmJbMl0sLy/lj7PkuItcclxuICAgICAgICAgICAgICAgIGx0WzBdLCBsdFsxXSwgbHRbMl0sLy/lt6bkuIpcclxuICAgICAgICAgICAgICAgIGx0WzBdLCBsdFsxXSwgbHRbMl0sLy/lt6bkuIpcclxuICAgICAgICAgICAgICAgIHJiWzBdLCByYlsxXSwgcmJbMl0sLy/lj7PkuItcclxuICAgICAgICAgICAgICAgIHJ0WzBdLCBydFsxXSwgcnRbMl0vL+WPs+S4ilxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB1diA6IFtcclxuICAgICAgICAgICAgICAgIDAsIDAsXHJcbiAgICAgICAgICAgICAgICAxLCAwLFxyXG4gICAgICAgICAgICAgICAgMCwgMSxcclxuICAgICAgICAgICAgICAgIDAsIDEsXHJcbiAgICAgICAgICAgICAgICAxLCAwLFxyXG4gICAgICAgICAgICAgICAgMSwgMVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSwgNiwgMCwge1xyXG4gICAgICAgICAgICBwcmltaXRpdmU6ICd0cmlhbmdsZScsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uQXR0cmlidXRlOiAnYV9wb3MnLFxyXG4gICAgICAgICAgICBwb3NpdGlvblNpemU6IDNcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCBwbGFuZU1lc2ggPSBuZXcgcmVzaGFkZXIuTWVzaChwbGFuZSk7XHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3BsYW5lTWVzaF0pO1xyXG4gICAgICAgIHJldHVybiBzY2VuZTtcclxuICAgIH1cclxuXHJcbiAgICBfZHJhd1NjcmVlbigpIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmxheWVyLmdldE1hcCgpO1xyXG4gICAgICAgIHRoaXMuX2ZyYW1lYnVmZmVyKHtcclxuICAgICAgICAgICAgY29sb3IgOiB0aGlzLl9zY3JlZW5UZXh0dXJlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5fZHJhd1BhcnRpY2xlcygpO1xyXG4gICAgICAgIGNvbnN0IHF1YWRTY2VuZSA9IHRoaXMuX2dldFF1YWRTY2VuZSgpO1xyXG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKHRoaXMuc2NyZWVuU2hhZGVyLHtcclxuICAgICAgICAgICAgdV9zY3JlZW4gOiB0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSxcclxuICAgICAgICAgICAgdV9vcGFjaXR5IDogdGhpcy5fZmFkZU9wYWNpdHlcclxuICAgICAgICB9LCBxdWFkU2NlbmUsIHRoaXMuX2ZyYW1lYnVmZmVyKTtcclxuICAgICAgICBjb25zdCB3aW5kU2NlbmUgPSB0aGlzLl9nZXRXaW5kU2NlbmUoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLndpbmRTaGFkZXIsIHtcclxuICAgICAgICAgICAgdV9zY3JlZW46IHRoaXMuX3NjcmVlblRleHR1cmUsXHJcbiAgICAgICAgICAgIHVfb3BhY2l0eTogMS4wLFxyXG4gICAgICAgICAgICBwcm9qVmlld01hdHJpeCA6IG1hcC5wcm9qVmlld01hdHJpeFxyXG4gICAgICAgIH0sIHdpbmRTY2VuZSk7XHJcbiAgICAgICAgY29uc3QgdGVtcCA9IHRoaXMuX2JhY2tncm91bmRUZXh0dXJlO1xyXG4gICAgICAgIHRoaXMuX2JhY2tncm91bmRUZXh0dXJlID0gdGhpcy5fc2NyZWVuVGV4dHVyZTtcclxuICAgICAgICB0aGlzLl9zY3JlZW5UZXh0dXJlID0gdGVtcDtcclxuICAgIH1cclxuXHJcbiAgICBfZHJhd1BhcnRpY2xlcygpIHtcclxuICAgICAgICBjb25zdCBleHRlbnQgPSB0aGlzLl9nZXRNYXBFeHRlbnQoKTtcclxuICAgICAgICBjb25zdCBwYXJ0aWNsZVNjZW5lID0gdGhpcy5fZ2V0UGFydGljbGVzU2NlbmUoKTtcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLmRyYXdTaGFkZXIsIHtcclxuICAgICAgICAgICAgZXh0ZW50IDogW2V4dGVudC54bWluLCBleHRlbnQueG1heCwgLWV4dGVudC55bWF4LCAtZXh0ZW50LnltaW5dLFxyXG4gICAgICAgICAgICB1X3dpbmQ6IHRoaXMuX3dpbmRUZXh0dXJlLFxyXG4gICAgICAgICAgICB1X3BhcnRpY2xlczogdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwLFxyXG4gICAgICAgICAgICB1X2NvbG9yX3JhbXA6IHRoaXMuX2NvbG9yUmFtcFRleHR1cmUsXHJcbiAgICAgICAgICAgIHVfcGFydGljbGVzX3JlczogdGhpcy5fcGFydGljbGVTdGF0ZVJlc29sdXRpb24sXHJcbiAgICAgICAgICAgIHVfd2luZF9taW46IFt0aGlzLl93aW5kRGF0YS51TWluLCB0aGlzLl93aW5kRGF0YS52TWluXSxcclxuICAgICAgICAgICAgdV93aW5kX21heDogW3RoaXMuX3dpbmREYXRhLnVNYXgsIHRoaXMuX3dpbmREYXRhLnZNYXhdXHJcbiAgICAgICAgfSwgcGFydGljbGVTY2VuZSwgdGhpcy5fZnJhbWVidWZmZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIF91cGRhdGVQYXJ0aWNsZXMoKSB7XHJcbiAgICAgICAgdGhpcy5fZnJhbWVidWZmZXIoe1xyXG4gICAgICAgICAgICBjb2xvcjogdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUxXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgZXh0ZW50ID0gdGhpcy5fZ2V0TWFwRXh0ZW50KCk7XHJcbiAgICAgICAgY29uc3QgcXVhZFNjZW5lID0gdGhpcy5fZ2V0UXVhZFNjZW5lKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIodGhpcy51cGRhdGVTSGFkZXIsIHtcclxuICAgICAgICAgICAgZXh0ZW50IDogW2V4dGVudC54bWluLCBleHRlbnQueG1heCwgLWV4dGVudC55bWF4LCAtZXh0ZW50LnltaW5dLFxyXG4gICAgICAgICAgICB1X3dpbmQ6IHRoaXMuX3dpbmRUZXh0dXJlLFxyXG4gICAgICAgICAgICB1X3BhcnRpY2xlczogdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUwLFxyXG4gICAgICAgICAgICB1X3JhbmRfc2VlZDogTWF0aC5yYW5kb20oKSxcclxuICAgICAgICAgICAgdV93aW5kX3JlczogW3RoaXMuX3dpbmREYXRhLndpZHRoLCB0aGlzLl93aW5kRGF0YS5oZWlnaHRdLFxyXG4gICAgICAgICAgICB1X3dpbmRfbWluOiBbdGhpcy5fd2luZERhdGEudU1pbiwgdGhpcy5fd2luZERhdGEudk1pbl0sXHJcbiAgICAgICAgICAgIHVfd2luZF9tYXg6IFt0aGlzLl93aW5kRGF0YS51TWF4LCB0aGlzLl93aW5kRGF0YS52TWF4XSxcclxuICAgICAgICAgICAgdV9zcGVlZF9mYWN0b3I6IHRoaXMuX3NwZWVkRmFjdG9yLFxyXG4gICAgICAgICAgICB1X2Ryb3BfcmF0ZTogdGhpcy5fZHJvcFJhdGUsXHJcbiAgICAgICAgICAgIHVfZHJvcF9yYXRlX2J1bXA6IHRoaXMuX2Ryb3BSYXRlQnVtcCxcclxuICAgICAgICB9LCBxdWFkU2NlbmUsIHRoaXMuX2ZyYW1lYnVmZmVyKTtcclxuXHJcbiAgICAgICAgY29uc3QgdGVtcCA9IHRoaXMuX3BhcnRpY2xlU3RhdGVUZXh0dXJlMDtcclxuICAgICAgICB0aGlzLl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTAgPSB0aGlzLl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTE7XHJcbiAgICAgICAgdGhpcy5fcGFydGljbGVTdGF0ZVRleHR1cmUxID0gdGVtcDtcclxuICAgIH1cclxuXHJcbiAgICBfcmVuZGVyV2luZFNjZW5lKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5fc2NyZWVuVGV4dHVyZSB8fCF0aGlzLl9iYWNrZ3JvdW5kVGV4dHVyZSB8fCAhdGhpcy5fd2luZFRleHR1cmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl91cGRhdGVQYXJhbXMoKTtcclxuICAgICAgICB0aGlzLl9kcmF3U2NyZWVuKCk7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlUGFydGljbGVzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgX2dldE1hcEV4dGVudCgpIHtcclxuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmxheWVyLmdldE1hcCgpO1xyXG4gICAgICAgIGNvbnN0IGV4dGVudCA9IG1hcC5nZXRFeHRlbnQoKTtcclxuICAgICAgICBpZiAoZXh0ZW50LnhtYXggPCBleHRlbnQueG1pbikge1xyXG4gICAgICAgICAgICBleHRlbnQueG1heCA9IGV4dGVudC54bWF4ICsgMzYwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZXh0ZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGdldFNwZWVkKGNvb3JkaW5hdGUpIHtcclxuICAgICAgICBpZiAoIXRoaXMucmVnbCB8fCAhdGhpcy5fd2luZERhdGEgfHwgIXRoaXMuX3dpbmREYXRhLndpZHRoKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgdCA9IGNvb3JkaW5hdGUueCAlIDE4MDtcclxuICAgICAgICBjb25zdCBwaXhlbFggPSAoKCB0ICsgMTgwKSAvIDM2MCkgKiB0aGlzLl93aW5kRGF0YS53aWR0aDtcclxuICAgICAgICBpZiAoY29vcmRpbmF0ZS55IDwgLTkwIHx8IGNvb3JkaW5hdGUueSA+IDkwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB5IGZvciBjb29yZGluYXRlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHBpeGVsWSA9ICgoOTAgLSBjb29yZGluYXRlLnkpIC8gMTgwKSAqIHRoaXMuX3dpbmREYXRhLmhlaWdodDtcclxuICAgICAgICBjb25zdCBmcmFtZWJ1ZmZlciA9IHRoaXMucmVnbC5mcmFtZWJ1ZmZlcih7XHJcbiAgICAgICAgICAgIGNvbG9yIDogdGhpcy5fd2luZFRleHR1cmUsXHJcbiAgICAgICAgICAgIHdpZHRoIDogdGhpcy5fd2luZERhdGEud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCA6IHRoaXMuX3dpbmREYXRhLmhlaWdodFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IHRoaXMucmVnbC5yZWFkKHtcclxuICAgICAgICAgICAgeDogcGl4ZWxYLFxyXG4gICAgICAgICAgICB5OiBwaXhlbFksXHJcbiAgICAgICAgICAgIHdpZHRoOiAxLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgICAgICAgIGZyYW1lYnVmZmVyXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgdnggPSBwaXhlbHNbMF0gKiAodGhpcy5fd2luZERhdGEudU1heCAtIHRoaXMuX3dpbmREYXRhLnVNaW4pIC8gMjU1ICsgdGhpcy5fd2luZERhdGEudU1pbjtcclxuICAgICAgICBjb25zdCB2eSA9IHBpeGVsc1sxXSAqICh0aGlzLl93aW5kRGF0YS52TWF4IC0gdGhpcy5fd2luZERhdGEudk1pbikgLyAyNTUgKyB0aGlzLl93aW5kRGF0YS52TWluO1xyXG4gICAgICAgIHJldHVybiBbdngsIHZ5XTtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IFdpbmRMYXllclJlbmRlcmVyO1xyXG5cclxuZnVuY3Rpb24gY29vcmRpbmF0ZVRvV29ybGQobWFwLCBjb29yZGluYXRlLCB6ID0gMCkge1xyXG4gICAgaWYgKCFtYXApIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIGNvbnN0IHAgPSBtYXAuY29vcmRpbmF0ZVRvUG9pbnQoY29vcmRpbmF0ZSwgbWFwLmdldEdMWm9vbSgpKTtcclxuICAgIHJldHVybiBbcC54LCBwLnksIHpdO1xyXG59XHJcbiIsImltcG9ydCAqIGFzIG1hcHRhbGtzIGZyb20gJ21hcHRhbGtzJztcclxuaW1wb3J0IFdpbmRMYXllclJlbmRlcmVyIGZyb20gJy4vV2luZExheWVyUmVuZGVyZXInO1xyXG5cclxuY29uc3QgZGVmYXVsdFJhbXBDb2xvcnMgPSB7XHJcbiAgICAwLjA6ICcjMzI4OGJkJyxcclxuICAgIDAuMTogJyM2NmMyYTUnLFxyXG4gICAgMC4yOiAnI2FiZGRhNCcsXHJcbiAgICAwLjM6ICcjZTZmNTk4JyxcclxuICAgIDAuNDogJyNmZWUwOGInLFxyXG4gICAgMC41OiAnI2ZkYWU2MScsXHJcbiAgICAwLjY6ICcjZjQ2ZDQzJyxcclxuICAgIDEuMDogJyNkNTNlNGYnXHJcbn07XHJcblxyXG5jb25zdCBvcHRpb25zID0ge1xyXG4gICAgJ3JlbmRlcmVyJyA6ICdnbCcsXHJcbiAgICAnY291bnQnIDogMjU2ICogMjU2LFxyXG4gICAgJ2ZhZGVPcGFjaXR5JyA6IDAuOTk2LFxyXG4gICAgJ3NwZWVkRmFjdG9yJyA6IDAuMjUsXHJcbiAgICAnZHJvcFJhdGUnIDogMC4wMDMsXHJcbiAgICAnZHJvcFJhdGVCdW1wJyA6IDAuMDEsXHJcbiAgICAnY29sb3JzJyA6IGRlZmF1bHRSYW1wQ29sb3JzXHJcbn07XHJcblxyXG5leHBvcnQgY2xhc3MgV2luZExheWVyIGV4dGVuZHMgbWFwdGFsa3MuTGF5ZXIge1xyXG4gICAgY29uc3RydWN0b3IoaWQsIG9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihpZCwgb3B0aW9ucyk7XHJcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kYXRhKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0V2luZChvcHRpb25zLmRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXRXaW5kKHdpbmREYXRhKSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbFJlbmRlcmVyTWV0aG9kKCdzZXREYXRhJywgd2luZERhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFBhcnRpY2xlc0NvdW50KGNvdW50KSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbFJlbmRlcmVyTWV0aG9kKCdzZXRQYXJ0aWNsZXNDb3VudCcsIGNvdW50KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQYXJ0aWNsZXNDb3VudCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY2FsbFJlbmRlcmVyTWV0aG9kKCdnZXRQYXJ0aWNsZXNDb3VudCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFJhbXBDb2xvcnMoY29sb3JzKSB7XHJcbiAgICAgICAgdGhpcy5fY2FsbFJlbmRlcmVyTWV0aG9kKCdzZXRDb2xvclJhbXAnLCBjb2xvcnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFdpbmRTcGVlZChjb29yZCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jYWxsUmVuZGVyZXJNZXRob2QoJ2dldFNwZWVkJywgY29vcmQpO1xyXG4gICAgfVxyXG5cclxuICAgIF9jYWxsUmVuZGVyZXJNZXRob2QoZnVuYywgcGFyYW1zKSB7XHJcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLmdldFJlbmRlcmVyKCk7XHJcbiAgICAgICAgaWYgKHJlbmRlcmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZW5kZXJlcltmdW5jXShwYXJhbXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcmVyY3JlYXRlJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlLnJlbmRlcmVyW2Z1bmNdKHBhcmFtcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5XaW5kTGF5ZXIubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xyXG5XaW5kTGF5ZXIucmVnaXN0ZXJKU09OVHlwZSgnV2luZExheWVyJyk7XHJcblxyXG5XaW5kTGF5ZXIucmVnaXN0ZXJSZW5kZXJlcignZ2wnLCBXaW5kTGF5ZXJSZW5kZXJlcik7XHJcbiJdLCJuYW1lcyI6WyJXaW5kTGF5ZXJSZW5kZXJlciIsImxheWVyIiwiX3VwZGF0ZVBhcmFtcyIsIl93aW5kRGF0YSIsImRyYXciLCJwcmVwYXJlQ2FudmFzIiwiX3JlbmRlcldpbmRTY2VuZSIsImRyYXdPbkludGVyYWN0aW5nIiwibmVlZFRvUmVkcmF3IiwiaGl0RGV0ZWN0IiwiY3JlYXRlQ29udGV4dCIsImNhbnZhcyIsImdsIiwid3JhcCIsImF0dHJpYnV0ZXMiLCJvcHRpb25zIiwiZ2xPcHRpb25zIiwiYWxwaGEiLCJkZXB0aCIsInN0ZW5jaWwiLCJfY3JlYXRlR0xDb250ZXh0IiwicmVnbCIsImNyZWF0ZVJFR0wiLCJleHRlbnNpb25zIiwib3B0aW9uYWxFeHRlbnNpb25zIiwiX2luaXRSZW5kZXJlciIsImNsZWFyQ2FudmFzIiwiY2xlYXIiLCJjb2xvciIsIl9wYXJ0aWNsZXNDb3VudCIsImNvdW50IiwiX2ZhZGVPcGFjaXR5IiwiZmFkZU9wYWNpdHkiLCJfc3BlZWRGYWN0b3IiLCJzcGVlZEZhY3RvciIsIl9kcm9wUmF0ZSIsImRyb3BSYXRlIiwiX2Ryb3BSYXRlQnVtcCIsImRyb3BSYXRlQnVtcCIsIl9yYW1wQ29sb3JzIiwiY29sb3JzIiwicmVuZGVyZXIiLCJyZXNoYWRlciIsIlJlbmRlcmVyIiwid2lkdGgiLCJoZWlnaHQiLCJfY2FudmFzV2lkdGgiLCJfY2FudmFzSGVpZ2h0IiwiX3ByZXBhcmVQYXJ0aWNsZXMiLCJfcHJlcGFyZVRleHR1cmUiLCJfcHJlcGFyZVNoYWRlciIsInNldENvbG9yUmFtcCIsIl9mcmFtZWJ1ZmZlciIsImZyYW1lYnVmZmVyIiwidGV4dHVyZSIsImVtcHR5UGl4ZWxzIiwiVWludDhBcnJheSIsIl9iYWNrZ3JvdW5kVGV4dHVyZSIsImRhdGEiLCJfc2NyZWVuVGV4dHVyZSIsIl93aW5kVGV4dHVyZSIsIl9wcmVwYXJlV2luZFRleHR1cmUiLCJtYXB0YWxrcyIsImlzU3RyaW5nIiwiaW5kZXhPZiIsImdldCIsImVyciIsIkVycm9yIiwiX3Jlc29sdmVHRlMiLCJKU09OIiwicGFyc2UiLCJfY3JlYXRlV2luZFRleHR1cmUiLCJpc0dGU09iamVjdCIsImltYWdlIiwiSW1hZ2UiLCJzcmMiLCJvbmxvYWQiLCJmaXJlIiwibWFnIiwibWluIiwiaGVhZGVyIiwicGFydGljbGVSZXMiLCJfcGFydGljbGVTdGF0ZVJlc29sdXRpb24iLCJNYXRoIiwiY2VpbCIsInNxcnQiLCJfbnVtUGFydGljbGVzIiwicGFydGljbGVTdGF0ZSIsImkiLCJsZW5ndGgiLCJmbG9vciIsInJhbmRvbSIsIl9wYXJ0aWNsZVN0YXRlVGV4dHVyZTAiLCJfcGFydGljbGVTdGF0ZVRleHR1cmUxIiwiX3BhcnRpY2xlSW5kaWNlcyIsIkZsb2F0MzJBcnJheSIsInZpZXdwb3J0IiwieCIsInkiLCJkcmF3U2hhZGVyIiwiTWVzaFNoYWRlciIsInZlcnQiLCJkcmF3VmVydCIsImZyYWciLCJkcmF3RnJhZyIsInVuaWZvcm1zIiwiZXh0cmFDb21tYW5kUHJvcHMiLCJkZWZpbmVzIiwic2NyZWVuU2hhZGVyIiwicXVhZFZlcnQiLCJzY3JlZW5GcmFnIiwidXBkYXRlU0hhZGVyIiwidXBkYXRlRnJhZyIsImRpdGhlciIsIndpbmRTaGFkZXIiLCJ3aW5kVmVydCIsIndpbmRGcmFnIiwibmFtZSIsInR5cGUiLCJmbiIsImNvbnRleHQiLCJwcm9wcyIsIm1hdDQiLCJtdWx0aXBseSIsImdmc0RhdGEiLCJ1RGF0YSIsInZEYXRhIiwidU1pbiIsImFwcGx5IiwidU1heCIsIm1heCIsInZNaW4iLCJ2TWF4IiwidmVsb2NpdHlEYXRhIiwiciIsInB1c2giLCJnIiwibWV0YSIsImRhdGUiLCJueCIsIm55IiwibmFtZXMiLCJnZXRDb250ZXh0IiwiZSIsInJlc2l6ZUNhbnZhcyIsIl9pc0NhbnZhc1Jlc2l6ZSIsInNldERhdGEiLCJzZXRQYXJ0aWNsZXNDb3VudCIsImdldFBhcnRpY2xlc0NvdW50IiwiX2NvbG9yUmFtcFRleHR1cmUiLCJfZ2V0Q29sb3JSYW1wIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiY3R4IiwiZ3JhZGllbnQiLCJjcmVhdGVMaW5lYXJHcmFkaWVudCIsInN0b3AiLCJhZGRDb2xvclN0b3AiLCJmaWxsU3R5bGUiLCJmaWxsUmVjdCIsImdldEltYWdlRGF0YSIsIl9nZXRRdWFkU2NlbmUiLCJwbGFuZSIsIkdlb21ldHJ5IiwiYV9wb3MiLCJwcmltaXRpdmUiLCJwb3NpdGlvbkF0dHJpYnV0ZSIsInBvc2l0aW9uU2l6ZSIsInBsYW5lTWVzaCIsIk1lc2giLCJzY2VuZSIsIlNjZW5lIiwiX2dldFBhcnRpY2xlc1NjZW5lIiwicGFydGljbGVzIiwiYV9pbmRleCIsInBhcnRpY2xlc01lc2giLCJfZ2V0V2luZFNjZW5lIiwibWFwIiwiZ2V0TWFwIiwiZXh0ZW50IiwiX2dldE1hcEV4dGVudCIsImx0IiwiY29vcmRpbmF0ZVRvV29ybGQiLCJ4bWluIiwieW1heCIsImxiIiwieW1pbiIsInJiIiwieG1heCIsInJ0IiwidXYiLCJfZHJhd1NjcmVlbiIsIl9kcmF3UGFydGljbGVzIiwicXVhZFNjZW5lIiwicmVuZGVyIiwidV9zY3JlZW4iLCJ1X29wYWNpdHkiLCJ3aW5kU2NlbmUiLCJwcm9qVmlld01hdHJpeCIsInRlbXAiLCJwYXJ0aWNsZVNjZW5lIiwidV93aW5kIiwidV9wYXJ0aWNsZXMiLCJ1X2NvbG9yX3JhbXAiLCJ1X3BhcnRpY2xlc19yZXMiLCJ1X3dpbmRfbWluIiwidV93aW5kX21heCIsIl91cGRhdGVQYXJ0aWNsZXMiLCJ1X3JhbmRfc2VlZCIsInVfd2luZF9yZXMiLCJ1X3NwZWVkX2ZhY3RvciIsInVfZHJvcF9yYXRlIiwidV9kcm9wX3JhdGVfYnVtcCIsImdldEV4dGVudCIsImdldFNwZWVkIiwiY29vcmRpbmF0ZSIsInQiLCJwaXhlbFgiLCJwaXhlbFkiLCJwaXhlbHMiLCJyZWFkIiwidngiLCJ2eSIsIkNhbnZhc1JlbmRlcmVyIiwieiIsInAiLCJjb29yZGluYXRlVG9Qb2ludCIsImdldEdMWm9vbSIsImRlZmF1bHRSYW1wQ29sb3JzIiwiV2luZExheWVyIiwiaWQiLCJzZXRXaW5kIiwid2luZERhdGEiLCJfY2FsbFJlbmRlcmVyTWV0aG9kIiwic2V0UmFtcENvbG9ycyIsImdldFdpbmRTcGVlZCIsImNvb3JkIiwiZnVuYyIsInBhcmFtcyIsImdldFJlbmRlcmVyIiwib24i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
