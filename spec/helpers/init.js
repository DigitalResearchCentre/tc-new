if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

require('../../common/mixin');

console.log(process.env.NODE_ENV);
var mongoose = require('mongoose')
  , config = require('../../config')
;

mongoose.connect(config.database.uri);

