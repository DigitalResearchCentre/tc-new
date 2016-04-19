var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , Error = require('../common/error')
  , TEI = require('./tei')
  , Community = require('./community')
;

const CheckLinkError = Error.extend('CheckLinkError');

function _elEqual(el1, el2) {
  const fields = ['name', 'label'];
  return _.isEqual(
    _.pick(el1, fields),
    _.pick(el2, fields)
  );
}

function _elAssign(el, node) {
  el._id = node._id;
}

function _checkLinks(docEl, prevs, nexts, teiRoot) {
  var cur = teiRoot
    , continueTeis = {}
  ;
  _.dfs([teiRoot], function(el) {
    if (_elEqual(docEl, el)) {
      return false;
    }
    let bound = prevs.shift();
    if (bound && _elEqual(bound, el)) {
      _elAssign(el, bound);
    } else {
      throw new CheckLinkError('prevs element is not match: ' + el + bound);
    }
  });

  _.dfs([teiRoot], function(el) {
    if (_elEqual(docEl, el)) {
      return false;
    }
    let bound = nexts.shift();
    if (_elEqual(bound, el)) {
      _elAssign(el, bound);
    } else {
      throw new CheckLinkError('nexts element is not match: ' + el + bound);
    }
  }, function(el) {
    let children = [];
    _.forEachRight(el.children || [], function(childEl) {
      children.push(childEl);
    });
    return children;
  });
}

