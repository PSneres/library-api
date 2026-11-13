export function safeNumber(num, range) {
    return Math.floor(Math.min(Math.max(num, range[0]), range[1]));
}