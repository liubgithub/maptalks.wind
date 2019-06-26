import * as maptalks from 'maptalks';
import WindLayerRenderer from './WindLayerRenderer';

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

export default class WindLayer extends maptalks.Layer {
    constructor(id, options) {
        super(id, options);
        if (this.options.data) {
            this.setWind(options.data);
        }
    }

    setWind(windData) {
        this._callRendererMethod('_setData', windData);
    }

    setParticlesCount(count) {
        this._callRendererMethod('_setParticlesCount', count);
    }

    getParticlesCount() {
        return this._callRendererMethod('_getParticlesCount');
    }

    setRampColors(colors) {
        this._callRendererMethod('_setColorRamp', colors);
    }

    getWindSpeed(coord) {
        return this._callRendererMethod('_getSpeed', coord);
    }

    _callRendererMethod(func, params) {
        const renderer = this.getRenderer();
        if (renderer) {
            return renderer[func](params);
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
