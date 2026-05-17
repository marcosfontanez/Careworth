/**
 * One-off migration helper: apply Tailwind v4 canonical class forms (ESLint suggestCanonicalClasses).
 * Run: node scripts/fix-tailwind-canonical-classes.mjs
 */
import fs from "node:fs";
import path from "node:path";

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|jsx|js|mjs)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function transform(s) {
  /** @type {[RegExp, string][]} */
  const reps = [
    [/text-\[var\(--accent\)\]\/90/g, "text-(--accent)/90"],
    [/bg-\[var\(--accent\)\]\/\[0\.10\]/g, "bg-(--accent)/10"],
    [/to-\[var\(--accent\)\]\/40/g, "to-(--accent)/40"],
    [/via-\[var\(--accent\)\]\/55/g, "via-(--accent)/55"],
    [/via-\[var\(--accent\)\]\/80/g, "via-(--accent)/80"],
    [/from-\[var\(--accent\)\]\/10/g, "from-(--accent)/10"],
    [/hover:border-\[var\(--accent\)\]\/40/g, "hover:border-(--accent)/40"],
    [/border-\[var\(--accent\)\]\/30/g, "border-(--accent)/30"],
    [/bg-\[var\(--accent\)\]/g, "bg-accent"],
    [/from-\[var\(--accent\)\]/g, "from-accent"],
    [/to-\[var\(--accent\)\]/g, "to-accent"],

    [/bg-gradient-to-br/g, "bg-linear-to-br"],
    [/bg-gradient-to-tr/g, "bg-linear-to-tr"],
    [/bg-gradient-to-r/g, "bg-linear-to-r"],
    [/bg-gradient-to-l/g, "bg-linear-to-l"],
    [/bg-gradient-to-b/g, "bg-linear-to-b"],
    [/bg-gradient-to-t/g, "bg-linear-to-t"],

    [/hover:bg-white\/\[0\.07\]/g, "hover:bg-white/7"],
    [/hover:bg-white\/\[0\.06\]/g, "hover:bg-white/6"],
    [/hover:bg-white\/\[0\.05\]/g, "hover:bg-white/5"],
    [/hover:bg-white\/\[0\.04\]/g, "hover:bg-white/4"],

    [/bg-white\/\[0\.07\]/g, "bg-white/7"],
    [/bg-white\/\[0\.06\]/g, "bg-white/6"],
    [/bg-white\/\[0\.05\]/g, "bg-white/5"],
    [/bg-white\/\[0\.04\]/g, "bg-white/4"],
    [/bg-white\/\[0\.03\]/g, "bg-white/3"],
    [/bg-white\/\[0\.02\]/g, "bg-white/2"],

    [/ring-white\/\[0\.07\]/g, "ring-white/7"],
    [/ring-white\/\[0\.06\]/g, "ring-white/6"],
    [/ring-white\/\[0\.05\]/g, "ring-white/5"],
    [/ring-white\/\[0\.04\]/g, "ring-white/4"],
    [/ring-white\/\[0\.03\]/g, "ring-white/3"],

    [/bg-primary\/\[0\.12\]/g, "bg-primary/12"],
    [/bg-primary\/\[0\.10\]/g, "bg-primary/10"],
    [/bg-primary\/\[0\.07\]/g, "bg-primary/7"],
    [/from-primary\/\[0\.12\]/g, "from-primary/12"],
    [/to-primary\/\[0\.12\]/g, "to-primary/12"],
    [/via-primary\/\[0\.12\]/g, "via-primary/12"],
    [/from-primary\/\[0\.20\]/g, "from-primary/20"],
    [/to-primary\/\[0\.20\]/g, "to-primary/20"],
    [/via-primary\/\[0\.20\]/g, "via-primary/20"],
    [/primary\/\[0\.06\]/g, "primary/6"],

    [/h-\[100%\]/g, "h-full"],
    [/-z-\[3\]/g, "z-[-3]"],
    [/-z-\[5\]/g, "z-[-5]"],
    [/!pt-0/g, "pt-0!"],
    [/!py-0/g, "py-0!"],
    [/min-w-\[12rem\]/g, "min-w-48"],
    [/aspect-\[4\/3\]/g, "aspect-4/3"],
    [/aspect-\[16\/10\]/g, "aspect-16/10"],
  ];

  let n = s;
  for (const [re, rep] of reps) n = n.replace(re, rep);
  return n;
}

const root = path.join(process.cwd(), "src");
let changed = 0;
for (const f of walk(root)) {
  const raw = fs.readFileSync(f, "utf8");
  const next = transform(raw);
  if (next !== raw) {
    fs.writeFileSync(f, next);
    changed++;
    console.log(f);
  }
}
console.log(`Updated ${changed} files.`);
