import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDirectory, '..')
const dist = path.join(root, 'frontend', 'dist')
const deploy = path.join(root, 'deploy')
const assets = path.join(deploy, 'assets')

if (!fs.existsSync(path.join(dist, 'index.html')) || !fs.existsSync(path.join(deploy, 'api'))) {
  throw new Error('Expected frontend/dist and deploy/api before assembling the Bluehost package.')
}
if (!assets.startsWith(`${deploy}${path.sep}`)) {
  throw new Error('Refusing to replace assets outside the deployment directory.')
}

fs.rmSync(assets, { recursive: true, force: true })
fs.cpSync(path.join(dist, 'assets'), assets, { recursive: true })

for (const name of [
  'index.html',
  'post.html',
  'manage.html',
  'admin.html',
  '404.html',
  'favicon.svg',
  'llms.txt',
  'robots.txt',
]) {
  fs.copyFileSync(path.join(dist, name), path.join(deploy, name))
}

for (const name of ['config.php', 'db.php', 'helpers.php', 'index.php', 'notifications.php', 'review.php']) {
  fs.copyFileSync(path.join(root, 'backend', 'api', name), path.join(deploy, 'api', name))
}

console.log('Synchronized the production frontend and public API templates into deploy/.')
