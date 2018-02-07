const mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Types.ObjectId
  , async = require('async')
  , _ = require('lodash')
  , Error = require('../common/error')
;

const TreeStructureError = Error.extend('TreeStructureError');
const MultipleRootError = Error.extend('MultipleRootError');
const ParentNotFound = Error.extend('ParentNotFound');

function _idEqual(id1, id2) {
  return ObjectId.isValid(id1) && ObjectId.isValid(id2) &&
    (new ObjectId(id1)).equals(id2);
}

const _methods = {
};

const _statics = {
  getParent: function(id, callback) {
    return this.findOne({children: id}, callback);
  },
  getAncestors: function(id, callback) {
    var cls = this;
    async.waterfall([
      function(cb) {
        cls.findOne({_id: id}, cb);
      },
      function(node) { // get ancestors
        const cb = _.last(arguments);
        if (!node) {
          return cb(null, []);
        }
        cls.find({_id: {$in: node.ancestors}}, cb);
      },
    ], callback);
  },
  getPrev: function(id, callback) {
    var cls = this;
    async.waterfall([
      _.partial(cls.getParent.bind(cls), id),
      function(parent) { // get prev node
        const cb = _.last(arguments);
        if (parent) {
          var index = _.findIndex(parent.children, function(childId) {
            return _idEqual(childId, id);
          });
          if (index > 0) {
            return cls.findOne({_id: parent.children[index - 1]}, cb);
          } else if (index < 0) {
            return cb(new TreeStructureError(
              `can not find ${id} in ${parent._id} children`
            ));
          }
        }
        return cb(null, null);
      },
    ], callback);
  },
  getNext: function(id, callback) {
    var cls = this;
    cls._getParentAndIndex(id, function(err, parent, index) {
      if (parent && (index < parent.children.length - 1)) {
        return cls.findOne({_id: parent.children[index + 1]}, callback);
      } else {
        return callback(err, null);
      }
    });
  },
  insertFirst: function(parent, node, callback) {
    if (parent) {
      parent.children.unshift(node._id);
      node.ancestors = parent.ancestors.concat(parent._id);
      return async.parallel([
        function(cb) {
          parent.save(cb);
        },
        function(cb) {
          node.save(function(err, node) {
            cb(err, node);
          });
        },
      ], function(err, results) {
        callback(err, _.get(results, 1));
      });
    } else {
      return callback(new ParentNotFound());
    }
  },
  insertAfter: function(target, node, callback) {
    const cls = this;
    async.waterfall([
      function(cb) {
        cls._getParentAndIndex(target._id, cb);
      },
      function(parent, index) {
        const cb = _.last(arguments);
        if (parent) {
          parent.children.splice(index + 1, 0, node._id);
          node.ancestors = parent.ancestors.concat(parent._id);
          async.parallel([
            function(cb1) {
              parent.save(cb1);
            },
            function(cb1) {
              node.save(function(err, node) {
                cb1(err, node);
              });
            },
          ], function(err, results) {
            return cb(err, _.get(results, 1))
          });
        } else {
          cb(new ParentNotFound());
        }
      },
    ], callback);
  },
  _getParentAndIndex: function(id, callback) {
    var cls = this;
    async.waterfall([
      function(cb) {
        cls.getParent(id, cb);
      },
      function(parent) {
        const cb = _.last(arguments);
        if (parent) {
          var index = _.findIndex(parent.children, function(childId) {
            return _idEqual(childId, id);
          });
          if (index < 0) {
            return cb(new TreeStructureError(
              `can not find ${id} in ${parent._id} children`
            ));
          }
          cb(null, parent, index);
        }
        return cb(null, null, null);
      },
    ], callback);
  },
  /*
    * @param tree - nested tree style data,
    *              ex. {name: foo, children: [{name: child1, children: []}]}
    */
  import: function(tree, callback) {
    const nodes = this._loadNodesFromTree(tree);
    this.collection.insert(nodes, callback);
    return nodes;
  },
  _loadNodesFromTree: function(tree) {
    var cls = this
      , nodes = []
      , cur
    ;
    _.dfs([tree], function(nodeData) {
      cur = cls.clean(nodeData);
      // children = [id1, id2, id3 ...]
      cur.children = cls._loadChildren(cur);
      nodes.push(cur);
    });
    return nodes;
  },
  _loadChildren(nodeData) {
  //  console.log("node data: "); console.log(nodeData);
    const cls = this;
    return _.map(nodeData.children, function(childData) {
      cls._assignId(childData);
      childData.ancestors = nodeData.ancestors.concat(nodeData._id);
      return childData._id;
    });
  },
  _assignId: function(nodeData) {
    if (!ObjectId.isValid(nodeData._id)) {
      nodeData._id = new ObjectId();
    } else {
      nodeData._id = new ObjectId(nodeData._id);
    }
    return nodeData;
  },
  clean: function(data) {
    const nodeData = _.defaults({}, data, {
      ancestors: [],
      children: [],
    });
    this._assignId(nodeData);
    return nodeData;
  },
  /*
    * @param leaves - list of Node
    * @param callback Function - (err, ancestors) all ancestors of leaves
    */
  getAncestorsFromLeaves: function(leaves, callback) {
    const cls = this
      , ancestors = {}
      , roots = []
    ;
    _.each(leaves, function(node) {
      _.forEachRight(node.ancestors, function(id) {
        if (!ancestors.hasOwnProperty(id)) {
          ancestors[id] = true;
        } else {
          return false;
        }
      });
    });
    return cls.find({_id: {$in: _.keys(ancestors)}}, callback);
  },
  getDeepNext: function(id, callback) {
    const cls = this;
    async.waterfall([
      function(cb) {
        cls.getAncestors(id, cb);
      },
      function(ancestors) {
        const cb = _.last(arguments);
        let cur = id
          , dfsNextId
        ;
        _.forEachRight(ancestors, function(parent) {
          const index = _.findIndex(parent.children, function(childId) {
            return _idEqual(childId, cur);
          });
          if (index < parent.children.length - 1) {
            dfsNextId = parent.children[index + 1];
            return false;
          } else { // if curNode is the last child
            cur = parent._id;
          }
        });
        if (dfsNextId) {
          cls.findOne({_id: dfsNextId}, cb);
        } else {
          cb(null, null);
        }
      },
    ], callback);
  },
  // get the deep next leaf node on the tree
  // (doesn't have to belong same parent)
  getDeepNextLeaf: function(id, callback) {
    const cls = this;
    cls.getDeepNext(id, function(err, nextDFS) {
      if (nextDFS) {
        cls.getFirstLeaf(nextDFS._id, callback);
      } else {
        callback(null, null);
      }
    });
  },
  // get the deep prev leaf node on the tree
  // (doesn't have to belong same parent)
  getDeepPrevLeaf: function(id, callback) {
    var cls = this;
    async.waterfall([
      function(cb) {
        cls.getAncestors(id, cb);
      },
      function(ancestors) {
        const cb = _.last(arguments);
        let cur = id
          , dfsPrevId
        ;
        _.forEachRight(ancestors, function(parent) {
          var index = _.findIndex(parent.children, function(childId) {
            return _idEqual(childId, cur);
          });
          if (index > 0) {
            dfsPrevId = parent.children[index - 1];
            return false;
          } else { // if curNode is the first child
            cur = parent._id;
          }
        });
        if (dfsPrevId) {
          cls.getLastLeaf(dfsPrevId, cb);
        } else {
          cb(null, null);
        }
      },
    ], callback);
  },
  getFirstLeaf: function(id, callback) {
    this._getLeaf(id, _.first, callback);
  },
  getLastLeaf: function(id, callback) {
    this._getLeaf(id, _.last, callback);
  },
  _getLeaf: function(id, getChildFunc, callback) {
    var cls = this;
    async.waterfall([
      function(cb) {
        cls.findOne({_id: id}, cb);
      },
      function(cur) {
        const cb = _.last(arguments);
        if (!cur) {
          return cb(null, null);
        }
        async.whilst(function() {
          return (cur.children || []).length > 0;
        }, function(cb1) {
          cls.findOne({_id: getChildFunc(cur.children)}, function(err, obj) {
            cur = obj;
            cb1(err);
          });
        }, function(err) {
          cb(err, cur);
        });
      }
    ], callback);
  },
  // TODO: currently only work for leaves in single tree
  orderLeaves: function(leaves, cb) {
    const cls = this;
    let ancestors = {};
    _.each(leaves, function(node) {
      // collect all ancestors of given leaves
      _.forEachRight(node.ancestors, function(id) {
        if (!ancestors.hasOwnProperty(id)) {
          ancestors[id] = true;
        } else {
          return false;
        }
      });
    });
    cls.find({_id: {$in: _.keys(ancestors)}}, function(err, results) {
      if (err) {
        return cb(err);
      }
      const root = cls.getTreeFromNodes(results.concat(leaves))
        , orderedLeaves = []
      ;
      _.dfs([root], function(node) {
        if (node && _.isEmpty(node.children)) {
          orderedLeaves.push(node.obj);
        }
      });
      cb(err, orderedLeaves);
    });
  },
  getTreeFromNodes: function(objs) {
    const nodesMap = {};
    let root = null
      , parent, children
    ;
    _.each(objs, function(obj) {
      nodesMap[obj._id] = {
        children: [],
        obj: obj,
      };
    });
    _.each(nodesMap, function(node) {
      let obj = node.obj;
      if (obj.ancestors.length === 0) {
        // only support single root for now
        if (root !== null) {
          throw new MultipleRootError(
            `found multiple root in given leaves: ${root._id} ${node._id}`
          );
        }
        root = node;
      } else {
        parent = nodesMap[_.last(obj.ancestors)];
        var index = _.findIndex(parent.obj.children, function(id) {
          return _idEqual(id, obj._id);
        });
        parent.children[index] = node;
      }
    });
    _.each(nodesMap, function(node) {
      _.remove(node.children, _.isUndefined);
    });
    return root;
  },
};

function extendNodeSchema(modelName, schema, options) {
  const nodeSchema = new Schema(_.assign({
    ancestors: {
      type: [{type: Schema.Types.ObjectId, ref: modelName}],
      index: true,
    },
    children: {
      type: [{type: Schema.Types.ObjectId, ref: modelName}],
      index: true,
    },
    // TODO: children unique check
  }, schema));

  _.assign(nodeSchema.methods, _methods, _.get(options, 'methods'));
  _.assign(nodeSchema.statics, _statics, _.get(options, 'statics'));

  return nodeSchema;
};

module.exports = extendNodeSchema;
