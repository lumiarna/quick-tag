import { readFileSync } from 'node:fs';

const tag = process.argv[2];

if (!tag) {
  console.error('Usage: node scripts/verify-release.mjs <tag>');
  process.exit(1);
}

const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const manifestVersion = JSON.parse(readFileSync('manifest.json', 'utf8')).version;
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));

if (tag !== packageVersion) {
  console.error(`Tag '${tag}' must match package.json version '${packageVersion}' and must not include a 'v' prefix.`);
  process.exit(1);
}

if (packageVersion !== manifestVersion) {
  console.error(`package.json version '${packageVersion}' must match manifest.json version '${manifestVersion}'.`);
  process.exit(1);
}

if (!(tag in versions)) {
  console.error(`versions.json is missing ${tag}`);
  process.exit(1);
}

console.log(`Release metadata verified for ${tag}.`);
