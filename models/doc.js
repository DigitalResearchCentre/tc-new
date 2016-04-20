var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , Error = require('../common/error')
  , TEI = require('./tei')
;

const CheckLinkError = Error.extend('CheckLinkError');

var DocSchema = extendNodeSchema('Doc', {
  name: String,
  label: String,
  image: Schema.Types.ObjectId,
}, {
  methods: {
    _commit: function(teiRoot, docRoot, leftBound, rightBound, callback) {
      let self = this
        , docsMap = {}
        , updateTeis = []
        , insertTeis = []
        , deleteTeis = []
        , docEl
        , docs
      ;
      if (self.ancestors.length === 0) {
        docEl = {name: 'text'};
      } else {
        docEl = {name: self.label, attrs: {n: self.name}};
      }
      if (_.isEmpty(teiRoot)) {
        let loop = true;

        return async.whilst(
          function() {
            return loop;
          },
          function(cb) {
            return TEI.collection.remove({
              docs: self._id,
              children: [],
            }, function(err, result) {
              loop = !err && result.result.ok === 1 && result.result.n > 0;
              cb(null);
            });
          },
          function(err) {
            let tei = new TEI({
              name: self.label,
              docs: self.ancestors.concat(self._id),
            });
            if (!_.isEmpty(leftBound)) {
              tei.attrs = {n: self.name};
              console.log('777777777777777');
              console.log(leftBound);
              if (leftBound.length === 1) {
                TEI.insertFirst(_.last(leftBound), tei, callback);
              } else {
                TEI.insertAfter(_.last(leftBound), tei, callback);
              }
            } else {
              tei.save(callback);
            }
          }
        );
      }

      _checkLinks(docEl, leftBound, rightBound, teiRoot);
      _.each(leftBound, function(bound, i) {
        let child = leftBound[i+1];
        if (child) {
          let index = _.findIndex(bound.children, function(id) {
            return _idEqual(id, child._id);
          });
          let deleteChildren = bound.children.slice(index + 1);
          if (deleteChildren.length > 0) {
            deleteTeis = deleteTeis.concat(deleteChildren);
            updateTeis.push({
              _id: bound._id,
              children: bound.children.slice(0, index + 1),
            });
          }
        }
      });

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
          , deleteChildren = el._children
          , prevChildren = []
          , nextChildren = []
          , _children = []
        ;
        if (!el.children) {
          el.children = [];
        }
        if (el.doc) {
          cur.docs = docsMap[el.doc].ancestors.concat(new ObjectId(el.doc));
        }
        if (el.entity) {
          cur.entities = docsMap[el.entity].ancestors.concat(
            new ObjectId(el.entity));
        }
        cur.children = TEI._loadChildren(cur);
        console.log('@@@@@@@@@@@@');
        console.log(el);
        if (_.isNumber(el.prevChild) || _.isNumber(el.nextChild)) {
          if (el.prevChild !== el.nextChild) {
            if (_.isNumber(el.prevChild)) {
              prevChildren = el._children.slice(0, el.prevChild + 1);
              deleteChildren = deleteChildren.slice(el.prevChild + 1);
            }
            if (_.isNumber(el.nextChild)) {
              nextChildren = el._children.slice(el.nextChild);
              deleteChildren = deleteChildren.slice(
                0, deleteChildren.length - nextChildren.length);
            }
            _children = _.map(cur.children, function(child) {
              return child;
            });
            console.log('%%%%%%%%%%%%%%%%%%%%%%%');
            console.log(prevChildren);
            console.log(cur.children);
            console.log(nextChildren);
            if (_idEqual(_.first(_children), _.last(prevChildren))) {
              _children.shift();
            }
            if (_idEqual(_.last(_children), _.first(nextChildren))) {
              _children.pop();
            }
            _children = prevChildren.concat(_children, nextChildren);
            console.log(_children);
            if (_children.length > 0) {
              updateTeis.push({
                _id: cur._id,
                children: _children,
              });
            }
            console.log(deleteChildren);
            deleteTeis = deleteTeis.concat(deleteChildren);
          }
        } else {
          insertTeis.push(cur);
        }
      });
      async.parallel([
        function(cb1) {
          self.children = docRoot.children;
          console.log('--------self--------');
          console.log(self);
          self.save(function(err) {
            console.log('save done');
            cb1(err, self);
          });
        },
        function(cb1) {
          if (docs.length > 0) {
            console.log('--------docs--------');
            console.log(docs);
            Doc.collection.insert(docs, function(err) {
              console.log('docs done');
              cb1(err);
            });
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
            console.log('--------deleteTeis--------');
            console.log(deleteTeis);
            TEI.collection.remove({
              $or: [
                {ancestors: {$in: deleteTeis}},
                {_id: {$in: deleteTeis}},
              ]
            }, function(err) {
              console.log('delete teis done');
              cb1(err);
            });
          } else {
            cb1(null, []);
          }
        },
        function(cb1) {
          if (updateTeis.length > 0) {
            console.log('--------updateTeis--------');
            console.log(updateTeis);
            async.forEachOf(updateTeis, function(tei) {
              const cb2 = _.last(arguments);
              TEI.collection.update({_id: tei._id}, {
                $set: {children: tei.children},
              }, cb2);
            }, function(err) {
              console.log('update teis done');
              cb1(err);
            });
          } else {
            cb1(null, []);
          }
        },
        function(cb1) {
          if (insertTeis.length > 0) {
            console.log('--------insertTeis--------');
            console.log(insertTeis);
            TEI.collection.insert(insertTeis, function(err) {
              console.log('insert done');
              cb1(err);
            });
          } else {
            cb1(null, []);
          }
        },
      ], callback);     
    },
    commit: function(data, callback) {
      var self = this
        , teiRoot = data.tei || {}
        , docRoot = _.defaults(data.doc, self.toObject()) 
      ;
      async.waterfall([
        function(cb) {
          Doc.getOutterTextBounds(self._id, cb);
        },
        function(leftBound, rightBound) {
          const cb = _.last(arguments)
          if (!_.isEmpty(teiRoot)) {
            _.dfs([teiRoot], function(el) {
              el.children = _.filter(el.children, function(child) {
                return !(
                  child.name === '#text' && 
                  (child.text || '').trim() === ''
                );
              });
            });
          }
          self._commit(teiRoot, docRoot, leftBound, rightBound, cb);
        },
      ], callback);
    },
  },
  statics: {
    clean: function(data) {
      const nodeData = _.defaults(
        {}, _.pick(data, [
          '_id', 'name', 'label', 'image', 'children', 'ancestors'
        ]), {
          ancestors: [],
          children: [],
        }
      );
      this._assignId(nodeData);
      return nodeData;
    },
    getTextsLeaves: function(id, callback) {
      async.waterfall([
        function(cb) {
          console.log('--------------');
          console.log(id);
          TEI.find({docs: id}, cb);
        },
        function(texts) {
          const cb = _.last(arguments);
          TEI.orderLeaves(texts, cb);
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
      *            <pb n="3"/>
      *          </div1>
      *  should return [div1, div2 ab1, t1], [div1]
      */
      const cls = this;
      async.parallel([
        function(cb) {
          cls.getLeftTextBound(id, cb);
        },
        function(cb) {
          cls.getRightTextBound(id, cb);
        },
      ], function(err, results) {
        console.log('left bounds');
        console.log(results[0]);
        console.log('right bounds');
        console.log(results[1]);
        callback(err, results[0], results[1]);
      });
    },
    getLeftTextBound: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls._getParentAndIndex(id, cb);
        },
        function(parent, index) {
          const cb = _.last(arguments);
          console.log('p and i');
          console.log(parent);
          console.log(index);
          if (!parent) {
            cb(null, []);
          } else if (index === 0) {
            async.waterfall([
              function(cb1) {
                TEI.find({docs: parent.ancestors.concat(parent._id)}, cb1);
              },
              function(texts) {
                const cb1 = _.last(arguments);
                TEI.orderLeaves(texts, cb1);
              },
              function(orderedLeaves) {
                const cb1 = _.last(arguments);
                const node = _.last(orderedLeaves);
                if (node) {
                  TEI.getAncestors(node._id, function(err, ancestors) {
                    cb1(err, (ancestors || []).concat(node));
                  });
                } else {
                  cb1(null, []);
                }
              }
            ], cb);
          } else {
            cls.getLastTextPath(parent.children[index - 1], cb);
          }
        }
      ], callback);
    },
    getRightTextBound: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls.getNext(id, cb);
        },
        function(next) {
          const cb = _.last(arguments);
          if (!next) {
            return cb(null, []);
          }
          TEI.find({docs: next.ancestors.concat(next._id)}, cb);
        },
        function(texts) {
          const cb = _.last(arguments);
          if (_.isEmpty(texts)) {
            return cb('ok', []);
          }
          TEI.orderLeaves(texts, cb);
        },
        function(orderedLeaves) {
          const cb = _.last(arguments);
          if (_.isEmpty(orderedLeaves)) {
            return cb('ok', []);
          }
          let node = _.first(orderedLeaves);
          TEI.getAncestors(node._id, function(err, ancestors) {
            cb(err, ancestors.concat(node));
          });
        },
      ], function(err, bound) {
        if (err === 'ok') {
          err = null;
        }
        callback(err, bound);
      });
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
            TEI.getAncestors(node._id, function(err, ancestors) {
              cb(err, (ancestors || []).concat(node));
            });
          } else {
            cb(null, []);
          }
        },
      ], callback);
    },
    getLastTextPath: function(id, callback) {
      const cls = this;
      console.log('getLastTextPath');
      async.waterfall([
        function(cb) {
          cls.getLastText(id, cb);
        },
        function(node) {
          const cb = _.last(arguments);
          console.log('last text');
          console.log(node);
          if (node) {
            TEI.getAncestors(node._id, function(err, ancestors) {
              console.log(ancestors);
              console.log(node);
              cb(err, (ancestors || []).concat(node));
            });
          } else {
            cb(null, []);
          }
        }
      ], callback);
    },
    getFirstText: function(id, callback) {
      const cls = this;
      cls.getTextsLeaves(id, function(err, texts) {
        callback(err, _.first(texts));
      });
    },
    getLastText: function(id, callback) {
      const cls = this;
      cls.getTextsLeaves(id, function(err, texts) {
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

function _isContinueEl(el1, el2) {
  const attrs1 = _.get(el1, 'attrs', {})
    , attrs2 = _.get(el2, 'attrs', {})
  ;
  return (el1.name === '*' || el2.name === '*' || el1.name === el2.name) &&
    attrs1.n === attrs2.n;
}

function _elAssign(el, node) {
  el._id = node._id;
  el._children = node.children;
}

function _idEqual(id1, id2) {
  return ObjectId.isValid(id1) && ObjectId.isValid(id2) && 
    (new ObjectId(id1)).equals(id2);
}

function _checkLinks(docEl, prevs, nexts, teiRoot) {
  var cur = teiRoot
    , continueTeis = {}
  ;
  console.log('check ...');
  console.log(docEl);
  _.dfs([teiRoot], function(el) {
    console.log('el');
    console.log(el);
    if (_isContinueEl(docEl, el)) {
      return false;
    }
    let bound = prevs.shift()
      , continueChild, index
    ;
    console.log(bound);
    console.log(_.first(prevs));
    if (bound && _isContinueEl(bound, el)) {
      _elAssign(el, bound);
      continueChild = _.first(prevs);
      if (continueChild) {
        el.prevChild = _.findIndex(bound.children, function(id) {
          return _idEqual(id, continueChild._id);
        });
      } else {
        el.prevChild = -1;
      }
    } else {
      let en = _.get(el, 'attrs.n')
        , bn = _.get(bound, 'attrs.n')
      ;
      bound = bound || {};
      throw new CheckLinkError(
        `prevs element is not match: ${el.name} ${en}, ${bound.name} ${bn}`);
    }
  });

  _.dfs([teiRoot], function(el) {
    let bound = nexts.shift()
      , continueChild
    ;
    if (!bound || nexts.length === 0) {
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
        `nexts element is not match: ${el.name}, ${bound.name}`);
    }
  }, function(el) {
    let children = [];
    _.forEachRight(el.children || [], function(childEl) {
      children.push(childEl);
    });
    return children;
  });
}

const Doc = mongoose.model('Doc', DocSchema);
module.exports = Doc;
