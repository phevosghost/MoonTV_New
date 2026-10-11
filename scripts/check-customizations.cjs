const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const baseline = JSON.parse(
  fs.readFileSync(path.join(root, 'customization-baseline.json'), 'utf8')
);
for (const [file, expected] of Object.entries(baseline.protectedFiles)) {
  const actual = createHash('sha256')
    .update(fs.readFileSync(path.join(root, file)))
    .digest('hex');
  assert.equal(actual, expected, `Protected file changed: ${file}`);
}
const config = JSON.parse(
  fs.readFileSync(path.join(root, 'config.json'), 'utf8')
);
assert.equal(
  Object.keys(config.api_site).length,
  baseline.sourceCount,
  'Source count changed'
);
for (const [key, source] of Object.entries(config.api_site)) {
  assert.ok(source.name, `Missing source name: ${key}`);
  assert.ok(
    ['https:', 'http:'].includes(new URL(source.api).protocol),
    `Invalid source URL: ${key}`
  );
}
const login = fs.readFileSync(
  path.join(root, 'src/app/api/login/route.ts'),
  'utf8'
);
assert.ok(
  login.includes('process.env.PASSWORD'),
  'The existing PASSWORD variable must remain supported'
);
assert.ok(
  !login.includes('process.env.NEXT_PUBLIC_PASSWORD'),
  'The password must not become a public variable'
);
for (const file of baseline.protectedSyncFiles) {
  assert.ok(
    fs.existsSync(path.join(root, file)),
    `Missing sync safeguard: ${file}`
  );
}
console.log(
  `Customization checks passed: ${baseline.sourceCount} sources, unchanged artwork and PASSWORD variable.`
);
