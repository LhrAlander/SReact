const baseConfig = require('./webpack.base.config');

const config = {
  ...baseConfig,
  mode: 'development',
  devtool: 'source-map'
}

module.exports = {
  ...config,
}
