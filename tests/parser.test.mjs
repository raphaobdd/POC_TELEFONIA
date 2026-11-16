import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVivo } from "../src/lib/parsers/vivo.ts";

test("classifica registros e preserva todas as linhas, inclusive vazias internas", () => {
  const invoice = parseVivo("010D0001\r\n110D00001234\r\n\r\n999Doutro\r\n162D000005\r\n");
  assert.equal(invoice.operator, "Vivo / Telefônica");
  assert.equal(invoice.records.length, 5);
  assert.deepEqual(invoice.records.map((record) => record.line), [1, 2, 3, 4, 5]);
  assert.equal(invoice.records[1].raw, "110D00001234");
  assert.equal(invoice.records[2].raw, "");
  assert.equal(invoice.records[3].type, "Não reconhecido");
  assert.equal(invoice.unknownCount, 2);
});

test("não inventa valores financeiros ou telefone sem layout confirmado", () => {
  const invoice = parseVivo("010D0000012345\n110D00009999999");
  assert.equal(invoice.totalCents, null);
  assert.equal(invoice.lineCount, null);
});

test("não atribui operadora a arquivo sem códigos conhecidos", () => {
  assert.equal(parseVivo("qualquer conteúdo").operator, "Não identificada");
});
