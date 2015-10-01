var _ = require('lodash')
  , async = require('async')
  , express = require('express')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , Community = models.Community
  , User = models.User
  , Doc = models.Doc
;

var CommunityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Community, opts);
}, {
  execSave: function(community, req, res, next) {
    return function(cb) {
      var user = req.user;
      async.waterfall([
        _.bind(community.save, community),
        function(community, numberAffected, cb) {
          user.memberships.push({
            community: community._id,
            role: User.LEADER,
          });
          cb(null);
        },
        _.bind(user.save, user),
        function(user, numberAffected, cb) {
          cb(null, community);
        },
      ], cb);
    };
  },
});

var DocResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Doc, opts);
  this.options.auth.a = 1;
  this.options.auth.update = function(req, res, next) {
    next();
  };
  this.options.auth.create = function(req, res, next) {
    next();
    
  }
}, {
  execSave: function(req, res, next) {
    return function(obj, cb) {
      console.log(obj);
      obj.save(cb);
    };
  },
});

var userResource = new Resource(User, {id: 'user'});
userResource.serve(router, 'users');

new CommunityResource({id: 'community'}).serve(router, 'communities');

new DocResource({id: 'doc'}).serve(router, 'docs');

router.get('/auth', function(req, res, next) {
  if (req.isAuthenticated()) {
    req.params.user = req.user._id;
    next();
  } else {
    res.json({});
  }
}, userResource.detail());


module.exports = router;

/*
<text>
<body>
<pb/>
  <head>
  head
  </head>
  <ab>
  ab1
  </ab>
  <ab>
  ab2
  </ab>
  <lb/>
  <l>
  hello
  <lb/>
  world
  </l>
  <lb/>
  <div>
    <l>
      foo
      <pb/>
      <lb/>
      bar
    </l>
  </div>
</body>
</text>
 */
