import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { validate, parseRecords } from "../src/validate.js";

const schema = JSON.parse(readFileSync(new URL("../schema/signal.schema.json", import.meta.url)));
const ok = { signal_id: "a1", type: "hiring", company: { domain: "example.com" }, detected_at: "2026-11-20T09:30:00Z", source: { provider: "p" } };

test("minimal valid record", () => assert.deepEqual(validate(ok, schema), []));
test("missing required fields", () => {
  const e = validate({ signal_id: "a1" }, schema);
  for (const k of ["type", "company", "detected_at", "source"]) assert.ok(e.some((x) => x.includes(`"${k}"`)), k);
});
test("enum, range, date and pattern failures", () => {
  const e = validate({ ...ok, type: "layoffs", confidence: 1.4, detected_at: "2026-13-45T00:00:00Z", company: { domain: "Bad Domain" } }, schema).join("\n");
  assert.match(e, /must be one of/); assert.match(e, /above 1/); assert.match(e, /date-time/); assert.match(e, /does not match/);
});
test("unknown fields rejected", () => assert.match(validate({ ...ok, colour: "red" }, schema).join(), /unknown field "colour"/));
test("empty evidence rejected", () => assert.match(validate({ ...ok, evidence: [] }, schema).join(), /fewer than 1/));
test("parseRecords handles array, object and jsonl", () => {
  assert.equal(parseRecords('[{"a":1},{"a":2}]').length, 2);
  assert.equal(parseRecords('{"a":1}').length, 1);
  assert.equal(parseRecords('{"a":1}\n{"a":2}\n').length, 2);
});
test("CLI: example file passes, invalid file fails", () => {
  const bin = new URL("../bin/gtm-signal-validate.js", import.meta.url).pathname;
  assert.match(execFileSync("node", [bin, new URL("../examples/signals.jsonl", import.meta.url).pathname]).toString(), /2 of 2 records valid/);
  const r = spawnSync("node", [bin, new URL("../examples/invalid.jsonl", import.meta.url).pathname]);
  assert.equal(r.status, 1);
  assert.match(r.stdout.toString(), /0 of 1 records valid/);
});
