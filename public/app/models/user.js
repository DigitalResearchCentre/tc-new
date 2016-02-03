var _ = require('lodash')
  , Model = require('./model')
  , Community = require('./community')
;

var User = _.inherit(Model, function(data) {
  return this._super.constructor.call(this, data);
}, {
  fields: {
    _id: {},
    memberships: function(memberships) {
      return _.map(memberships, function(membership) {
        var community = new Community(membership.community);
        return _.assign({}, membership, {
          community: community,
        });
      });
    },
  },
  getName: function() {
    return this.attrs.local.name;
  },
  isNew: function() {
    return !this.getId();
  },
  toJSON: function() {
    var json = this._super.toJSON.call(this)
      , memberships = []
    ;
    _.each(this.attrs.memberships, function(membership) {
      var id = membership.community.getId();
      if (id) {
        memberships.push(id);
      }
    });
    return _.assign(json, {
      memberships: memberships,
    });
  }
});

module.exports = User;

