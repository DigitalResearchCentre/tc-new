var _ = require('lodash')
  , Model = require('./model')
  , Community = require('./community')
;

var User = _.inherit(Model, {
  getName: function() {
    var attrs = this.attrs;
    var local = attrs.local || attrs.facebook || attrs.google || attrs.twitter;
    return local ? local.name : '';
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
}, {
  fields: {
    _id: '',
    memberships: [
      function(memberships) {
        return _.map(memberships, function(membership) {
          var community = new Community(membership.community);
          return _.assign({}, membership, {
            community: community,
          });
        });
      },
      function(memberships) {
        return _.map(memberships, function(membership) {
          return _.assign({}, membership, {
            community: _.invoke(membership, 'community.getId'),
          });
        });
      },
    ],
  },

});

module.exports = User;

