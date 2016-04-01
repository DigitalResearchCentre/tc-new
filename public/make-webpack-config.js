var webpack = require('webpack')
  , ResolverPlugin = webpack.ResolverPlugin
  , ProvidePlugin = webpack.ProvidePlugin
  , IgnorePlugin = webpack.IgnorePlugin
  , path = require('path')
  , clientRoot = path.resolve(__dirname)
  , bowerRoot = path.resolve(clientRoot, '..', 'bower_components')
  , nodeRoot = path.resolve(clientRoot, '..', 'node_modules')
;

module.exports = function(options) {
  var env = options.env
    , devtool, debug
  ;

  if (env === 'production') {
    devtool = '#source-map';
    debug = false;
  }else{
    devtool = '#eval-cheap-module-source-map';
    debug = true;
  }

  return {
    context: clientRoot,
    entry: {
      //vendor: path.join(clientRoot, 'vendor.js'),
      boot: path.join(clientRoot, 'app/boot.js'),
    },
    output: {
      path: path.join(clientRoot, 'dist'),
      filename: '[name].bundle.js',
    },
    module: {
      loaders: [
        {
          test: /\.png(\?v=\d+\.\d+\.\d+)?$/,
          loader: "url?minetype=image/jpg&prefix=dist/"
        }, {
          test: /\.jpg(\?v=\d+\.\d+\.\d+)?$/,
          loader: "url?minetype=image/jpg&prefix=dist/"
        }, {
          test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
          loader: "url?minetype=application/font-woff&prefix=dist/"
        }, {
          test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
          loader: "url?minetype=application/font-woff&prefix=dist/"
        }, {
          test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
          loader: "url?minetype=application/octet-stream&prefix=dist/"
        }, {
          test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
          loader: "url?minetype=application/vnd.ms-fontobject&prefix=dist/"
        }, {
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          loader: "url?minetype=image/svg+xml&prefix=dist/"
        },
        {test: /\.css$/, loader: 'style!css'},
        {test: /\.less$/, loader: 'style!css!less?sourceMap'},
      ],
      noParse: [
      ]
    },
    resolve: {
      root: [clientRoot],
      modulesDirectories: ['web_modules', 'node_modules', 'bower_components', ],
      alias: {
        bower: bowerRoot,
        node: nodeRoot,
      },
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(env),
        },
      }),
      new ResolverPlugin(new ResolverPlugin.DirectoryDescriptionFilePlugin(
        'bower.json', ['main']
      )), 
      new webpack.ProvidePlugin({
          $: "jquery",
          jQuery: "jquery",
          "window.jQuery": "jquery"
      }),
      // prevent webpack accident include server security information
      new IgnorePlugin(new RegExp('config\/prod.*')),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor', filename: 'vendor.bundle.js',
        minChunks: function(module, count) {
          return module.resource && module.resource.indexOf(clientRoot) === -1;
        }
      }),
    ],
    devtool: devtool,
  };
};



