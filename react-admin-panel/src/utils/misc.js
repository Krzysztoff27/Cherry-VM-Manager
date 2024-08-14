export const noneOrEmpty = (variable) => !variable || !variable.length;

export const safeObjectValues = (obj = {}) => Object.values(obj);

export default {
    noneOrEmpty,
    safeObjectValues,
}