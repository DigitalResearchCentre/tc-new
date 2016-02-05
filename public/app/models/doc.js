var _ = require('lodash')
  , Model = require('./model')
;

var Revision = _.inherit(Model, function(data) {
  return this._super.constructor.call(this, data);
}, {
});


var Doc = _.inherit(Model, function(data) {
  return this._super.constructor.call(this, data);
}, {
  fields: {
    _id: {},
    children: function(objs) {
      var cls = Doc;
      var results = _.map(objs, function(attrs) {
        if (_.isString(attrs)) {
          attrs = new cls({_id: attrs});
        } else if (!(attrs instanceof cls)) {
          attrs = new cls(attrs);
        }
        return attrs;
      });
      return results;
    },
    revisions: function(objs) {
      var cls = Revision;
      var results = _.map(objs, function(attrs) {
        if (_.isString(attrs)) {
          attrs = new cls({_id: attrs});
        } else if (!(attrs instanceof cls)) {
          attrs = new cls(attrs);
        }
        return attrs;
      });
      return results;
    },
  },
});

module.exports = Doc;


