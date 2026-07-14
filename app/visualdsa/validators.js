const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTION_TYPES = new Set(['select','predict','enter-value','drag','swap','insert','remove','connect','choose-direction','mark-visited','update-boundary','submit-sequence','diagnose-error','explain','move']);

function assertUuid(value, name) {
  if (!UUID.test(String(value || ''))) throw Object.assign(new TypeError(`${name} must be a valid UUID.`), { code: 'INVALID_INPUT' });
  return String(value).toLowerCase();
}
function validateAction(body = {}) {
  const allowed = new Set(['clientEventId','stepNumber','actionType','payload','clientTimestamp']);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw Object.assign(new TypeError('Unknown action property.'), { code: 'INVALID_INPUT' });
  const action = { clientEventId: assertUuid(body.clientEventId, 'clientEventId'), stepNumber: Number(body.stepNumber), actionType: String(body.actionType || ''), payload: body.payload, clientTimestamp: body.clientTimestamp };
  if (!Number.isInteger(action.stepNumber) || action.stepNumber < 0) throw Object.assign(new TypeError('stepNumber must be a non-negative integer.'), { code: 'INVALID_INPUT' });
  if (!ACTION_TYPES.has(action.actionType)) throw Object.assign(new TypeError('Unsupported actionType.'), { code: 'INVALID_INPUT' });
  if (!action.payload || typeof action.payload !== 'object' || Array.isArray(action.payload)) throw Object.assign(new TypeError('payload must be an object.'), { code: 'INVALID_INPUT' });
  if (action.clientTimestamp && Number.isNaN(Date.parse(action.clientTimestamp))) throw Object.assign(new TypeError('clientTimestamp must be valid ISO date-time.'), { code: 'INVALID_INPUT' });
  return Object.freeze(action);
}
module.exports = { ACTION_TYPES, assertUuid, validateAction };
