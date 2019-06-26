# maptalks.wind
[![NPM Version](https://img.shields.io/npm/v/maptalks.wind.svg)](https://github.com/maptalks/maptalks.snapto)
## Usage

```maptalks.wind``` is a maptalks layer used to rendering the globle wind data which get from the US National Weather Service publishes weather data for the whole globe, known as GFS. This project is heavily inspired by the work of https://github.com/mapbox/webgl-wind.

![screenshot](https://user-images.githubusercontent.com/5208386/60158728-4bd4e980-9824-11e9-93dd-1d20c99f32ee.png)

## Examples

* A windlayer for the whole globe at 2016-11-20T00:00Z [demo](https://liubgithub.github.io/maptalks.wind/demo/). (data from [US National Weather Service](http://nomads.ncep.noaa.gov)).

## Install
  
* Install with npm: ```npm install maptalks.wind```. 
* Download from [dist directory](https://github.com/liubgithub/maptalks.wind/dist).
* Use unpkg CDN: ```https://unpkg.com/maptalks.wind/dist/maptalks.wind.min.js```

### Vanilla Javascript
```html
<script type="text/javascript" src="../maptalks.wind.js"></script>
<script>
var map = new maptalks.Map({});

var windData = {
    date: "2016-11-20T00:00Z",
    height: 180,
    image: '2016112000.png',
    source: "http://nomads.ncep.noaa.gov",
    uMax: 26.8,
    uMin: -21.32,
    vMax: 21.42,
    vMin: -21.57,
    width: 360
};
var windlayer = new maptalks.WindLayer('wind', {
    data : windData
}).addTo(map);
</script>
```

### ES6

```javascript
import { WindLayer } from 'maptalks.wind';

const windData = {
    date: "2016-11-20T00:00Z",
    height: 180,
    image: '2016112000.png',
    source: "http://nomads.ncep.noaa.gov",
    uMax: 26.8,
    uMin: -21.32,
    vMax: 21.42,
    vMin: -21.57,
    width: 360
};
const windlayer = new WindLayer('wind', {
    data : windData
});

```

## Supported Browsers

IE 9-11, Chrome, Firefox, other modern and mobile browsers.

## API Reference

### `Constructor`

```WindLayer``` is a subclass of [maptalks.Layer](https://maptalks.github.io/maptalks.js/api/0.x/Layer.html) and inherits all the methods of its parent.

```javascript
new maptalks.WindLayer(id, options)
```
* id **String** layer id
* options **Object** options
    * count **Number**  count of the particles (256 * 256 by default) 
    * fadeOpacity **Number**  how fast the particle trails fade on each frame(0.996 by default)
    * speedFactor **Number**  how fast the particles move(0.25 by default)
    * dropRate **Number**   how often the particles move to a random place(0.003 by default)
    * dropRateBump **Number** drop rate increase relative to individual particle speed (0.01 by default)
    * colors  **Object** the color of the particles, it's usually a ramp color
    * data **Object** the wind data, including lookup image, max wind velocity and min wind velocity

### `setWind(data)`

set the wind data for windlayer

```javascript
windlayer.setWind(data);
```
* data **Object**. It's an object like this:
```javascript
   {
        height: 180,
        image: '2016112000.png',
        uMax: 26.8,
        uMin: -21.32,
        vMax: 21.42,
        vMin: -21.57,
        width: 360
    }
```
### `setParticlesCount(count)`

set the count for particles
```javascript
windlayer.setParticlesCount(count);
```
* count **Number** the count of the particles in layer
### `getParticlesCount()`

get the count of particles for windlayer
```javascript
windlayer.getParticlesCount();
```
**Returns** `Number`
* The count of particles.

### `setRampColors(colors)`

set the ramp color for rendering particles
```javascript
windlayer.setRampColors(colors);
```
* colors **Object** a ramp color object, the structure like this:
```javascript
    {
        0.0: '#3288bd',
        0.1: '#66c2a5',
        0.2: '#abdda4',
        0.3: '#e6f598',
        0.4: '#fee08b',
        0.5: '#fdae61',
        0.6: '#f46d43',
        1.0: '#d53e4f'
    }
```
### `getWindSpeed(coordinate)`
get the wind speed on specified location
```javascript
windlayer.getWindSpeed(coordinate);
```
* coordinate **maptalks.Coordinate**

**Returns** `Array`
* The return value is a length of 2 Array which contains horizontal speed and vertical speed. The negative and positive of the value represent the direction of wind.

## Develop
It is written in ES6, transpiled by [babel](https://babeljs.io/) and tested with [mocha](https://mochajs.org) and [expect.js](https://github.com/Automattic/expect.js).
* Install dependencies
```shell
$ npm install
```
* dev
```shell
$ npm run dev
```
* build
```shell
$ npm run build
```
* test
```shell
$ npm run test
```
