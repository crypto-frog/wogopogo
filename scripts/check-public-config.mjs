import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDirectory, '..')
const failures = []

function read(relativePath) {
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function field(source, key) {
  const match = source.match(new RegExp(`['"]${key}['"]\\s*=>\\s*['"]([^'"]*)['"]`))
  return match?.[1] ?? null
}

const expectedConfig = {
  db_driver: 'sqlite',
  host: 'localhost',
  name: 'your_cpanel_database',
  user: 'your_cpanel_user',
  pass: 'replace-with-a-strong-password',
  admin_key: 'change-me',
}

const configPaths = ['backend/api/config.php', 'deploy/api/config.php']
const configs = configPaths.map((relativePath) => {
  const source = read(relativePath)
  for (const [key, expected] of Object.entries(expectedConfig)) {
    const actual = field(source, key)
    if (actual !== expected) {
      failures.push(`${relativePath} must retain the public template value for ${key}`)
    }
  }
  return source
})

if (configs[0] && configs[1] && configs[0] !== configs[1]) {
  failures.push('Source and deployment configuration templates differ')
}

const requiredDeployFiles = [
  'deploy/.htaccess',
  'deploy/index.html',
  'deploy/job.php',
  'deploy/sitemap.php',
  'deploy/robots.txt',
  'deploy/llms.txt',
  'deploy/api/.htaccess',
  'deploy/api/index.php',
  'deploy/api/db.php',
  'deploy/api/helpers.php',
  'deploy/api/config.php',
]

for (const file of requiredDeployFiles) read(file)

const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'data',
  'coverage',
  'backups',
  'database-exports',
])

const forbiddenFileNames = [
  /^config\.local\.php$/i,
  /^\.env(?:\..+)?$/i,
  /\.(?:pem|key|p12|pfx|sqlite|sqlitedb|log)$/i,
]

const allowedEnvironmentTemplates = new Set(['frontend/.env.mock'])

const highConfidenceSecrets = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9_]{20,}/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{20,}/],
]

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue

    const fullPath = path.join(directory, entry.name)
    const relativePath = path.relative(root, fullPath).replaceAll('\\', '/')

    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }

    if (!allowedEnvironmentTemplates.has(relativePath) && forbiddenFileNames.some((pattern) => pattern.test(entry.name))) {
      failures.push(`Private operational file must not be published: ${relativePath}`)
      continue
    }

    if (entry.size > 5_000_000) continue

    let source
    try {
      source = fs.readFileSync(fullPath, 'utf8')
    } catch {
      continue
    }

    for (const [label, pattern] of highConfidenceSecrets) {
      if (pattern.test(source)) {
        failures.push(`Possible ${label} in ${relativePath}`)
      }
    }
  }
}

walk(root)

if (failures.length) {
  console.error('Public repository safety check failed:')
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Public repository safety check passed.')
console.log(`Verified ${configPaths.length} safe configuration templates and ${requiredDeployFiles.length} deployment files.`)
