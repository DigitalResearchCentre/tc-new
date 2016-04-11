const mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Types.ObjectId
  , _ = require('lodash')
;

function _prepareNode(node) {
  if (!node.ancestors) {
    node.ancestors = [];
  }
  if (!node._id) {
    node._id = new ObjectId();
  } else if (_.isString(node._id)) {
    node._id = new ObjectId(node._id);
  }
  return node;
}

function _loadChildren(cur, queue) {
  const children = cur.children || []
    , ancestors = cur.ancestors.concat(cur._id)
    , ids = []
    , _children = []
  ;
  let child;
  for (var i = 0, len = children.length; i < len; i++) {
    child = children[i];
    if (!child._id) {
      child._id = new ObjectId();
    } else if (_.isString(child._id)) {
      child._id = new ObjectId(child._id);
    }
    if (!child.name) {
      child.name = '' + (i + 1);
    }
    child.ancestors = ancestors;
    _children.unshift(child);
    ids.push(child._id);
  }
  _.each(_children, function(child) {
    queue.unshift(child);
  });
  return ids;
}



const _methods = {
  getText: function() {
  },
  getChildrenAfter: function(targetId) {
    if (targetId._id) {
      targetId = targetId._id;
    }
    this.prototype.constructor.findOne({_id: targetId});
  },
};

