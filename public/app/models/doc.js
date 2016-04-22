var _ = require('lodash')
  , Model = require('./model')
;

var Revision = _.inherit(Model);

var Doc = _.inherit(Model, {
  // props
}, {
  // statics
  fields: {
    _id: '',
    children: Model.OneToManyField('self'),
  },
});

module.exports = Doc;

