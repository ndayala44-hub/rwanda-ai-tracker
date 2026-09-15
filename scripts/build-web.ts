/**
 * Assemble the dashboard from its source modules into apps/web/index.html.
 *
 * The frontend is a deliberate no-build single page: no bundler, no transpile,
 * no dependency tree, and it opens from disk with no server. That is worth
 * keeping, but it should not mean editing a 500 KB generated file by hand — so
 * the source lives in apps/web/src/ as ordered modules and this script
 * concatenates them.
 *
 * Module order is the load order and it matters:
 *   shell.html            markup, design tokens, CSS
 *   00 embedded dataset   offline fallback (generated)
 *   01 config             how the data layer is resolved
 *   02 data layer         bindings, applyDataset, loadDataset
 *   03 engine             normalise → aggregate → confidence → maturity
 *   04 api client         the service layer every view calls
 *   05 ui foundation      helpers, charts, drawers, router
 *   06 interactions       year scrubber, cross-filters, command palette
 *   10–16 views           one module per group of pages
 *   99 boot               load → score → render
 *
 *   npm run build:web
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { repoRoot, writeSnapshot, summarise } from "./lib/dataset.js";

const ROOT = repoRoot();
const SRC = join(ROOT, "apps/web/src");
const OUT = join(ROOT, "apps/web/index.html");

// Refresh the generated dataset module first so a build is never stale.
const { dataset, kb } = writeSnapshot(ROOT);
console.log(`dataset  ${summarise(dataset)}  (${kb} KB)`);

const shell = readFileSync(join(SRC, "shell.html"), "utf8");
if (!shell.trimEnd().endsWith("<script>")) {
  throw new Error("apps/web/src/shell.html must end with an opening <script> tag");
}

const modules = readdirSync(SRC)
  .filter(f => f.endsWith(".js"))
  .sort();                         // numeric prefixes define the load order

const body = modules
  .map(f => `\n/* ===== ${f} ===== */\n` + readFileSync(join(SRC, f), "utf8"))
  .join("\n");

/* The dashboard is one inline script — that is what makes it a single portable
   file. A strict CSP forbids inline script *unless* its hash is on the
   allow-list, so the hash is computed here and written into the policy.

   The hash must cover the script's text node EXACTLY as the browser sees it:
   everything between <script> and </script>, including the newline the shell
   file ends with and the one added before the closing tag. Getting this wrong
   by a single character makes the browser block the entire application — a
   blank page and one line in the console. So the document is assembled first,
   the text node is read back out of it, and only then is it hashed. */
const assemble = (policy: string) =>
  policy + body + "\n</script>\n</body>\n</html>\n";

const draft = assemble(shell);
const openTag = draft.indexOf("<script>") + "<script>".length;
const closeTag = draft.lastIndexOf("</script>");
if (openTag < "<script>".length || closeTag < openTag) {
  throw new Error("could not locate the application script in the assembled document");
}
const scriptText = draft.slice(openTag, closeTag);
const scriptHash = "sha256-" + createHash("sha256").update(scriptText, "utf8").digest("base64");

if (!shell.includes("__INLINE_SCRIPT_HASH__")) {
  throw new Error("shell.html is missing the __INLINE_SCRIPT_HASH__ placeholder in its CSP");
}
const html = assemble(shell.replace("__INLINE_SCRIPT_HASH__", `'${scriptHash}'`));
writeFileSync(OUT, html);

/* Verify against the file on disk, the way a browser would read it. The
   placeholder substitution happens in the head and cannot change the script
   text, but asserting that is cheaper than discovering otherwise in a browser. */
const written = readFileSync(OUT, "utf8");
const verified = "sha256-" + createHash("sha256").update(
  written.slice(written.indexOf("<script>") + "<script>".length, written.lastIndexOf("</script>")),
  "utf8").digest("base64");
if (verified !== scriptHash) {
  throw new Error(`CSP hash mismatch: declared ${scriptHash}, actual ${verified}`);
}
console.log(`  csp script hash ${scriptHash} (verified against the written file)`);

console.log("\ndashboard assembled");
modules.forEach(f => console.log(`  + ${f}`));
console.log(`  → apps/web/index.html  ${(html.length / 1024).toFixed(0)} KB`);
