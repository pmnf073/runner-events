import assert from "node:assert/strict";
import { test } from "node:test";
import { eventNameKey, namesMatch, parseRobots, readEventPage, slugCandidates, yearInTitle } from "../src/services/portugalRunning.js";

test("eventNameKey ignores editions, years, distances, accents and filler words", () => {
  assert.equal(eventNameKey("6ª Corrida CIMPOR 2026 (25 Out)"), "cimpor corrida");
  assert.equal(eventNameKey("XXXI Corrida do RG3 2026"), "corrida rg3");
  assert.equal(eventNameKey("12ª Corrida da República 2026"), "corrida republica");
  assert.equal(eventNameKey("Corrida do Sporting 2026 (10 km): Data, Guia e Inscrições"), "corrida sporting");
  assert.equal(eventNameKey("Prova - Corrida Porto de Leixões"), "corrida leixoes porto");
  assert.equal(eventNameKey("Corrida Porto de Leixões - Leça da Palmeira"), "corrida leixoes porto");
  assert.equal(eventNameKey("Meia Maratona 21 km de Lisboa"), "lisboa maratona meia");
  assert.equal(eventNameKey("1.ª Corrida Lx Run"), "corrida lx run");
});

test("namesMatch is strict", () => {
  assert.ok(namesMatch("Corrida CIMPOR", "6ª Corrida CIMPOR 2026 (25 Out)"));
  assert.ok(namesMatch("Corrida do RG3", "XXXI Corrida do RG3 2026"));
  assert.ok(!namesMatch("Corrida CIMPOR Alhandra", "6ª Corrida CIMPOR 2026"));
  assert.ok(!namesMatch("Corrida da Mulher Porto", "Corrida da Mulher Lisboa"));
  assert.ok(!namesMatch("Trail", "Trail 2026"));
  assert.ok(!namesMatch("Treino de pista", "Corrida Sporting"));
});

test("slugCandidates follow the site's slugs", () => {
  assert.deepEqual(slugCandidates("Corrida Porto de Leixões 2026"), ["corrida-porto-de-leixoes", "corrida-porto-leixoes"]);
  assert.deepEqual(slugCandidates("Corrida do Sporting"), ["corrida-do-sporting", "corrida-sporting"]);
  assert.deepEqual(slugCandidates("6ª Corrida CIMPOR 2026"), ["corrida-cimpor"]);
  assert.deepEqual(slugCandidates("Trail"), []);
});

test("yearInTitle", () => {
  assert.equal(yearInTitle("Corrida Sporting 2026"), 2026);
  assert.equal(yearInTitle("Corrida Sporting"), null);
});

test("readEventPage reads og:title, h1 and og:image", () => {
  const html = `<html><head>
    <meta property="og:title" content="Corrida do Sporting 2026 (10 km): Data, Guia e Inscri&ccedil;&otilde;es" />
    <meta content="https://www.portugalrunning.com/wp-content/uploads/sporting.jpg" property="og:image">
  </head><body><h1 class="t"><span>Corrida Sporting 2026</span></h1></body></html>`;
  const page = readEventPage(html);
  assert.equal(page.image, "https://www.portugalrunning.com/wp-content/uploads/sporting.jpg");
  assert.equal(page.titles[1], "Corrida Sporting 2026");
  assert.ok(namesMatch(page.titles[0], "Corrida do Sporting"));
});

test("parseRobots keeps only the rules for every user agent", () => {
  const rules = parseRobots(`User-agent: Googlebot
Disallow: /private/

User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow:

User-agent: BadBot
Disallow: /`);
  assert.deepEqual(rules, ["/wp-admin/"]);
});
