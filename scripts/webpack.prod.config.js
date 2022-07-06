const baseConfig = require('./webpack.base.config');

const config = {
  ...baseConfig,
  mode: 'production',
}

module.exports = {
  ...config,
}
