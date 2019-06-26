let container, map;
const windData = {
    height: 180,
    image: 'data/2016112000.png',
    uMax: 26.8,
    uMin: -21.32,
    vMax: 21.42,
    vMin: -21.57,
    width: 360
};
beforeEach(function () {
    container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);
    map = new maptalks.Map(container, {
        center : [0, 0],
        zoom : 5
    });
});

afterEach(function () {
    map.remove();
    maptalks.DomUtil.removeDomNode(container);
});
describe('maptalks wind', function () {
    it('add a windlayer on map', () => {
        const windlayer = new maptalks.WindLayer('wind1', {
            data : windData
        });
        windlayer.addTo(map);
    });

    it('set data for windlayer', () => {
        const windlayer = new maptalks.WindLayer('wind2').addTo(map);
        windlayer.setWind(windData);
    });

    it('set and get count of particles for windlayer', () => {
        const windlayer = new maptalks.WindLayer('wind3', {
            data : windData
        }).addTo(map);
        windlayer.setParticlesCount(128 * 128);
        const count = windlayer.getParticlesCount();
        expect(count).to.be.eql(128 * 128);
    });

    it('get wind speed', () => {
        const center = map.getCenter();
        const windlayer = new maptalks.WindLayer('wind4', {
            data : windData
        });
        windlayer.addTo(map);
        windlayer.on('windtexture-create-debug', () => {
            const speed = windlayer.getWindSpeed(center);
            expect(speed.length).to.be.eql(2);
            done();
        });
    });

    it('show, hide', () => {
        const windlayer = new maptalks.WindLayer('wind5', {
            data : windData
        }).addTo(map);
        windlayer.hide();
        windlayer.show();
    });
});
