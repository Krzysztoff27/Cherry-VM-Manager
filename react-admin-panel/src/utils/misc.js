export const isObject = (variable) => typeof variable === 'object' && variable !== null && !Array.isArray(variable)

export const noneOrEmpty = (variable) => !variable || !variable.length;

export const zipToObject = (keyArray = [], valueArray = []) => noneOrEmpty(keyArray) || noneOrEmpty(valueArray) ? {} :
    keyArray.reduce((acc, key, i) => ({...acc, [key]: valueArray[i]}), {});

export const safeObjectValues = (obj = {}) => Object.values({...obj});

export const arrayIntoChunks = (array, chunkSize) => {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
};

export const pluralize = (count, singular, pluralFew, pluralMany) => {
    if (count === 1) return singular;
    if ((count % 10 >= 2 && count % 10 <= 4) && !(count % 100 >= 12 && count % 100 <= 14)) {
        return pluralFew;
    }
    return pluralMany;
};

export const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
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

export default {
    isObject,
    noneOrEmpty,
    safeObjectValues,
    pluralize,
    arrayIntoChunks,
    getCurrentTime,
    clockSynchronizedTimeout,
}