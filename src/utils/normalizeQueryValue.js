export function getQueryValue(query, key) {
    const result = query[key];
    const value = [result].flat()[0] ?? '';

    return [key, value];
}