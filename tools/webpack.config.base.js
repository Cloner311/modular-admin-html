const path = require('path');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const postcssImport = require('postcss-import');
const customProperties = require('postcss-custom-properties');

const config = require('../config');
const theme = require(config.CLIENT_DIR + '/_theme/theme');

// Basic properties
const webpackConfigBase = {
  entry: path.resolve(config.CLIENT_DIR, 'main.js'),
  output: {
    path: config.DIST_DIR,
    filename: 'bundle.js',
    publicPath: process.env.PUBLIC_PATH || "/"
  },
  resolve: {
    extensions: ['.js'],
    modules: [config.NPM_DIR, config.CLIENT_DIR],
    alias: {
      jquery: "jquery/src/jquery",
    }
  },
  devtool: 'source-map',
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery:   'jquery',
      Raphael:  'raphael',
      raphael:  'raphael',
    })
  ]
};

// Loaders configuration
webpackConfigBase.module = {};
webpackConfigBase.module.rules = [
  // JS files
  {
    test: /\.js$/,
    exclude: config.NPM_DIR,
    use: [
      {
        loader: 'babel-loader',
        options: {
          cacheDirectory: config.TMP_DIR
        }
      }
    ]
  },

  // SCSS files
  {
    test:   /\.scss/,
    use: [
      {
        loader: 'style-loader',
        options: {
          sourceMap: true,
          // convertToAbsoluteUrls: true
        }
      },
      {
        loader: 'css-loader',
        options: {
          // modules: true,  // This option activates css modules
          importLoaders: 1,
          sourceMap: true,
        }
      },
      {
        loader: 'postcss-loader',
        options: {
          sourceMap: true,
          plugins: [
            postcssImport(),
            customProperties({
              preserve: true,
              variables: theme.toObject()
            }),
            autoprefixer('last 2 versions', 'ie 10'),
          ]
        }
      },
      {
        loader: 'sass-loader',
        options: {
          sourceMap: true,
          includePaths: [
            config.NPM_DIR,
            config.CLIENT_DIR
          ]
        }
      },
      {
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: '<--themeSCSS-->',
              replace: theme.toSCSS()
            },
            {
              search: '<--themeCSS-->',
              replace: theme.toCSS()
            }
          ]
        }
      },
      {
        loader: 'sass-resources-loader',
        options: {
          resources: [
            config.NPM_DIR + '/font-awesome/scss/_variables.scss',
            config.NPM_DIR + '/font-awesome/scss/_mixins.scss',
            config.NPM_DIR + '/bootstrap/scss/_functions.scss',
            config.NPM_DIR + '/bootstrap/scss/_variables.scss',
            config.NPM_DIR + '/bootstrap/scss/_mixins.scss',
            config.CLIENT_DIR + '/_theme/variables.scss',
            config.CLIENT_DIR + '/_common/Util/Mixins.scss',
          ]
        },
      }
    ],
  },

  // CSS files
  {
    test:   /\.css/,
    use: [
      {
        loader: 'style-loader',
        options: {
          sourceMap: true,
          convertToAbsoluteUrls: true
        }
      },
      {
        loader: 'css-loader',
        options: {
          // modules: true,  // This option activates css modules
          importLoaders: 1,
          sourceMap: true
        }
      }
    ]
  },

  /*----------  Static files  ----------*/

  {
    test: /\.png$/,
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: 100000
        }
      }
    ]
  },
  {
    test: /\.jpg$/,
    use: [
      {
        loader: 'file-loader',
        options: {
          limit: 100000
        }
      }
    ]
  },
  {
    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    use: [
      'file-loader'
    ],
  },
  {
    test: /\.(woff|woff2|eot|ttf|svg)(\?.*$|$)/,
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: 10000,
          mimetype: 'application/font-woff'
        }
      }
    ]
  }

];


module.exports = webpackConfigBase;
