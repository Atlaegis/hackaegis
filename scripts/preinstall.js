const fs = require('fs');
const path = require('path');

function rmIfExists(p) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (e) {
    // ignore
  }
}

rmIfExists(path.join(__dirname, '..', 'package-lock.json'));
rmIfExists(path.join(__dirname, '..', 'yarn.lock'));

const userAgent = process.env.npm_config_user_agent || '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm instead');
  process.exit(1);
}
