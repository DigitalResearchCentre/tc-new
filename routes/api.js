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
  , Work = models.Work
  , XML = models.XML
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
      Doc.find({ancestors: docId}).exec(cb);
    },
    function(cb) {
      TextNode.find({docs: docId}).exec(function(err, texts) {
        var xmls = {}
          , works = {}
        ;
        _.each(texts, function(text) {
          _.each(text.xmls, function(id) {
            xmls[id] = '';
          });
          _.each(text.works, function(id) {
            works[id] = '';
          });
        });
        async.parallel([
          function(cb1) {
            Work.find({_id: {$in: _.keys(works)}}, cb1);
          },
          function(cb1) {
            XML.find({_id: {$in: _.keys(xmls)}}, cb1);
          },
        ], function(err, results) {
          cb(err, {
            works: results[0],
            xmls: results[1],
            texts: texts,
          })
        });
      });
    },
  ], function(err, results) {
    if (err) {
      next(err);
    } else {
      res.json({
        descendants: results[0],
        works: results[1].works,
        xmls: results[1].xmls,
        texts: results[1].texts,
      });
    }
  })
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
    <lb/>
    <l n="1"> hello <lb/> world </l>
    <lb/>
     <l n="2"> foo  bar </l>
    <lb/>
     <l n="3"> good  good </l>
  </div>
  <div n="div2">
        <lb/>
    <l n="1">
      foo
      <pb n="1v"/>
      <lb/>
      bar
    </l>
    <pb n="2r"/>
<lb/>
     <l n="1"> see <lb/> you</l>
  </div>
</body>
</text>

 */
