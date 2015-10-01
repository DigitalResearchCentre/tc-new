var _ = require('lodash')
  , async = require('async')
  , express = require('express')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , Community = models.Community
  , User = models.User
  , Doc = models.Doc
  , Revision = models.Revision
  , TextNode = models.TextNode
;

var CommunityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Community, opts);
}, {
  execSave: function(req, res, next) {
    return function(community) {
      var cb = _.last(arguments);
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
    
  };
}, {
  execSave: function(req, res, next) {
    return function(obj, callback) {
      async.parallel([
        function(cb) {
          if (req.body.revision) {
            var revision = new Revision({
              doc: obj._id,
              text: req.body.revision,
            });
            revision.save(cb);
            obj.revisions.push(revision._id);
          } else {
            cb(null);
          }
        },
        function(cb) {
          if (req.body.community) {
            var query = Community.findOne({
              _id: req.body.community
            });
            async.waterfall([
              _.bind(query.exec, query),
              function(community, cb) {
                community.documents.push(obj._id);
                community.save(cb);
              },
            ], cb);
          } else {
            cb(null);
          }
        },
        function(cb) {
          if (req.body.commit) {
            obj.commit(req.body.commit, cb);
          } else {
            cb(null);
          }
        }
      ], function(err, results) {
        if (err) {
          callback(err);
        } else {
          obj.save(callback);
        }
      });
    };
  },
});

var userResource = new Resource(User, {id: 'user'});
userResource.serve(router, 'users');

new CommunityResource({id: 'community'}).serve(router, 'communities');

var docResource = new DocResource({id: 'doc'});
docResource.serve(router, 'docs');
router.get('/docs/:id/texts', function(req, res, next) {
  var docId = req.params.id;
  Doc.find({
    ancestors: docId
  }, function(err, docs) {
    res.json(docs);

    
    
  });
});

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
<pb n="1r"/>
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
      <pb n="1v"/>
      <lb/>
      bar
    </l>
  </div>
</body>
</text>
 */
