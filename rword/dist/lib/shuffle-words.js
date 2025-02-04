"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const random_1 = require("./random");
/**
 * Shuffle the words array in place.
 * @param words - The words array to shuffle.
 */
function shuffleWords(words) {
    let i = 0;
    let j = 0;
    let temp = '';
    for (i = words.length - 1; i > 0; i -= 1) {
        j = random_1.Random.range(0, i + 1);
        temp = words[i];
        words[i] = words[j];
        words[j] = temp;
    }
}
exports.shuffleWords = shuffleWords;
//# sourceMappingURL=shuffle-words.js.map