var _ = require('lodash')
  , Model = require('./model')
;

var Revision = _.inherit(Model);

var Doc = _.inherit(Model, {
  // props
  getParent: function() {
    return new Doc({_id: _.last(this.attrs.ancestors)});
  },
  getFirstChild: function() {
    return _.get(this, 'attrs.children.0', null);
  },
}, {
  // statics
  fields: {
    _id: '',
    children: Model.OneToManyField('self'),
  },
});

module.exports = Doc;

