import * as maptalks from 'maptalks';
import WindLayerRenderer from './WindLayerRenderer';

const options = {
    'renderer' : 'gl'
};

export default class WindLayer extends maptalks.Layer {
    constructor(id, options) {
        super(id, options);
        if (this.options.data) {
            this.setWind(options.data);
        }
    }

    setWind(windData) {
        const renderer = this.getRenderer();
        if (renderer) {
            renderer._setData(windData);
        } else {
            this.on('renderercreate', (e) => {
                e.renderer._setData(windData);
            });
        }
    }
}
WindLayer.mergeOptions(options);
WindLayer.registerJSONType('WindLayer');

WindLayer.registerRenderer('gl', WindLayerRenderer);
