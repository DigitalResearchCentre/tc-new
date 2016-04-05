var webpack = require('webpack')
  , stdio = require('stdio')
  , env = process.env.NODE_ENV
  , config, compiler, ops
;

config = require('./make-webpack-config')({
  env: env
});

compiler = webpack(config);

if (env === 'development') {
  compiler.watch({
    aggregateTimeout: 300,
    poll: 1000,
  }, handleError);
} else {
  compiler.run(handleError);
}

function handleError(err, stats) {
  console.log(stats.toString({
    colors: true,
    cached: false,
  }));
}
