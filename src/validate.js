// Minimal JSON Schema validator: the subset used by schema/signal.schema.json.
// Supported keywords: type, required, properties, additionalProperties(false), enum, pattern,
// minLength, maxLength, minimum, maximum, items, minItems, format(date-time).
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

export function validate(value, schema, path = "$", errors = []) {
  const t = typeOf(value);
  if (schema.type) {
    const ok = schema.type === "number" ? t === "number" && Number.isFinite(value) : t === schema.type;
    if (!ok) { errors.push(`${path}: expected ${schema.type}, got ${t}`); return errors; }
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: must be one of ${schema.enum.join(", ")}`);
  if (t === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: does not match ${schema.pattern}`);
    if (schema.format === "date-time" && (!DATE_TIME.test(value) || Number.isNaN(Date.parse(value)))) errors.push(`${path}: not an RFC 3339 date-time`);
  }
  if (t === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above ${schema.maximum}`);
  }
  if (t === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.items) value.forEach((v, i) => validate(v, schema.items, `${path}[${i}]`, errors));
  }
  if (t === "object") {
    for (const k of schema.required || []) if (!(k in value)) errors.push(`${path}: missing required "${k}"`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (k in props) validate(v, props[k], `${path}.${k}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}: unknown field "${k}"`);
    }
  }
  return errors;
}

export function parseRecords(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) return JSON.parse(trimmed);
  if (trimmed.startsWith("{") && !trimmed.includes("\n{")) return [JSON.parse(trimmed)];
  return trimmed.split(/\n+/).filter(Boolean).map((l, i) => {
    try { return JSON.parse(l); } catch (e) { throw new Error(`line ${i + 1}: ${e.message}`); }
  });
}
