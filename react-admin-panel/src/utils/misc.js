export const noneOrEmpty = (variable) => !variable || !variable.length;

export const safeObjectValues = (obj = {}) => Object.values({...obj});

export const pluralize = (count, singular, pluralFew, pluralMany) => {
    if (count === 1) return singular;
    if ((count % 10 >= 2 && count % 10 <= 4) && !(count % 100 >= 12 && count % 100 <= 14)) {
        return pluralFew;
    }
    return pluralMany;
};

export default {
    noneOrEmpty,
    safeObjectValues,
    pluralize,
}