const _ = require('lodash')
  , async = require('async')
  , express = require('express')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , Error = require('../common/error')
  , Community = models.Community
  , Doc = models.Doc
  , Revision = models.Revision
  , TEI = models.TEI
;

const FooError = Error.extend('FooError');

router.use(function(req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 
      'Origin, X-Requested-With, Content-Type, Accept, Key, Cache-Control',
  });
  next();
});

function _getDependency(req, doc, callback) {
  async.parallel([
    function(cb) {
      if (req.body.parent) {
        Doc.findOne({_id: req.body.parent}, cb);
      } else {
        cb(null);
      }
    },
    function(cb) {
      if (req.body.after) {
        Doc.findOne({_id: req.body.after}, cb);
      } else {
        cb(null);
      }
    },
    function(cb) {
      if (req.body.community) {
        Community.findOne({_id: req.body.community}, cb);
      } else {
        cb(null);
      }
    },
    function(cb) {
      if (req.body.revision) {
        let revision = new Revision({
          doc: doc._id,
          user: req.user._id,
          text: req.body.revision,
          status: Revision.status.IN_PROGRESS,
        });
        revision.save(cb);
      } else {
        cb(null);
      }
    },
  ], function(err, results) {
    const parent = results[0]
      , after = results[1]
      , community = results[2]
    ;
    if (!!(parent || after) === !!community) {
      // only need community when create root document
      // Don't need community if given parent or after
      return callback(new FooError());
    } else {
      callback(null, parent, after, community);
    }
  });
}

var DocResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Doc, opts);
}, {
  // POST: /api/docs/:id/
  //  body: {
  //    parent | after | community,
  //    tei,  // will auto create empty page if tei is empty 
  //    doc,  // should contain valid label and name
  //  }
  beforeCreate: function(req, res, next) {
    const docData = req.body.doc
      , tei = req.body.tei
    ;
    return function(callback) {
      // TODO: should check against a TEI schema  
      // if (!validTEI(tei)) cb(new TEIError());
      let obj = new Doc(_.omit(Doc.clean(docData), ['children', 'ancestors']));
      async.waterfall([
        function(cb) {
          _getDependency(req, obj, cb);
        },
        function(parent, after, community) {
          const cb = _.last(arguments);
          if (after) {
            return Doc.insertAfter(after, obj, cb);
          } else if (parent) {
            return Doc.insertFirst(parent, obj, cb);
          } else if (community) {
            async.parallel([
              function(cb1) {
                community.addDocument(obj, cb1);
              },
              function(cb1) {
                obj.save(function(err, doc) {
                  cb1(err, doc);
                });
              },
            ], function(err, results) {
              cb(err, _.get(results, 1));
            });
          }
        },
      ], function(err, doc) {
        callback(err, doc);
      });
    };
  },
  execSave: function(req, res, next) {
    return function(obj, callback) {
      console.log(obj);
      obj.commit({
        tei: req.body.tei,
        doc: _.assign(req.body.doc, {_id: obj._id}),
      }, callback);
    };
  },
});


var docResource = new DocResource({id: 'doc'});
docResource.serve(router, '');
router.get('/:id/entities/:entityId?', function(req, res, next) {
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
router.get('/:id/revisions', function(req, res, next) {
  let docId = req.params.id
    , results = []
  ;
  Revision.find({doc: docId}, function(err, revisions) {
    if (err) return next(err);
    res.json(revisions);
  });
});
router.get('/:id/texts', function(req, res, next) {
  let docId = req.params.id
    , results = []
  ;
  async.waterfall([
    function(cb) {
      Doc.getTextsLeaves(docId, cb);
    },
    function(leaves) {
      const cb = _.last(arguments);
      results = leaves;
      TEI.getAncestorsFromLeaves(leaves, cb);
    },
  ], function(err, ancestors) {
    if (err) {
      next(err);
    } else {
      res.json(ancestors.concat(results));
    }
  });
});

router.get('/:id/links', function(req, res, next) {
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
});

module.exports = router;
