/**
 * A small JSON Schema (2020-12) checker for the keywords the `schema/*.json` files use:
 * type, enum, const, required, properties, additionalProperties, propertyNames, items,
 * minItems, uniqueItems, contains/minContains/maxContains, minLength, pattern, and local `$ref`.
 * Any other keyword throws, so a schema edit that needs more fails loudly instead of passing.
 */

export type JsonSchema = { readonly [keyword: string]: unknown };

const ANNOTATIONS = new Set(["$schema", "$id", "$defs", "title", "description"]);
const KEYWORDS = new Set([
  "type",
  "enum",
  "const",
  "required",
  "properties",
  "additionalProperties",
  "propertyNames",
  "items",
  "minItems",
  "uniqueItems",
  "contains",
  "minContains",
  "maxContains",
  "minLength",
  "pattern",
  "$ref",
]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  const actual = typeOf(value);
  return actual === type || (type === "number" && actual === "integer");
}

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function resolveRef(root: JsonSchema, ref: string): JsonSchema {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  let node: unknown = root;
  for (const part of ref.slice(2).split("/")) {
    node = isObject(node) ? node[part.replace(/~1/g, "/").replace(/~0/g, "~")] : undefined;
  }
  if (!isObject(node)) throw new Error(`unresolved $ref ${ref}`);
  return node;
}

function check(root: JsonSchema, schema: JsonSchema, value: unknown, at: string, errors: string[]): void {
  for (const keyword of Object.keys(schema)) {
    if (!KEYWORDS.has(keyword) && !ANNOTATIONS.has(keyword)) throw new Error(`unsupported schema keyword ${keyword} at ${at}`);
  }
  const where = at || "/";
  if (typeof schema.$ref === "string") check(root, resolveRef(root, schema.$ref), value, at, errors);
  if (typeof schema.type === "string" && !matchesType(value, schema.type)) {
    errors.push(`${where}: expected ${schema.type}, got ${typeOf(value)}`);
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((option) => equal(option, value))) {
    errors.push(`${where}: ${JSON.stringify(value)} is not one of ${schema.enum.map((o) => JSON.stringify(o)).join(", ")}`);
  }
  if ("const" in schema && !equal(schema.const, value)) {
    errors.push(`${where}: expected ${JSON.stringify(schema.const)}`);
  }
  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && [...value].length < schema.minLength) {
      errors.push(`${where}: shorter than ${schema.minLength}`);
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) {
      errors.push(`${where}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`${where}: fewer than ${schema.minItems} items`);
    }
    if (schema.uniqueItems === true && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) {
      errors.push(`${where}: items are not unique`);
    }
    if (isObject(schema.items)) {
      value.forEach((item, index) => check(root, schema.items as JsonSchema, item, `${at}/${index}`, errors));
    }
    if (isObject(schema.contains)) {
      const hits = value.filter((item) => {
        const inner: string[] = [];
        check(root, schema.contains as JsonSchema, item, at, inner);
        return inner.length === 0;
      }).length;
      const min = typeof schema.minContains === "number" ? schema.minContains : 1;
      if (hits < min) errors.push(`${where}: ${hits} items match "contains", expected at least ${min}`);
      if (typeof schema.maxContains === "number" && hits > schema.maxContains) {
        errors.push(`${where}: ${hits} items match "contains", expected at most ${schema.maxContains}`);
      }
    }
  }
  if (isObject(value)) {
    const properties = isObject(schema.properties) ? schema.properties : {};
    if (Array.isArray(schema.required)) {
      for (const name of schema.required as string[]) if (!(name in value)) errors.push(`${where}: missing ${name}`);
    }
    for (const [name, child] of Object.entries(value)) {
      const path = `${at}/${name}`;
      if (isObject(schema.propertyNames)) {
        check(root, schema.propertyNames as JsonSchema, name, `${path} (name)`, errors);
      }
      if (isObject(properties[name])) {
        check(root, properties[name] as JsonSchema, child, path, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${where}: unexpected property ${name}`);
      } else if (isObject(schema.additionalProperties)) {
        check(root, schema.additionalProperties as JsonSchema, child, path, errors);
      }
    }
  }
}

/** Every way `value` breaks `schema`, as `"/json/pointer: reason"`. Empty when it is valid. */
export function validateJson(schema: JsonSchema, value: unknown): string[] {
  const errors: string[] = [];
  check(schema, schema, value, "", errors);
  return errors;
}
