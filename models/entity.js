var mongoose = require('mongoose')
  , ObjectId = mongoose.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , TEI = require('./tei')
;

const EntitySchema = extendNodeSchema('Entity', {
  name: { type: String, index: true },
  entityName: { type: String, index: true },
  ancestorName: { type: String, index: true },
  isTerminal: Boolean,
  hasCollation: Boolean,
  childOrder: [],
}, {
  statics: {
    updateTree: function(entityRoot, callback) {

    },
    getDocIds: function(entityId, docId, callback) {
      if (_.isString(entityId)) {
        entityId = new ObjectId(entityId);
      }
      if (_.isString(docId)) {
        docId = new ObjectId(docId);
      }
      async.waterfall([
        function(cb) {
          if (docId) {
            Entity.Doc.findOne({_id: docId}).exec(cb);
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
        Entity.Doc.find({_id: {$in: result.values}}).exec(callback);
      });
    },
  }
});
var Entity = mongoose.model('Entity', EntitySchema);

module.exports = Entity;
