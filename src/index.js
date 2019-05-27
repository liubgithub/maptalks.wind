import * as maptalks from 'maptalks';
import WindLayerRenderer from './WindLayerRenderer';

const options = {
};

export default class WindLayer extends maptalks.Layer {
    constructor(options) {
        this.options = mergeOptions(options);
        if (options.data) {
            this.updateWind(json);
        }
    }
    
    updateWind(json) {
        const windImage = new Image();
        windData.image = windImage;
        windImage.src = 'wind/' + windFiles[name] + '.png';
        windImage.onload = function () {
            this._setWind(windData);
        };
    }

    _setWind(windData) {
        const renderer = this.getRenderer();
        if (renderer) {
            renderer._setWind(windData);
        } else {
            this.on('renderercreate', () => {
                renderer._setWind(windData);
            });
        }
    }
}

WindLayer.registerJSONType('WindLayer');

WindLayer.registerRenderer('gl', WindLayerRenderer);
