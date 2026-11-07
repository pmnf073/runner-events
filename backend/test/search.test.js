import assert from "node:assert/strict";
import { test } from "node:test";
import { eventMatchesSearch, normalizeSearch } from "../src/utils/search.js";

const event = {
  title: "Meia Maratona de São João",
  location: "Vila Franca de Xira",
  description: "Prova de 21 km",
  date: new Date("2026-06-23T23:30:00Z"), // 24/06/2026 00:30 em Lisboa
};

test("normalizeSearch removes accents, case and extra spaces", () => {
  assert.equal(normalizeSearch("  São   JOÃO "), "sao joao");
  assert.equal(normalizeSearch(null), "");
});

test("every word must appear, in any order, across title, location and description", () => {
  assert.equal(eventMatchesSearch(event, "maratona sao"), true);
  assert.equal(eventMatchesSearch(event, "xira meia"), true);
  assert.equal(eventMatchesSearch(event, "21 km"), true);
  assert.equal(eventMatchesSearch(event, "maratona porto"), false);
});

test("matches the Lisbon date as dd/mm/yyyy", () => {
  assert.equal(eventMatchesSearch(event, "24/06"), true);
  assert.equal(eventMatchesSearch(event, "23/06"), false);
});

test("an empty query matches everything and missing fields are ignored", () => {
  assert.equal(eventMatchesSearch(event, "   "), true);
  assert.equal(eventMatchesSearch({ title: "Treino", date: event.date }, "treino"), true);
});
