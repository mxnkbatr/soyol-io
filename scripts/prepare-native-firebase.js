/**
 * Ionic Appflow / CI: create android/app/google-services.json from env secret.
 *
 * Set one of:
 *   GOOGLE_SERVICES_JSON        — full JSON string
 *   GOOGLE_SERVICES_JSON_BASE64 — base64-encoded JSON (recommended for Appflow)
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../android/app/google-services.json');
const EXPECTED_PROJECT = 'soyol-c0a5c';
const EXPECTED_PACKAGE = 'mn.soyol.shop';

function readJsonFromEnv() {
  const raw = process.env.GOOGLE_SERVICES_JSON;
  if (raw?.trim()) return raw.trim();

  const b64 = process.env.GOOGLE_SERVICES_JSON_BASE64;
  if (b64?.trim()) {
    return Buffer.from(b64.trim(), 'base64').toString('utf8');
  }

  return null;
}

function validate(data) {
  const projectId = data?.project_info?.project_id;
  if (projectId !== EXPECTED_PROJECT) {
    throw new Error(
      `Wrong Firebase project "${projectId}". Expected "${EXPECTED_PROJECT}". ` +
        'Download google-services.json from Firebase Console → soyol-c0a5c.',
    );
  }

  const clients = data?.client || [];
  const match = clients.find(
    (c) => c?.client_info?.android_client_info?.package_name === EXPECTED_PACKAGE,
  );
  if (!match) {
    throw new Error(
      `No Android client for package "${EXPECTED_PACKAGE}" in google-services.json.`,
    );
  }
}

function main() {
  if (fs.existsSync(OUT)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      validate(existing);
      console.log(`[prepare-native-firebase] Using existing ${OUT} (${EXPECTED_PROJECT})`);
      return;
    } catch (err) {
      console.warn('[prepare-native-firebase] Existing file invalid, trying env...', err.message);
    }
  }

  const jsonText = readJsonFromEnv();
  if (!jsonText) {
    console.error(
      '[prepare-native-firebase] Missing GOOGLE_SERVICES_JSON or GOOGLE_SERVICES_JSON_BASE64.\n' +
        'Ionic Appflow → Environment → add secret, then run this script before cap sync.',
    );
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    console.error('[prepare-native-firebase] Invalid JSON in GOOGLE_SERVICES_JSON');
    process.exit(1);
  }

  validate(data);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[prepare-native-firebase] Wrote ${OUT} for ${EXPECTED_PROJECT}`);
}

main();
