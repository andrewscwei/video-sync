'use strict';

import path from 'path';
import webpack from 'webpack';

const sourceDir = path.join(__dirname, 'app');
const buildDir = path.join(__dirname, 'public');
const modulesDir = path.join(__dirname, 'node_modules');

module.exports = {
  cache: true,
  debug: true,
  devtool: 'eval-source-map',
  context: path.join(sourceDir, 'scripts'),
  entry: {
    main: './main.js'
  },
  output: {
    path: path.join(buildDir, 'javascripts'),
    publicPath: '/javascripts/',
    filename: '[name].js',
    chunkFilename: '[chunkhash].js',
    sourceMapFilename: '[name].map'
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      loader: 'babel',
      exclude: /node_modules/
    }, {
      test: /\.[s]?css$/,
      loaders: [
        'style',
        'css',
        `sass?includePaths=${path.join(sourceDir, 'scripts', 'stylesheets')},outputStyle=expanded,sourceMap`
      ]
    }, {
      test: /\.json$/,
      loader: 'json'
    }]
  },
  resolve: {
    extensions: ['', '.js', '.scss', '.jade'],
    root: [
      path.join(sourceDir, 'scripts')
    ],
    modulesDirectories: [
      modulesDir
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      WEBSOCKET_URL: JSON.stringify('ws://localhost:1337')
    })
  ]
}
