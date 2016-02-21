var _ = require('lodash')
  , async = require('async')
  , express = require('express')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , TCMailer = require('../TCMailer')
  , mongoose = require('mongoose')
  , Community = models.Community
  , User = models.User
  , Doc = models.Doc
  , Entity = models.Entity
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

var EntityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Entity, opts);
});


var entityResource = new EntityResource({id: 'entity'});
entityResource.serve(router, 'entities');
router.get('/entities/:id/docs/:docId', function(req, res, next) {
  var docId = req.params.docId
    , entityId = req.params.id
  ;
  Entity.getDocs(entityId, docId, function(err, docs) {
    if (err) {
      return next(err);
    }
    res.json(docs);
  });
});

var DocResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Doc, opts);
  this.options.auth.update = function(req, res, next) {
    next();
  };
  this.options.auth.create = function(req, res, next) {
    next();
  };
}, {
  execSave: function(req, res, next) {
    return function(obj, callback) {
      var parent, community, doc;
      async.waterfall([
        prevSave,
        function(results, cb) {
          parent = results[0];
          community = results[1];
          obj.save(function(err, obj, numberAffected) {
            doc = obj;
            cb(err, doc);
          });
        },
        function(doc, parallelCb) {
          async.parallel([
            function(cb) {
              if (req.body.revision) {
                var revision = new Revision({
                  doc: doc._id,
                  text: req.body.revision,
                });
                revision.save(function(err, revision, numberAffected) {
                  cb(err, revision);
                });
              } else {
                cb(null, doc);
              }
            },
            function(cb) {
              // TODO: also need move all subtrees
              var prevIndex, prevs, teiparent;
              if (parent) {
                parent.children.push(doc._id);
                doc.ancestors = parent.ancestors.concat(parent._id);
                async.waterfall([
                  function(cb1) {
                    parent.save(function(err, parent, numberAffected) {
                      cb1(err, parent);
                    });
                  },
                  function(parent, cb1) {
                    doc.save(function(err, doc, numberAffected) {
                      cb1(err, doc);
                    });
                  },
                  function(doc, cb1) {
                    Doc.getPrevTexts(doc._id, cb1)
                  },
                  function(prevTexts, cb1) {
                    prevs = prevTexts;
                    if (!prevs || prevs.length === 0) {
                      return cb1(null);
                    }
                    prevIndex = _.findLastIndex(prevs, function(prev) {
                      return [
                        '#text', 'pb', 'cb', 'lb'
                      ].indexOf(prev.name) === -1;
                    });
                    teiparent = prevs[prevIndex];
                    var tei = new TEI({
                      ancestors: teiparent.ancestors.concat(teiparent._id),
                      children: [],
                      docs: doc.ancestors.concat(doc._id),
                      name: 'pb',
                    });
                    tei.save(function(err, tei, numberAffected) {
                      cb1(err, tei);
                    });
                  },
                  function(tei, cb1) {
                    if (teiparent) {
                      _.each(teiparent.children, function(child, i) {
                        if (child._id) {
                          teiparent.children[i] = child._id;
                        }
                      });
                      if (prevIndex < prevs.length - 1) {
                        var childIndex = _.findLastIndex(
                          prevs[prevIndex].children, 
                          function(id) {
                            if (id._id) {
                              id = id._id
                            }
                            return id.equals(prevs[prevIndex+1]._id);
                          }
                        );
                        teiparent.children.splice(childIndex+1, 0, tei._id);
                      } else {
                        teiparent.children.push(tei._id);
                      }
                      teiparent.save(function(err, tt) {
                        cb1(err);
                      });

                    }
                  }
                ], function(err) {
                  cb(err, doc);
                });
              } else {
                cb(null);
              }
            },
            function(cb) {
              if (community) {
                community.documents.push(doc._id);
                community.save(function(err) {
                  cb(err, community);
                });
              } else {
                cb(null);
              }
            },
          ], function(err, results) {
            var revision = results[0];
            if (revision) {
              doc.revisions.push(revision._id);
            }
            doc.save(function(err, doc, numberAffected) {
              parallelCb(err, doc);
            });
          });
        },
        function(doc, cb) {
          if (req.body.commit) {
            obj.commit(req.body.commit, cb);
          } else {
            cb(null);
          }
        }
      ], function(err) {
        callback(err, doc);
      });

      function prevSave(prevSaveCallback) {
        async.parallel([
          function(cb) {
            if (req.body.parent) {
              Doc.findOne({_id: req.body.parent}).exec(cb);
            } else {
              cb(null);
            }
          },
          function(cb) {
            if (req.body.community) {
              Community.findOne({
                _id: req.body.community
              }).exec(cb);
            } else {
              cb(null);
            }
          },
        ], prevSaveCallback);
      }
    };
  },
});

var userResource = new Resource(User, {id: 'user'});
userResource.serve(router, 'users');

new CommunityResource({id: 'community'}).serve(router, 'communities');
router.put('/communities/:id/add-document', function(req, res, next) {
  var communityId = req.params.id
    , doc = new Doc(req.body)
    , community
  ;

  async.waterfall([
    function(cb) {
      Community.findOne({_id: communityId}).exec(cb);
    },
    function(obj, cb) {
      community = obj;
      doc.save(function(err, doc, numberAffected) {
        cb(err, doc);
      });
    },
    function(doc, cb) {
      community.documents.push(doc);
      community.save(function(err, community, numberAffected) {
        cb(err, community);
      });
    },
  ], function(err) {
    if (err) {
      if (doc._id) {
        doc.remove();
      }
      next(err);
    } else {
      res.json(doc);
    }
  });
});

var docResource = new DocResource({id: 'doc'});
docResource.serve(router, 'docs');
router.get('/docs/:id/entities/:entityId?', function(req, res, next) {
  var docId = req.params.id
    , entityId = req.params.entityId
  ;
  Doc.getEntities(docId, entityId, function(err, entities) {
    if (err) {
      return next(err);
    }
    res.json(entities);
  });
});
router.get('/docs/:id/texts', function(req, res, next) {
  var docId = req.params.id;
  TEI.find({docs: docId}).exec(function(err, teis) {
    if (err) {
      return next(err);
    }
    TEI.getTreeFromLeaves(teis, function(err, teiRoot) {
      res.json(teiRoot);
    });
  });
});

router.get('/docs/:id/links', function(req, res, next) {
  var docId = req.params.id;

  Doc.getOutterBoundTexts(docId, function(err, bounds) {
    if (err) {
      return next(err);
    }
    res.json({
      prev: bounds[0],
      next: bounds[1],
    });
  });

  /*
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
  */
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
