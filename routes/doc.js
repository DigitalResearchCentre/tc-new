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

const ParameterError = Error.extend('ParameterError');

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
          community: req.body.doc.community,
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
      return callback(new ParameterError(
        'should not use parent/after/community at same time'));
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
    if (!req.body.commit) {
      return next(new ParameterError(
        'Create Doc is Not Allowed, should use commit'));
    }
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
  beforeUpdate: function(req, res, next) {
    return function(obj, cb) {
      var body = req.body;
      // normal update can only update name/image
      // change ancestors and children is NOT ALLOWED
      if (!body.commit) {
        obj.set(_.omit(Doc.clean(_.assign(
          {_id: obj._id, },
          body
        )), ['children', 'ancestors']));
      }
      cb(null, obj);
    };
  },
  execSave: function(req, res, next) {
    if (!req.body.commit) {
      return function(obj, callback) {
        obj.save(function(err, obj) {
          callback(err, obj);
        });
      };
    }
    return function(obj, callback) {
  //      console.log("about to commit?")
        return async.waterfall([
        function(cb) {
            obj.commit({
            revision: req.body.revision,
            tei: req.body.tei,
            community: req.body.doc.community,
            res: res,
            doc: _.assign(req.body.doc, {_id: obj._id}),
          }, cb);
        },
        function(doc) {
          const cb = _.last(arguments);
          if (req.body.revision) {
            Revision.update({_id: req.body.revision}, {                                                                                                                                                                                                                                                    committed: new Date(),
              status: 'COMMITTED', community: req.body.doc.community,
            }, cb);
          } else {
            doc.meta = {
              committed: new Date(),
              user: req.user._id,
            }
  //          console.log("about to save again ");
            doc.save(cb);
          }
        },
        function() {
          const cb = _.last(arguments);
          cb(null, obj);
        }
      ], callback);
    };
  },
});


var docResource = new DocResource({id: 'doc'});
docResource.serve(router, '');
router.get('/:id/texts', function(req, res, next) {
//  console.log('get texts');
  Doc.getTexts(req.params.id, function(err, texts) {
     if (err) {
      next(err);
    } else {
//      console.log(texts.length);
      res.json(texts);
    }
  });
});


router.get('/:id/links', function(req, res, next) {
  var docId = req.params.id;
  Doc.getOutterTextBounds(docId, function(err, leftBound, rightBound) {
    if (err) {
      return next(err);
    }
    res.json({
      prevs: leftBound,
      nexts: rightBound,
    });
  });
});

module.exports = router;
