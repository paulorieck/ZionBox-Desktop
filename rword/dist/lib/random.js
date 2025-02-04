"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
class Random {
    /**
     * Generate a random number between `0` (inclusive) and `1` (exclusive). A
     *  drop in replacement for `Math.random()`
     */
    static value() {
        return this.intToFloat(parseInt(crypto.randomBytes(8).toString('hex'), 16));
    }
    /**
     * Generate a random number between `min` (inclusive) and `max` (exclusive).
     */
    static range(min, max) {
        return Math.floor(this.value() * (max - min) + min);
    }
    /** Transform an integer to a floating point number. */
    static intToFloat(integer) {
        return integer / Math.pow(2, 64);
    }
}
exports.Random = Random;
//# sourceMappingURL=random.js.map