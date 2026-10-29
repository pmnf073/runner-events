import assert from "node:assert/strict";
import { test } from "node:test";
import { eventNameKey, namesMatch, pageMatches, parseRobots, readEventPage, robotsAllows, slugCandidates, yearInTitle } from "../src/services/portugalRunning.js";

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
  assert.ok(namesMatch("Sintra Trail – Cruz Alta 2026 (1 Nov) – Guia e Percursos", "Sintra Trail Cruz Alta"));
  assert.ok(!namesMatch("Sintra Trail – Monte da Lua 2026 – Guia", "Sintra Trail Cruz Alta"));
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
  assert.deepEqual(rules, [
    { allow: false, path: "/wp-admin/" },
    { allow: true, path: "/wp-admin/admin-ajax.php" },
  ]);
});

// The "User-agent: *" group of www.portugalrunning.com/robots.txt (2026-10-29).
test("robotsAllows handles wildcards, Allow and the longest match", () => {
  const rules = parseRobots(`User-agent: *
Allow: /wp-admin/admin-ajax.php
Allow: /wp-includes/*.js
Allow: /wp-content/uploads/
Disallow: /wp-admin/
Disallow: /?s=
Disallow: /*/*?replytocom=`);
  assert.ok(robotsAllows(rules, "/eventos/corrida-cimpor/"));
  assert.ok(robotsAllows(rules, "/wp-json/wp/v2/search?per_page=10&search=cimpor%20corrida"));
  assert.ok(robotsAllows(rules, "/wp-admin/admin-ajax.php"));
  assert.ok(!robotsAllows(rules, "/wp-admin/options.php"));
  assert.ok(!robotsAllows(rules, "/?s=corrida"));
  assert.ok(!robotsAllows(rules, "/eventos/x/?replytocom=1"));
  assert.ok(!robotsAllows(parseRobots("User-agent: *\nDisallow: /eventos/*.php$"), "/eventos/a.php"));
  assert.ok(robotsAllows(parseRobots("User-agent: *\nDisallow: /eventos/*.php$"), "/eventos/a.php?x"));
});

// Past editions keep the year-less slug and an old poster, often with no year in
// the title; the EventON date block (data-syr) gives the edition year.
test("pageMatches rejects a past edition by its date year", () => {
  const html = (year) => `<meta property="og:title" content="São Silvestre de Almada: Data, Inscrições e Percurso | Portugal Running" />
    <meta property="og:image" content="https://www.portugalrunning.com/wp-content/uploads/2019/12/almada.png" />
    <span class='evoet_dayblock evcal_cblock ' data-smon='dezembro' data-syr='${year}'>`;
  const old = readEventPage(html(2019));
  assert.equal(old.year, 2019);
  assert.ok(!pageMatches(old, "São Silvestre de Almada", 2026));
  assert.ok(pageMatches(readEventPage(html(2026)), "São Silvestre de Almada", 2026));
  const noYear = readEventPage(`<meta property="og:title" content="Corrida Sporting 2025" /><meta property="og:image" content="x.jpg" />`);
  assert.ok(!pageMatches(noYear, "Corrida Sporting", 2026));
  assert.ok(pageMatches(noYear, "Corrida Sporting", 2025));
});
