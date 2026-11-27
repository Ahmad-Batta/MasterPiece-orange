export function getApiData(response) {
  return response?.data?.data ?? {};
}

export function getApiItems(payload, keys = ['items', 'data']) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Array.isArray(payload) ? payload : [];
}