var DocSchema = extendNodeSchema('Doc', {
  label: String,
  image: Schema.Types.ObjectId,
  revisions: [{type: Schema.Types.ObjectId, ref: 'Revision'}],
}, {
  methods: {
    commit: function(data, callback) {
      var self = this
        , teiRoot = data.tei || {}
        , docRoot = _.defaults(self.toObject(), data.doc) 
      ;
      console.log('commit');
      async.parallel([
        function(cb) {
          Doc.getOutterTextBounds(self._id, cb);
        },
        function(cb) {
          var rootDocId = self._id;
          if (self.ancestors.length > 0) {
            rootDocId = self.ancestors[0];
          }
          Community.findOne({documents: rootDocId}).exec(cb);
        },
      ], function(err, results) {
        var leftBounds = results[0][0]
          , rightBounds = results[0][1]
          , community = results[1]
          , updateTeis = []
          , insertTeis = []
          , deleteTeis = []
          , docs
        ;
        if (err) {
          return callback(err);
        }
/*         if (!community) { */
          // return callback(err);
        /* } */
        try {
          _checkLinks(docRoot, leftBounds, rightBounds, teiRoot);
        } catch (e) {
          console.log('jjjjjjjjjjj');
          console.log(e.name);
          console.log(e.message);
        }

        // load docs
        docs = Doc._loadNodesFromTree(docRoot);
        // load entities
        // load teis

        _.dfs(teiRoot, function(el) {
          let cur = cls.clean(el);
          if (el.doc) {
            cur.docs = docsMap[el.doc].ancestors.concat(el.doc);
          }
          if (el.entity) {
            cur.entities = docsMap[el.entity].ancestors.concat(el.entity);
          }
          cur.children = cls._loadChildren(cur);
          if (el._id) {
            cur.children = el.prevChildren.concat(cur.children, el.nextChildren);
            updateTeis.push(cur);
            deleteTeis = deleteTeis.concat(el.deleteChildren);
          } else {
            insertTeis.push(cur);
          }
        });
        console.log('--------docs--------');
        console.log(docs);
        console.log('--------deleteTeis--------');
        console.log(deleteTeis);
        console.log('--------updateTeis--------');
        console.log(updateTeis);
        console.log('--------insertTeis--------');
        console.log(insertTeis);
        return callback(null);

        async.parallel([
          function(cb1) {
            Doc.collection.insert(docs, cb)
          },
          function(cb1) {
            // save entities;
            cb(null, []);
          },
          function(cb1) {
            TEI.collection.remove({
              $or: [
                {ancestors: {$in: deleteTeis}},
                {_id: {$in: deleteTeis}},
              ]
            }, cb1);
          },
          function(cb1) {
            TEI.collection.update(updateTeis, cb1)
          },
          function(cb1) {
            TEI.collection.insert(insertTeis, cb1)
            // update teis;
            // insert teis;
          },
        ], function(err) {
          callback(err);
        });
      });

      /*
      this.save();
      var teis = TEI.find({docs: this._id});
      function findTree(teis) {
        return [];
      }
      var teitree = findTree(teis);
      Doc.collection.insert(docs);
      */
      // TODO find out all tei need be deleted
      // then delete them
    },
  },
  statics: {
    getTexts: function(id, callback) {
      async.waterfall([
        function(cb) {
          TEI.find({docs: id}, cb);
        },
        function(tests) {
          const cb = _.last(arguments);
          TEI.orderLeaves(tests, cb);
        }
      ], callback);
    },
    getOutterTextBounds: function(id, callback) {
      /*
      * example: <div1>
      *            <div2>
      *              <pb n="1"/><ab1><t1/></ab1>
      *              <pb n="2"/>
      *            <div2>
      *            <t2/>
      *            <pb n="3"/><t3/>
      *          </div1>
      *  should return [div1, div2 ab1, t1], [div1, t3]
      */
      const cls = this;
      async.waterfall([
        function(cb) {
          Doc.getDFSBound(id, cb);
        },
        function(bounds) { 
          // resturn:
          //  prevText: last Text on previous doc
          //  nextText: first Text on next doc
          const cb = _.last(arguments)
            , dfsPrev = bounds[0]
            , dfsNext = bounds[1]
          ;
          async.parallel([
            function(cb1) {
              if (dfsPrev) {
                cls.getFirstTextPath(dfsPrev._id, cb1)
              } else {
                cb1(null, []);
              }
            },
            function(cb1) {
              if (dfsNext) {
                cls.getLastTextPath(dfsNext._id, cb1)
              } else {
                cb1(null, []);
              }
            },
          ], function(err, results) {
            cb(err, results[0], results[1]);
          });
        }, 
      ], callback);
    },
    getFirstTextPath: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls.getFirstText(id, cb);
        },
        function(node) {
          const cb = _.last(arguments);
          if (node) {
            TEI.getAncestors(node._id, cb);
          } else {
            cb(null, []);
          }
        }
      ], callback);
    },
    getLastTextPath: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls.getLastText(id, cb);
        },
        function(node) {
          const cb = _.last(arguments);
          if (node) {
            TEI.getAncestors(node._id, cb);
          } else {
            cb(null, []);
          }
        }
      ], callback);
    },
    getFirstText: function(id, callback) {
      cls.getTexts(id, function(err, texts) {
        callback(err, _.first(texts));
      });
    },
    getLastText: function(id, callback) {
      cls.getTexts(id, function(err, texts) {
        callback(err, _.last(texts));
      });
    },

    getEntityIds: function(docId, entityId, callback) {
      if (_.isString(docId)) {
        docId = new ObjectId(docId);
      }
      if (_.isString(entityId)) {
        entityId = new ObjectId(entityId);
      }
      async.waterfall([
        function(cb) {
          if (entityId) {
            Entity.findOne({_id: entityId}).exec(cb);
          } else {
            cb(null, null);
          }
        },
        function(entity, cb) {
          var key, query;
          if (entity) {
            key =  'entities.' + (entity.ancestors.length + 1);
            query = {
              $and: [{
                docs: docId,
                entities: entityId,
              }]
            };
          } else {
            key = 'entities.0';
            query = {
              docs: docId,
            };
          }
          TEI.db.db.command({
            distinct: 'teis',
            key: key,
            query: query,
          }, cb);
        }
      ], callback);
    },
    getEntities: function(docId, entityId, callback) {
      this.getEntityIds(docId, entityId, function(err, result) {
        if (err) {
          return callback(err);
        }
        if (result.ok !== 1) {
          return callback(result);
        }
        Entity.find({_id: {$in: result.values}}).exec(callback);
      });
    },
    getPrevTexts: function(id, callback) {
      async.waterfall([
        function(cb) {
          Doc.getDFSPrev(id, cb);
        },
        function(doc, cb) {
          if (!doc) {
            return cb(null, null);
          }
          TEI.find({docs: doc.ancestors.concat(doc._id)}).exec(cb);
        },
        function(teiLeaves, cb) {
          if (teiLeaves) {
            TEI.getTreeFromLeaves(teiLeaves, cb);
          } else {
            cb(null, null);
          }
        },
      ], function(err, teiRoot) {
        if (err || !teiRoot) {
          return callback(err, []);
        }
        var cur = teiRoot
          , prevs = [cur]
          , index
        ;
        while ((cur.children || []).length > 0) {
          index = _.findLastIndex(cur.children, function(child) {
            return !(_.isString(child) || child instanceof ObjectId) &&
              !(child.name === '#text' && child.text.trim() === '');
          });
          if (index !== -1) {
            cur = cur.children[index];
            prevs.push(cur);
          } else {
            break;
          }
        }
        callback(err, prevs);
      });
    },
    getNextTexts: function(id, callback) {
      async.waterfall([
        function(cb) {
          Doc.findOne({children: id}).exec(cb);
        },
        function(parent, cb) {
          var index;
          if (parent) {
            index = _.findIndex(parent.children, function(child) {
              return child.equals(id);
            });
            if (parent.children.length > index+1) {
              return Doc.findOne(parent.children[index+1]).exec(cb);
            }
            // TODO no siblings
          }
          return cb(null, null);
        },
        function(doc, cb) {
          if (!doc) {
            return cb(null, null);
          }
          TEI.find({docs: doc.ancestors.concat(doc._id)}).exec(cb);
        },
        function(teiLeaves, cb) {
          if (teiLeaves) {
            TEI.getTreeFromLeaves(teiLeaves, cb);
          } else {
            cb(null, null);
          }
        },
      ], function(err, teiRoot) {
        if (err || !teiRoot) {
          return callback(err, []);
        }
        var cur = teiRoot
          , nexts = [cur]
          , index
        ;
        while ((cur.children || []).length > 0) {
          index = _.findIndex(cur.children, function(child) {
            return !(_.isString(child) || child instanceof ObjectId) &&
              !(child.name === '#text' && child.text.trim() === '');
          });
          if (index !== -1) {
            cur = cur.children[index];
            nexts.push(cur);
          } else {
            break;
          }
        }
        callback(err, nexts);
      });
    },
  }
});

const Doc = mongoose.model('Doc', DocSchema);
module.exports = Doc;
