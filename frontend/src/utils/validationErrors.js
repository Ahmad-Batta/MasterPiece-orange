export function getValidationErrors(error, { normalizeField = (field) => field, fallbackMessage, messageForField } = {}) {
  if (error?.response?.status !== 422) return null;

  const errors = error.response.data?.errors || {};
  return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [
    normalizeField(field),
    messageForField ? messageForField(messages, field) : (Array.isArray(messages) ? messages[0] : fallbackMessage),
  ]));
}
