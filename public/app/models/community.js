var _ = require('lodash')
  , Model = require('./model')
  , Doc = require('./doc')
;

var Community = _.inherit(Model, function(data) {
  _.defaults(this.fields, {
    documents: [],
    entities: [],
  });

  return this._super.constructor.call(this, data);
});
_.assign(Community, {
  fields: {
    documents: function(documents) {
      return _.map(documents, function(doc) {
        return new Doc(doc);
      });
    },
  },
});

module.exports = Community;


