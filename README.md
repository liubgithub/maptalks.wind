# mesh-simplify

## Usage

```mesh-simplify``` is a plugin used to simplifying mesh's vertices writern in javascript. It references to https://threejs.org/examples/?q=simpli#webgl_modifier_simplifier.

### Vanilla Javascript
```html
<script type="text/javascript" src="../mesh-simplify.js"></script>
<script>
var simplify = new Simplify();
var simplifyData = simplify.modify(geometry, 0.4);
</script>
```

### ES6

```javascript
import { Simplify } from 'mesh-simplify';
const simplify = new Simplify();
const simplifyData = simplify.modify(geometry, 0.4);
```

## Supported Browsers

IE 9-11, Chrome, Firefox, other modern and mobile browsers.

## API Reference

### `Constructor`

```javascript
new Simplify({
    lowerLimit : 17,
    mergePrecision : 100000,
    collapseCost : 100000
})
```
* lowerLimit **Number** The least number of vertices will not be simplified
* percentage **Number**  merge precision,
* collapseCost **Number** initial collapse cost

### `modify(geometry, percentage)`

modify the geometry data

```javascript
simplify.modify(geometry, percentage);
```
* geometry **reshader.geometry** an object like this:
```javascript
   {
        "indices"       : [],
        "data" : {
            "POSITION"   : [],
            "NORMAL"     : [],
            "TEXCOORD"   : []
        }
   }
```
* percentage **Number** a number between 0 an 1.0, which indicates how many vertices will be simplified

**Returns** `Object`
* The return value is an Object which contains 'POSITION','NORMAL','TEXCOORD_0' and 'indices'
