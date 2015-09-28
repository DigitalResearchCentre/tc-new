var webpack = require('webpack')
  , stdio = require('stdio')
  , config, compiler, ops, env
;

ops = stdio.getopt({
  env: {args: 1, description: 'ex. dev, prod, test'}
});

env = (ops.env || process.env.TC_ENV || 'dev');

config = require('./make-webpack-config')({
  env: env
});

compiler = webpack(config);

if (env == 'dev') {
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
  }));
}




