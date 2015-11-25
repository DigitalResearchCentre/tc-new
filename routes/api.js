var _ = require('lodash')
  , async = require('async')
  , express = require('express')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , TCMailer = require('../TCMailer')
  , Community = models.Community
  , User = models.User
  , Doc = models.Doc
  , Revision = models.Revision
  , TEI = models.TEI
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
            role: User.CREATOR,
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
  async.parallel([
    function(cb) {
      Doc.findOne({_id: docId}).exec(cb);
    },
    function(cb) {
      Doc.find({ancestors: docId}).exec(cb);
    },
    function(cb) {
      TEI.find({docs: docId}).exec(cb);
    },
  ], function(err, results) {
    var ids = {};
    if (err) {
      return next(err);
    }
    TEI.getTreeFromLeaves(results[2], function(err, teiRoot) {
      console.log(teiRoot);
      res.json(teiRoot);
    });
  });
});

router.get('/docs/:id/links', function(req, res, next) {
  var docId = req.params.id;
  async.parallel([
    function(cb) {
      Doc.getPrevTexts(docId, cb);
    },
    function(cb) {
      Doc.getNextTexts(docId, cb);
    },
  ], function(err, results) {
    if (err) {
      return next(err);
    }
    _.each(results, function(objs) {
      if (objs) {
        objs.pop();
      }
      _.each(objs, function(obj) {
        _.each(obj.children, function(child, i) {
          if (child._id) {
            obj.children[i] = child._id;
          }
        });
      });
    });
    res.json({
      prev: results[0],
      next: results[1],
    });
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


router.post('/sendmail', function(req, res, next) {
  TCMailer.nodemailerMailgun.sendMail(req.body, function(err, status) {
    if (!err) {
      res.json(status);
    } else {
      next(err);
    }
  });
});

module.exports = router;
/*
<text>
<body>
  <div n="div1">
    <pb n="1r"/>
    <head n="h1"> head </head>
    <ab n="ab1"> ab1 </ab>
    <ab n="ab2"> ab2 </ab>
    <lb/>
    <l n="1"> hello <lb/> world </l>
    <lb/>
  </div>
  <div n="div2">
    <l n="1">
      foo
      <pb n="1v"/>
      <lb/>
      bar
    </l>
  </div>
</body>
</text>

<text>
<body>
  <div n="div1">
    <pb n="1r"/>
    <head n="h1"> head </head>
    <ab n="ab1"> ab1 </ab>
    <ab n="ab2"> ab2 </ab>
    <lb n="1r1"/>
    <l n="1"> hello <lb  n="1r2"/> world </l>
    <lb  n="1r3"/>
     <l n="2"> foo  bar </l>
    <lb  n="1r4"/>
     <l n="3"> good  good </l>
  </div>
  <div n="div2">
        <lb n="1r5"/>
    <l n="1">
      foo
      <pb n="1v"/>
      <lb n="1v1"/>
      bar
    </l>
    <pb n="2r"/>
<lb n="2r1"/>
     <l n="1"> see <lb n="2r2"/> you</l>
  </div>
</body>
</text>

 */
