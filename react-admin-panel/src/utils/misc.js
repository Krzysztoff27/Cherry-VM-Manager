/**
 * Checks if variable is type "Object".
 * @param {*} variable 
 * @returns {boolean}
 */
export const isObject = (variable) => typeof variable === 'object' && variable !== null && !Array.isArray(variable)

/**
 * Checks if variable is falsy or if it's length is 0
 * @param {*} variable 
 * @returns {boolean}
 */
export const noneOrEmpty = (variable) => !variable || !variable.length;

/**
 * Zips keys from keyArray and values from valueArray into one object
 * @param {Array} keyArray 
 * @param {Array} valueArray 
 * @returns {Object} ZippedObject
 */
export const zipToObject = (keyArray = [], valueArray = []) => noneOrEmpty(keyArray) || noneOrEmpty(valueArray) ? {} :
    keyArray.reduce((acc, key, i) => ({...acc, [key]: valueArray[i]}), {});

/**
 * Provides errorless Object.values experience
 * @param {Object} object
 * @returns {Array} array of values
 */
export const safeObjectValues = (obj = {}) => Object.values({...obj});

/**
 * Splits array into chunks
 * @param {Array} array - flat array
 * @param {Number} chunkSize - max number of elements in one chunk
 * @returns {Array} array of chunk arrays
 */
export const arrayIntoChunks = (array, chunkSize) => {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
};

/**
 * Returns string of current clock time.
 * @param {boolean} showSeconds - should seconds be also included in the returned value?
 * @returns {string} current clock time
 */
export const getCurrentTime = (showSeconds = true) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}${showSeconds ? `:${seconds}` : ''}`;
}

/**
 * setTimeout synchronized with real clock
 * @param {Function} func function to be called
 * @param {Number} secondsDelay delay in seconds
 * @returns clear timeout function
 */
export const clockSynchronizedTimeout = (func = () => {}, secondsDelay = 1) => {
    let timeout;
    const getDelay = () => 1000 * secondsDelay - new Date().getMilliseconds();;
    const syncLoadState = () => {
        func();
        timeout = setTimeout(syncLoadState, getDelay());
    };
    timeout = setTimeout(syncLoadState, getDelay());

    return () => clearTimeout(timeout);
}

export const isInRange = (value, min, max) => value >= min && value <= max;

export const startsWithLetter = (str = '') => str ? /[a-z]/i.test(str[0]) : false;

export default {
    isObject,
    noneOrEmpty,
    safeObjectValues,
    arrayIntoChunks,
    getCurrentTime,
    clockSynchronizedTimeout,
    isInRange,
    startsWithLetter,
}