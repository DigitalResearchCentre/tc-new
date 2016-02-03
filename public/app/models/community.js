var _ = require('lodash')
  , Model = require('./model')
  , Doc = require('./doc')
;

var Community = _.inherit(Model, function(data) {
  return this._super.constructor.call(this, data);
}, {
  options: {
    resource: 'nodes',
  },
  fields: {
    documents: function() {
      return [];
    }
  },
});

module.exports = Community;


