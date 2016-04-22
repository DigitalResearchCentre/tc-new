var _ = require('lodash')
  , Model = require('./model')
;

var Revision = Model.extend();

var Doc = Model.extend({
  // props
}, {
  // statics
  fields: function() {
    return {
      _id: '',
      children: Model.OneToManyField(Doc),
    };
  },
});

module.exports = Doc;

