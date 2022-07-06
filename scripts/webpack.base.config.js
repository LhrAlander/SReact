const path = require('path');
const babelOption = require('../.babelrc.json');
const config = {
  context: path.resolve(__dirname, '../packages'),
  entry: {
    sReact: 'react/index.ts',
  },
  output: {
    filename: '[name].bundle.js',
    library: {
      type: 'umd',
      name: 'SReact',
    }
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          ...babelOption
        }
      },
    ]
  },
  resolve: {
    extensions: ['.jsx', '.ts', '.tsx', '...'],
  }
}

module.exports = {
  ...config
}
