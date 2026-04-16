import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const uDir = path.join(root, "u");
const outDir = path.join(root, "src");
const outFile = path.join(outDir, "user-map.js");

if (!fs.existsSync(uDir)) {
  throw new Error('No existe la carpeta "u" en la raíz del repo.');
}

const entries = fs.readdirSync(uDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

const map = {};
const collisions = [];

for (const name of entries) {
  const lower = name.toLowerCase();

  if (map[lower] && map[lower] !== name) {
    collisions.push({
      key: lower,
      existing: map[lower],
      incoming: name
    });
    continue;
  }

  map[lower] = name;
}

if (collisions.length) {
  console.error("Conflictos detectados al normalizar a lowercase:");
  for (const c of collisions) {
    console.error(`- "${c.existing}" y "${c.incoming}" colisionan como "${c.key}"`);
  }
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const fileContents = `export const USER_MAP = ${JSON.stringify(map, null, 2)};\n`;

fs.writeFileSync(outFile, fileContents, "utf8");
console.log(`Generado ${outFile} con ${entries.length} usuarios.`);