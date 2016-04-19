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

function _isContinueEl(el1, el2) {
  const attrs1 = _.get(el1, 'attrs', {})
    , attrs2 = _.get(el2, 'attrs', {})
  ;
  return el1.name === el2.name && attrs1.n === attrs2.n;
}

function _elAssign(el, node) {
  el._id = node._id;
}

function _idEqual(id1, id2) {
  return ObjectId.isValid(_id) && ObjectId.isValid(_id) && 
    (new ObjectId(id1)).equals(id2);
}

function _checkLinks(docEl, prevs, nexts, teiRoot) {
  var cur = teiRoot
    , continueTeis = {}
  ;
  _.dfs([teiRoot], function(el) {
    if (_isContinueEl(docEl, el)) {
      return false;
    }
    let bound = prevs.shift()
      , continueChild, index
    ;
    if (bound && _isContinueEl(bound, el)) {
      _elAssign(el, bound);
      continueChild = _.first(prevs);
      if (continueChild) {
        el.prevChild = _.findIndex(bound.children, function(id) {
          return _idEqual(id, continueChild._id);
        });
      }
    } else {
      bound = bound || {};
      throw new CheckLinkError(
        `prevs element is not match: ${el.name}, ${bound.label} ${bound.name}`);
    }
  });

  _.dfs([teiRoot], function(el) {
    let bound = nexts.shift();
    if (!bound) {
      return false;
    }
    if (_isContinueEl(bound, el) && bound.name !== docEl.label) {
      _elAssign(el, bound);
      continueChild = _.first(nexts);
      if (continueChild) {
        el.nextChild = _.findIndex(bound.children, function(id) {
          return _idEqual(id, continueChild._id);
        });
      }
    } else {
      bound = bound || {};
      throw new CheckLinkError(
        `nexts element is not match: ${el.name}, ${bound.label} ${bound.name}`);
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
  name: String,
  label: String,
  image: Schema.Types.ObjectId,
  revisions: [{type: Schema.Types.ObjectId, ref: 'Revision'}],
}, {
  methods: {
    commit: function(data, callback) {
      var self = this
        , teiRoot = data.tei || {}
        , docRoot = _.defaults(data.doc, self.toObject()) 
      ;
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
        let leftBounds = results[0][0]
          , rightBounds = results[0][1]
          , community = results[1]
          , docsMap = {}
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
        _checkLinks({
          name: self.label, attrs: {n: self.name}
        }, leftBounds, rightBounds, teiRoot);

        // load docs
        docs = Doc._loadNodesFromTree(docRoot);
        _.each(docs, function(d) {
          docsMap[d._id.toString()] = d;
        });
        docRoot = docs.shift();
        // load entities
        // load teis

        _.dfs([teiRoot], function(el) {
          let cur = TEI.clean(el)
            , deleteChildren = el.children
            , prevChildren = []
            , nextChildren
          ;
          if (!el.children) {
            el.children = [];
          }
          if (el.doc) {
            cur.docs = docsMap[el.doc].ancestors.concat(el.doc);
          }
          if (el.entity) {
            cur.entities = docsMap[el.entity].ancestors.concat(el.entity);
          }
          cur.children = TEI._loadChildren(cur);
          if (el.prevChild || el.nextChild) {
            if (el.prevChild) {
              prevChildren = el.children.slice(0, el.prevChild + 1);
              deleteChildren = deleteChildren.slice(el.prevChild + 1);
            }
            if (el.nextChild) {
              nextChildren = el.children.slice(el.nextChild);
              deleteChildren = deleteChildren.slice(
                0, el.prevChild - prevChildren.length);
            }
            cur.children = prevChildren.concat(cur.children, nextChildren);
            updateTeis.push(cur);
            deleteTeis = deleteTeis.concat(deleteChildren);
          } else {
            insertTeis.push(cur);
          }
        });
        console.log('--------docs--------');
        console.log(docRoot);
        console.log(docs);
        console.log('--------deleteTeis--------');
        console.log(deleteTeis);
        console.log('--------updateTeis--------');
        console.log(updateTeis);
        console.log('--------insertTeis--------');
        console.log(insertTeis);

        async.parallel([
          function(cb1) {
            self.children = docRoot.children;
            self.save(cb1);
          },
          function(cb1) {
            if (docs.length > 0) {
              Doc.collection.insert(docs, cb1)
            } else {
              cb1(null, []);
            }
          },
          function(cb1) {
            // save entities;
            cb1(null, []);
          },
          function(cb1) {
            if (deleteTeis.length > 0) {
              TEI.collection.remove({
                $or: [
                  {ancestors: {$in: deleteTeis}},
                  {_id: {$in: deleteTeis}},
                ]
              }, cb1);
            } else {
              cb1(null, []);
            }
          },
          function(cb1) {
            if (updateTeis.length > 0) {
              TEI.collection.update(updateTeis, cb1)
            } else {
              cb1(null, []);
            }
          },
          function(cb1) {
            if (insertTeis.length > 0) {
              TEI.collection.insert(insertTeis, cb1)
            } else {
              cb1(null, []);
            }
          },
        ], function(err, results) {
          console.log(results);
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
