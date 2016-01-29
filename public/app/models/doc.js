var _ = require('lodash')
  , Model = require('./model')
;

var Doc = _.inherit(Model, function(data) {
  return this._super.constructor.call(this, data);
});
_.assign(Doc, {
  fields: {
    children: function(children) {
      return _.map(children, function(child) {
        new Doc(child);
      });
    }
  },
});

module.exports = Doc;


