import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { publicOnlyLookup } from "../src/services/imageExtractor.js";

const lookup = (hostname, options) =>
  new Promise((resolve, reject) => publicOnlyLookup(hostname, options, (err, ...rest) => (err ? reject(err) : resolve(rest))));

test("publicOnlyLookup answers in the shape Node asks for", async () => {
  assert.deepEqual(await lookup("8.8.8.8", { all: true }), [[{ address: "8.8.8.8", family: 4 }]]);
  assert.deepEqual(await lookup("8.8.8.8", {}), ["8.8.8.8", 4]);
  await assert.rejects(lookup("127.0.0.1", { all: true }), /não permitido/);
  await assert.rejects(lookup("10.1.2.3", {}), /não permitido/);
});

// Node's own http client calls the lookup with `all: true`; a private address
// must be refused with our error, not "Invalid IP address: undefined".
test("http.get with publicOnlyLookup", async () => {
  const error = await new Promise((resolve) => {
    http.get("http://localhost:9/", { lookup: publicOnlyLookup }, () => resolve(null)).on("error", resolve);
  });
  assert.match(error.message, /não permitido/);
});
