/**
 * Whether the object is null or undefined.
 * @param  {Object}  obj - object
 * @return {Boolean}
 */
export function isNil(obj) {
    return obj == null;
}


export function defined(obj) {
    return !isNil(obj);
}

export function isEmptyObject(e) {
    let t;
    for (t in e)
        return !1;
    return !0;
}

export function intersectArray(a, b) {
    const bSet = new Set(b);
    return Array.from(new Set(a.filter(v => bSet.has(v))));
}

export function removeFromArray(array, object) {
    const k = array.indexOf(object);
    if (k > -1) {
        array.splice(k, 1);
    }
    return k;
}
