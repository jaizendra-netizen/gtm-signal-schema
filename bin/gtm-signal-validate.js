#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, parseRecords } from "../src/validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "..", "schema", "signal.schema.json"), "utf8"));
const file = process.argv[2];
if (!file) {
  console.error("usage: gtm-signal-validate <file.json|file.jsonl>   (one signal, an array, or one per line)");
  process.exit(2);
}
let records;
try { records = parseRecords(readFileSync(file, "utf8")); } catch (e) { console.error("cannot read records: " + e.message); process.exit(2); }
let bad = 0;
records.forEach((r, i) => {
  const errs = validate(r, schema, `record ${i + 1}`);
  if (errs.length) { bad++; errs.forEach((e) => console.log("FAIL " + e)); }
});
console.log(`${records.length - bad} of ${records.length} records valid`);
process.exit(bad ? 1 : 0);
