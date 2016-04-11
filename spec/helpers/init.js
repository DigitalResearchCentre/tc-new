if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

require('../../common/mixin');

var mongoose = require('mongoose')
  , config = require('../../config')
;

mongoose.connect(config.database.uri);

