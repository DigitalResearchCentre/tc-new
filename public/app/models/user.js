var _ = require('lodash')
  , Model = require('./model')
  , Community = require('./community')
;

var User = _.inherit(Model, function(data) {
  this._super.constructor.call(this, data);
}, {
  fields: {
    memberships: function(memberships) {
      return _.map(memberships, function(membership) {
        var community = membership.community;
        return _.assign(membership, {
          community: new Community(community),
        });
      });
    },
  },
});

module.exports = Community;


