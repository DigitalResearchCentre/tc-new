var _ = require('lodash')
  , Model = require('./model')
;

var Entity = _.inherit(Model, function(data) {
  return this._super.constructor.call(this, data);
}, {
  fields: {
    _id: {},
  },
});

module.exports = Entity;



