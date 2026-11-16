import { isClaroFebraban, parseClaroFebraban } from "./claro-febraban";
import { parseVivo } from "./vivo";

export function parseInvoice(content: string) {
  return isClaroFebraban(content) ? parseClaroFebraban(content) : parseVivo(content);
}
