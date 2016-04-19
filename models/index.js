var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
  , OId = mongoose.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , Community = require('./community')
  , Doc = require('./doc')
  , TEI = require('./tei')
;

var ActionSchema = new Schema({
  type: String,
  payload: Schema.Types.Mixed,
  error: Schema.Types.Boolean,
  created: {type: Date, default: Date.now},
});


var TaskSchema = new Schema({
  user: {type: ObjectId, ref: 'User'},
  doc: {type: ObjectId, ref: 'Doc'},
});

var RevisionSchema = new Schema({
  doc: {type: ObjectId, ref: 'Doc'},
  user: {type: ObjectId, ref: 'User'},
  created: {type: Date, default: Date.now},
  committed: {type: Date, default: Date.now},
  status: String, // submitted committed previsous_db
  text: String,
  spentTime: Number,
});

var InvitationSchema = new Schema({

});

function _findCommonAncestors(ancestors1, ancestors2) {
  var common = [];
  if (!_.isArray(ancestors1)) {
    ancestors1 = ancestors1.ancestors;
  }
  if (!_.isArray(ancestors2)) {
    ancestors2 = ancestors2.ancestors;
  }

  _.each(_.zip(ancestors1, ancestors2), function(ids) {
    if (ids[0] && ids[1] && ids[0].equals(ids[1])) {
      common.push(ids[0]);
    } else {
      return false;
    }
  });
  ancestors1 = ancestors1.slice(common.length);
  ancestors2 = ancestors2.slice(common.length);
  return [common, ancestors1, ancestors2];
}

function _prepareNode(node) {
  if (!node.ancestors) {
    node.ancestors = [];
  }
  if (!node._id) {
    node._id = new OId();
  } else if (_.isString(node._id)) {
    node._id = new OId(node._id);
  }
  return node;
}
function _loadChildren(cur, queue) {
  var children = cur.children || []
    , ids = []
    , ancestors = cur.ancestors.concat(cur._id)
    , _children = []
  ;
  for (var i = 0, len = children.length; i < len; i++) {
    var child = children[i];
    if (!child._id) {
      child._id = new OId();
    } else if (_.isString(child._id)) {
      child._id = new OId(child._id);
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

const EntitySchema = extendNodeSchema('Entity', {
  name: String,
}, {
  statics: {
    getDocIds: function(entityId, docId, callback) {
      if (_.isString(entityId)) {
        entityId = new OId(entityId);
      }
      if (_.isString(docId)) {
        docId = new OId(docId);
      }
      async.waterfall([
        function(cb) {
          if (docId) {
            Doc.findOne({_id: docId}).exec(cb);
          } else {
            cb(null, null);
          }
        },
        function(doc, cb) {
          var key, query;
          if (doc) {
            key =  'docs.' + (doc.ancestors.length + 1);
            query = {
              $and: [{
                docs: docId,
                entities: entityId,
              }]
            };
          } else {
            key = 'docs.0';
            query = {
              entities: entityId,
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
    getDocs: function(entityId, docId, callback) {
      this.getDocIds(entityId, docId, function(err, result) {
        if (err) {
          return callback(err);
        }
        if (result.ok !== 1) {
          return callback(result);
        }
        Doc.find({_id: {$in: result.values}}).exec(callback);
      });
    },
  }
});
var Entity = mongoose.model('Entity', EntitySchema);

module.exports = {
  Community: Community,
  User:  require('./user'),
  Doc: Doc,
  Entity: Entity,
  TEI: TEI,
  Revision: mongoose.model('Revision', RevisionSchema),
  Action: mongoose.model('Action', ActionSchema),
};
