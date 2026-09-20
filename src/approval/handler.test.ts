import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSchedule } from "./handler";
import { JsonExample } from "../sources/json-example";
import { writeFileSync, rmSync } from "node:fs";

test("aprovar de madrugada agenda para as 9h do MESMO dia", () => {
  const quando = defaultSchedule(new Date("2026-09-20T02:00:00"));
  assert.equal(new Date(quando).getHours(), 9);
  assert.equal(new Date(quando).getDate(), 20);
});

test("aprovar depois das 9h agenda para o dia seguinte", () => {
  const quando = defaultSchedule(new Date("2026-09-20T14:00:00"));
  assert.equal(new Date(quando).getHours(), 9);
  assert.equal(new Date(quando).getDate(), 21);
});

test("fonte de exemplo lê o file e respeita a quantidade", async () => {
  writeFileSync("/tmp/postgate-teste.json", JSON.stringify([
    { ref: "a", link: "https://e.com/a", image: "https://e.com/a.jpg", text: "um" },
    { ref: "b", link: "https://e.com/b", text: "dois" },
  ]));
  const fonte = new JsonExample("/tmp/postgate-teste.json");
  const d = await fonte.buildDrafts(1);
  assert.equal(d.length, 1);
  assert.equal(d[0]?.sourceRef, "a");
  assert.equal(d[0]?.kind, "feed");
  rmSync("/tmp/postgate-teste.json");
});

test("file ausente não derruba o job: devolve lista vazia", async () => {
  const fonte = new JsonExample("/tmp/nao-existe-postgate.json");
  assert.deepEqual(await fonte.buildDrafts(3), []);
});
