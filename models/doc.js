var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , libxml = require('libxmljs')
  , Error = require('../common/error')
  , TEI = require('./tei')
;

const CheckLinkError = Error.extend('CheckLinkError');

var DocSchema = extendNodeSchema('Doc', {
  name: String,
  label: String,
  header: String,
  image: Schema.Types.ObjectId,
  meta: Schema.Types.Mixed,
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

      let boundsMap = _boundsMap(leftBound, rightBound);
      let errors = _linkBounds(docEl, leftBound, rightBound, teiRoot);

      // load docs
      docs = Doc._loadNodesFromTree(docRoot);
      _.each(docs, function(d) {
        docsMap[d._id.toString()] = d;
      });
      docRoot = docs.shift();
      // load entities
      // load teis

      _.dfs([teiRoot], function(el) {
        let cur = TEI.clean(el);
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
        if (el._bound) {
          let item = boundsMap[el._id.toString()];
          if (item.el) {
            errors.push(`continue element ${_el2str(el)} break on page`);
          } else {
            item.el = el;
            item.newChildren = cur.children;
          }
        } else {
          insertTeis.push(cur);
        }
        _.each(el.children, function(child, i) {
          child.prev = el.children[i-1];
          child.next = el.children[i+1];
        });
      });

      let results = _parseBound(boundsMap);
      errors = errors.concat(results.errors);
      deleteTeis = deleteTeis.concat(results.deleteTeis);
      updateTeis = results.updateTeis;

      if (errors.length > 0) {
        return callback(new CheckLinkError(errors.join('<br/>')));
      }

      async.parallel([
        function(cb1) {
          self.children = docRoot.children;
          self.save(function(err) {
            console.log('save done');
            cb1(err, self);
          });
        },
        function(cb1) {
          if (docs.length > 0) {
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
            async.forEachOf(updateTeis, function(up) {
              const cb2 = _.last(arguments);
              TEI.collection.update({_id: up._id}, {
                $set: {children: up.children},
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
        , revision = data.revision
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
          self._commit(teiRoot, docRoot, leftBound, rightBound, function(err) {
            return cb(err, self);
          });
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
    getTexts: function(id, callback) {
      let results = [];
      async.waterfall([
        function(cb) {
          TEI.find({docs: id, children: []}, cb);
        },
        function(nodes) {
          const cb = _.last(arguments);
          results = nodes;
          console.log('nodes');
          console.log(nodes.length);
          TEI.getAncestorsFromLeaves(nodes, cb);
        },
        function(ancestors) {
          const cb = _.last(arguments);
          console.log('ancestors');
          console.log(ancestors.length);
          cb(null, ancestors.concat(results));
        },
      ], callback);
    },
    getTextsLeaves: function(id, callback) {
      async.waterfall([
        function(cb) {
          TEI.find({docs: id}, cb);
        },
        function(texts) {
          const cb = _.last(arguments);
          TEI.orderLeaves(texts, cb);
        }
      ], callback);
    },
    /*
    * example: <div1>
    *            <div2>
    *              <pb n="1"/><ab1><t1/></ab1>
    *              <pb n="2"/>
    *            <div2>
    *            <t2/>
    *            <pb n="3"/>
    *          </div1>
    *  should return [div1, div2 ab1, t1], [div1, pb]
    */
    getOutterTextBounds: function(id, callback) {
      const cls = this;
      async.parallel([
        function(cb) {
          cls.getLeftTextBound(id, cb);
        },
        function(cb) {
          cls.getRightTextBound(id, cb);
        },
      ], function(err, results) {
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
      async.waterfall([
        function(cb) {
          cls.getLastText(id, cb);
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
  }
});


function _isContinueEl(el1, el2) {
  const attrs1 = _.get(el1, 'attrs', {})
    , attrs2 = _.get(el2, 'attrs', {})
  ;
  return (el1.name === '*' || el2.name === '*' || el1.name === el2.name) &&
    attrs1.n === attrs2.n;
}


function _idEqual(id1, id2) {
  return ObjectId.isValid(id1) && ObjectId.isValid(id2) && 
    (new ObjectId(id1)).equals(id2);
}

function _el2str(el) {
  return `${el.name}`
}

function _boundsMap(leftBound, rightBound) {
  const boundsMap = {};
  _.each(leftBound, function(bound, i) {
    let child = leftBound[i+1];
    let item = boundsMap[bound._id.toString()] = {
      bound: bound,
    };
    if (child) {
      let index = _.findIndex(bound.children, function(id) {
        return _idEqual(id, child._id);
      });
      item.prevChild = index;
    }
  });
  _.each(rightBound, function(bound, i) {
    let child = rightBound[i+1];
    let item = boundsMap[bound._id.toString()];
    if (!item) {
      item = boundsMap[bound._id.toString()] = {
        bound: bound,
      };
    }
    if (child) {
      let index = _.findIndex(bound.children, function(id) {
        return _idEqual(id, child._id);
      });
      item.nextChild = index;
    }
  });
  return boundsMap;
}

function _linkBounds(docEl, leftBound, rightBound, teiRoot) {
  let errors = [];
  _.dfs([teiRoot], function(el) {
    if (_isContinueEl(docEl, el)) {
      return false;
    } else {
      let bound = leftBound.shift();
      if (bound && _isContinueEl(bound, el)) {
        el._id = bound._id;
        el._bound = true;
      } else {
        errors.push(`prev page element is not match: 
                    ${_el2str(el)} ${_el2str(bound)}`);
      }
    }
  });

  _.dfs([teiRoot], function(el) {
    if (rightBound.length > 1) {
      let bound = rightBound.shift();
      if (_isContinueEl(bound, el)) {
        el._id = bound._id;
        el._bound = true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }, function(el) {
    let children = [];
    _.forEachRight(el.children || [], function(childEl) {
      children.push(childEl);
    });
    return children;
  });
  
  return errors;
}

function _parseBound(boundsMap) {
  let errors = []
    , deleteTeis = []
    , updateTeis = []
  ;
  _.each(boundsMap, function(item) {
    let bound = item.bound
      , el = item.el
      , prevChild = item.prevChild
      , nextChild = item.nextChild
      , newChildren = item.newChildren || []
      , deleteChildren = bound.children
      , prevChildren = []
      , nextChildren = []
      , _children = []
    ;
    if (!el && _.isNumber(prevChild) && _.isNumber(nextChild)) {
      errors.push(`${_el2str(bound)} element missing`);
    }
    if (_.isNumber(prevChild)) {
      if (el && el.prev) {
        errors.push(
          `prev page element can not have prev sibling: ${_el2str(el)}`);
      }
      prevChildren = bound.children.slice(0, prevChild + 1);
      deleteChildren = deleteChildren.slice(prevChild + 1);
    }
    if (_.isNumber(nextChild)) {
      if (el && el.next) {
        errors.push(
          `next page element can not have next sibling: ${_el2str(el)}`);
      }
      nextChildren = bound.children.slice(nextChild);
      deleteChildren = deleteChildren.slice(
        0, deleteChildren.length - nextChildren.length);
    }
    if (!_.isNumber(prevChild) || prevChild !== nextChild) {
      if (_idEqual(_.first(newChildren), _.last(prevChildren))) {
        _children = prevChildren.concat(newChildren.slice(1));
      } else {
        _children = prevChildren.concat(newChildren);
      }
      if (_idEqual(_.last(_children), _.first(nextChildren))) {
        _children.pop();
      }
      _children = _children.concat(nextChildren);
      if (!_.isEqual(_children, bound.children)) {
        updateTeis.push({
          _id: bound._id,
          children: _children,
        });
      }
      deleteTeis = deleteTeis.concat(deleteChildren);
    }
  });
  return {
    errors: errors,
    updateTeis: updateTeis,
    deleteTeis: deleteTeis,
  };
}

const Doc = mongoose.model('Doc', DocSchema);
module.exports = Doc;