const _statics = {
    /*
     * @param tree - nested tree style data,
     *              ex. {name: foo, children: [{name: child1, children: []}]}
     */
    import: function(tree, callback) {
      var cls = this
        , queue = []
        , nodes = [tree]
        , cur
      ;
      tree = _prepareNode(tree);
      tree.children = _loadChildren(tree, queue);
      while (queue.length > 0) {
        cur = queue.shift();
        cur.children = _loadChildren(cur, queue);
        if (_.isString(cur._id)) {
          cur._id = new ObjectId(cur._id);
        }
        nodes.push(cur);
      }
      return cls.collection.insert(nodes, callback);
    },
    getTreeFromLeaves: function(nodes, cb) {
      var cls = this
        , ancestors = {}
      ;
      _.each(nodes, function(node) {
        _.forEachRight(node.ancestors, function(id) {
          if (!ancestors.hasOwnProperty(id)) {
            ancestors[id] = true;
          } else {
            return false;
          }
        });
      });
      cls.find({_id: {$in: _.keys(ancestors)}}).exec(function(err, results) {
        if (err) {
          return cb(err);
        }
        var objs = {}
          , root, parent, children
        ;
        nodes = results.concat(nodes);
        _.each(nodes, function(node) {
          objs[node._id] = node;
        });
        _.each(objs, function(node) {
          if (node.ancestors.length === 0) {
            root = node;
          } else {
            parent = objs[_.last(node.ancestors)];
            children = parent.children;
            var index = _.findIndex(children, function(id) {
              return id.equals(node._id);
            });
            children[index] = node;
          }
        });
        cb(err, root);
      });
    },
    /*
     * @param tree - nested tree style data,
     *              ex. {name: foo, children: [{name: child1, children: []}]}
     * @param prev - prev continue element
     * @param after - left bound to insert after, null means insert at
     *                beginning of prev's child
     * @param next - next continue element
     * @param before - right bound to insert before, null means insert at the
     *                end fo next's child
     */
    replaceNodesBetween: function(
      tree, prev, after, next, before, callback
    ) {
      var cls = this
        , common = []
        , prevAncestors = prev.ancestors.concat(prev._id)
        , nextAncestors = next.ancestors.concat(next._id)
      ;
    },
    getNodesBetween: function(
      ancestors1, ancestors2, includeAncestors, callback) {
        var nodes = []
          , common = []
          , ancestors = []
          , cls = this
        ;
        if (_.isFunction(includeAncestors)) {
          callback = includeAncestors;
          includeAncestors = true;
        }
        var results = _findCommonAncestors(ancestors1, ancestors2);
        common = results[0];
        ancestors1 = results[1];
        ancestors2 = results[2];

        async.parallel([
          function(cb) {
            if (common.length > 0) {
              cls.find({_id: {$in: common}}, cb);
            } else {
              cb(null, []);
            }
          },
          function(cb) {
            if (ancestors1.length > 0) {
              cls.find({_id: {$in: ancestors1}}, cb);
            } else {
              cb(null, []);
            }
          },
          function(cb) {
            if (ancestors2.length > 0) {
              cls.find({_id: {$in: ancestors2}}, cb);
            } else {
              cb(null, []);
            }
          },
        ], function(err, results) {
          if (err) {
            return callback(err);
          }

          var children = [];
          common = results[0];
          ancestors1 = results[1];
          ancestors2 = results[2];

          if (common.length > 0) {
            children = _.last(common).children;
          }

          if (ancestors1.length > 0) {
            var found = null;
            // find siblings between an1 and an2
            _.each(children, function(id) {
              if (id.equals(ancestors2[0]._id)) {
                return false;
              }
              if (found) {
                ancestors.push(id);
              }
              if (id.equals(ancestors1[0]._id)) {
                found = true;
              }
            });
          }

          _.each(ancestors1.slice(1), function(obj, i) {
            var children = ancestors1[i].children;
            var index = _.findIndex(children, function(id) {
              return id.equals(obj._id);
            });
            ancestors = ancestors.concat(children.slice(index + 1));
          });

          _.each(ancestors2.slice(1), function(obj, i) {
            var children = ancestors2[i].children;
            _.each(children, function(id) {
              if (!id.equals(obj._id)) {
                ancestors.push(id);
              } else {
                return false;
              }
            });
          });

          cls.find({
            $or: [
              {ancestors: {$in: ancestors}},
              {_id: {$in: ancestors}}
            ],
          }, function(err, objs) {
            if (!includeAncestors) {
              callback(err, objs);
            } else {
              callback(err, common.concat(ancestors1, ancestors2, objs));
            }
          });
        });
      },
      getPrev: function(id, callback) {
        var cls = this;
        async.waterfall([
          function(cb) {
            cls.findOne({children: id}).exec(cb);
          },
          function(parent, cb) {
            if (parent) {
              var index = _.findIndex(parent.children, function(childId) {
                return childId.equals(id);
              });
              if (index > 0) {
                return cls.findOne({_id: parent.children[index - 1]}).exec(cb);
              }
            }
            return cb(null, null);
          },
        ], callback);
      },
      getOutterBound: function(leaves, callback) {
        var cls = this;

        async.waterfall([
          function(cb) {
            cls.getTreeFromLeaves(leaves, cb);
          },
          function(root, cb) {
            var cur = root
              , prevId, nextId
              , found
            ;
            while (cur && !_.isEmpty(cur.children)) {
              found = _.findIndex(cur.children, function(child) {
                return !(_.isString(child) || child instanceof ObjectId);
              });
              if (found > -1) {
                cur = cur.children[found];
              } else {
                break;
              }
            }
            if (cur) {
              prevId = cur._id;
            }
            cur = root;
            while (cur && !_.isEmpty(cur.children)) {
              found = _.findLastIndex(cur.children, function(child) {
                return !(_.isString(child) || child instanceof ObjectId);
              });
              if (found > -1) {
                cur = cur.children[found];
              } else {
                break;
              }
            }
            if (cur) {
              nextId = cur._id;
            }

            async.parallel([
              function(cb1) {
                if (prevId) {
                  var stop = false
                    , prev = null
                  ;
                  async.whilst(function() {
                    return !stop;
                  }, function(cb2) {
                    cls.getDFSPrev(prevId, function(err, node) {
                      if (!node) {
                        stop = true;
                      } else if (
                        node.name === '#text' && node.text.trim() === ''
                      ) {
                        prevId = node._id;
                      } else {
                        prev = node;
                        stop = true;
                      }
                      cb2(err);
                    });
                  }, function(err) {
                    if (err) {
                      return cb1(err);
                    }
                    if (prev) {
                      cls.find({
                        _id: {$in: prev.ancestors.concat(prev._id)}
                      }, cb1);
                    } else {
                      cb1(null, []);
                    }
                  });
                } else {
                  cb1(null, []);
                }
              },
              function(cb1) {
                if (nextId) {
                  var stop = false
                    , next = null
                  ;
                  async.whilst(function() {
                    return !stop;
                  }, function(cb2) {
                    cls.getDFSNext(nextId, function(err, node) {
                      if (!node) {
                        stop = true;
                      } else if (
                        node.name === '#text' && node.text.trim() === ''
                      ) {
                        nextId = node._id;
                      } else {
                        next = node;
                        stop = true;
                      }
                      cb2(err);
                    });
                  }, function(err) {
                    if (err) {
                      return cb1(err);
                    }
                    if (next) {
                      cls.find({
                        _id: {$in: next.ancestors.concat(next._id)}
                      }, cb1);
                    } else {
                      cb1(null, []);
                    }
                  });
                } else {
                  cb1(null, []);
                }
              },
            ], cb);
          },
        ], callback);
      },
      getDFSNext: function(id, callback) {
        var cls = this;
        async.waterfall([
          function(cb) {
            cls.findOne({_id: id}).exec(cb);
          },
          function(obj, cb) {
            if (!obj) {
              return cb(null, obj);
            }
            cls.find({_id: {$in: obj.ancestors}}).exec(cb);
          },
          function(ancestors, cb) {
            var cur = id
              , dfsNextId
            ;
            _.forEachRight(ancestors, function(parent) {
              var index = _.findIndex(parent.children, function(childId) {
                return childId.equals(cur);
              });
              if (index < parent.children.length - 1) {
                dfsNextId = parent.children[index + 1];
                return false;
              } else {
                cur = parent._id;
              }
            });
            if (dfsNextId) {
              cls.findOne({_id: dfsNextId}).exec(function(err, dfsNext) {
                if (err) {
                  cb(err);
                } else {
                  async.whilst(function() {
                    return (dfsNext.children || []).length > 0;
                  }, function(cb1) {
                    cls.findOne({_id: _.first(dfsNext.children)}).exec(
                      function(err, obj) {
                        dfsNext = obj;
                        cb1(err, obj);
                      }
                    );
                  }, function(err) {
                    if (err) {
                      return cb(err);
                    }
                    if (dfsNext) {
                      cb(null, dfsNext);
                    }
                  });
                }
              });
            } else {
              cb(null, null);
            }

          }
        ], callback);

      },
      getDFSPrev: function(id, callback) {
        var cls = this;
        async.waterfall([
          function(cb) {
            cls.findOne({_id: id}).exec(cb);
          },
          function(obj, cb) {
            if (!obj) {
              return cb(null, obj);
            }
            cls.find({_id: {$in: obj.ancestors}}).exec(cb);
          },
          function(ancestors, cb) {
            var cur = id
              , dfsPrevId
            ;
            _.forEachRight(ancestors, function(parent) {
              var index = _.findIndex(parent.children, function(childId) {
                return childId.equals(cur);
              });
              if (index > 0) {
                dfsPrevId = parent.children[index - 1];
                return false;
              } else {
                cur = parent._id;
              }
            });
            if (dfsPrevId) {
              cls.findOne({_id: dfsPrevId}).exec(function(err, dfsPrev) {
                if (err) {
                  cb(err);
                } else {
                  async.whilst(function() {
                    return (dfsPrev.children || []).length > 0;
                  }, function(cb1) {
                    cls.findOne({_id: _.last(dfsPrev.children)}).exec(
                      function(err, obj) {
                        dfsPrev = obj;
                        cb1(err, obj);
                      }
                    );
                  }, function(err) {
                    if (err) {
                      return cb(err);
                    }
                    if (dfsPrev) {
                      cb(null, dfsPrev);
                    }
                  });
                }
              });
            } else {
              cb(null, null);
            }

          }
        ], callback);
      },
      getFirstLeaf: function(id, callback) {
        var cls = this;
        async.waterfall([
          function(cb) {
            cls.findOne({_id: id}).exec(cb);
          },
          function(obj, cb) {
            if ((obj.children || []).length > 0) {
              cls.getFirstLeaf(obj.children[0], cb);
            } else {
              cb(null, obj);
            }
          }
        ], callback);
      },
  }

function extendNodeSchema(modelName, schema, options) {
  const nodeSchema = new Schema(_.assign({
    ancestors: [{type: Schema.Types.ObjectId, ref: modelName}],
    children: [{type: Schema.Types.ObjectId, ref: modelName}],
  }, schema));

  _.assign(nodeSchema.methods, _methods, _.get(options, 'methods'));
  _.assign(nodeSchema.statics, _statics, _.get(options, 'statics'));

  return nodeSchema;
};

module.exports = extendNodeSchema;

