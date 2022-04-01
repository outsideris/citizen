import semver from 'semver';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { citizen } = JSON.parse(fs.readFileSync(join(__dirname, '..', 'package.json')));

export const TERRAFORM_VERSIONS = citizen.terraformVersions.map((version) => ({
  release: `${semver.parse(version).major}.${semver.parse(version).minor}`,
  version,
}));
