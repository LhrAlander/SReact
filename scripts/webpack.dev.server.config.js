const path = require('path');
const devWebpackConfig = require('./webpack.dev.config');
const HTMLWebpackPlugin = require('html-webpack-plugin');

const devServer = {
  port: 2048,
  compress: true,
}

const plugins = [];

const config = {
  ...devWebpackConfig,
  devServer,
  plugins,
}



function useHTMLWebpackPlugin() {
  const config = {
    filename: 'index.html',
    title: 'SReact dev page',
    chunks: ['sReact', 'main'],
  }

  const plugin = new HTMLWebpackPlugin(config);
  plugins.push(plugin);
}

function addDevEntry() {
  config.entry = {
    ...config.entry,
    main: path.resolve(__dirname, '../packages/dev/index.ts')
  };

}

addDevEntry();
useHTMLWebpackPlugin();



module.exports = config;
