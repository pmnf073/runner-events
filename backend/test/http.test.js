import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidNif, toCents } from "../src/utils/http.js";

test("NIF check digit", () => {
  assert.equal(isValidNif("123456789"), true);
  assert.equal(isValidNif("501964843"), true);
  assert.equal(isValidNif("123456780"), false);
  assert.equal(isValidNif("12345678"), false);
});

test("money rounds to cents", () => {
  assert.equal(toCents(0.1 + 0.2), 0.3);
  assert.equal(toCents("12.345"), 12.35);
  assert.equal(toCents(null), 0);
});
