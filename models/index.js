var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
  , OId = mongoose.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
;

var CommunitySchema = new Schema({
  name: String,
  abbr: String,
  longName: String,
  description: String,
  fonts: [String],
  public: Boolean,
  accept: Boolean,
  autoaccept: Boolean,
  alldolead: Boolean,
  alltranscribeall: Boolean,
  haspicture: Boolean,
  image: String,
  documents: [{type: ObjectId, ref: 'Doc'}],
  entities: [{type: ObjectId, ref: 'Entity'}],
});

_.assign(CommunitySchema.methods, {
  getstatus: function(callback) {
    var community = this;
    var documents = _.map(community.documents, function(doc) {
      if (_.isObject(doc) && doc._id) {
        return doc._id;
      }
      return doc;
    });
    return async.waterfall([
      function(cb) {
        return Doc.find({_id: {$in: documents}}).populate({
          path: 'children',
          select: 'revisions',
        }).exec(cb);
      },
    ], function(err, documents) {
      if (err) {
        return callback(err);
      }
      var numOfPages = 0
        , numOfTranscripts = 0
        , numOfPagesTranscribed = 0
      ;
      _.each(documents, function(doc) {
        numOfPages += (doc.children || []).length;
        _.each(doc.children, function(child) {
          var l = child.revisions.length;
          numOfTranscripts += l;
          numOfPagesTranscribed += l > 0 ? 1 : 0;
        });
      });
      return callback(null, {
        numOfTranscripts: numOfTranscripts,
        numOfPages: numOfPages,
        numOfPagesTranscribed: numOfPagesTranscribed,
      });
    });
  },
});

_.assign(CommunitySchema.statics, {
  optionalFields: ['status'],
});
var Community = mongoose.model('Community', CommunitySchema);


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

var DocSchema = extendNodeSchema('Doc', {
  label: String,
  image: ObjectId,
  revisions: [{type: ObjectId, ref: 'Revision'}],
}, {
  methods: {
    commit: function(data, callback) {
      var self = this
        , teiRoot = data.tei || {}
        , docRoot = self.toObject()
        , continueTeis
      ;

      console.log('commit');
      docRoot.children = data.doc.children;

      async.parallel([
        function(cb) {
          Doc.getOutterBoundTexts(self._id, cb);
        },
        function(cb) {
          var rootDocId = self._id;
          if (self.ancestors.length > 0) {
            rootDocId = self.ancestors[0];
          }
          Community.findOne({documents: rootDocId}).exec(cb);
        },
      ], function(err, results) {
        var bounds = results[0]
          , community = results[1]
          , entities = []
          , updateEntities = []
          , fakeEntity
          , result
          , entityRoot
        ;
        if (err) {
          return callback(err);
        }
        if (!community) {
          return callback(err);
        }
        continueTeis = _checkLinks(bounds[0], bounds[1], teiRoot);
        if (continueTeis.error) {
          return callback(continueTeis);
        }
        result = _parseTei(teiRoot, docRoot);
        self.children = docRoot.children;
        entityRoot = result.entityRoot;
        fakeEntity = {
          fake: true,
          ancestors: [],
          children: community.entities,
        };

        async.parallel([
          function(cb) {
            Doc.remove({ancestors: self._id}, function(err) {
              if (err) {
                cb(err);
              }
              async.parallel([
                function(cb1) {
                  self.save(function(err, doc) {
                    cb1(err, doc);
                  });
                },
                function(cb1) {
                  console.log('--- save doc ---');
                  if (result.docs.length > 0) {
                    Doc.collection.insert(result.docs, function(err, objs) {
                      console.log('--- save doc done ---');
                      cb1(err, objs);
                    });
                  } else {
                    cb1(err, []);
                  }
                },
              ], cb);
            });
          },
          function(cb) {
            updateEntityTree(
              fakeEntity, entityRoot, entities, updateEntities,
              function(err) {
                if (err) {
                  return cb(err);
                }
                async.parallel([
                  function(cb1) {
                    _commitTEI(continueTeis, result.teis, cb1);
                  },
                  function(cb1) {
                    if (entities.length > 0) {
                      Entity.collection.insert(entities, cb1);
                    } else {
                      cb1(null, []);
                    }
                  },
                  function(cb1) {
                    async.each(updateEntities, function(entity, cb2) {
                      if (entity.fake) {
                        Community.collection.update({
                          _id: community._id,
                        }, {
                          $addToSet: {
                            entities: {$each: entity.children},
                          },
                        }, cb2);
                      } else {
                        Entity.collection.update({
                          _id: entity._id,
                        }, {
                          $set: {children: entity.children},
                        }, cb2);
                      }
                    }, cb1);
                  },
                ], function(err) {
                  console.log(updateEntities);
                  cb(err);

                });
              }
            );
          },
        ], function(err) {
          console.log('commit');
          console.log(err);
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
    }
  },
  statics: {
    getOutterBoundTexts: function(id, callback) {
      TEI.find({
        $and: [
          {docs: id},
          {$nor: [{name: '#text', text: /^\s+$/}]},
        ]
      }).exec(function(err, nodes) {
        if (err) {
          return callback(err);
        }
        TEI.getOutterBound(nodes, callback);
      });
    },
    getEntityIds: function(docId, entityId, callback) {
      if (_.isString(docId)) {
        docId = new OId(docId);
      }
      if (_.isString(entityId)) {
        entityId = new OId(entityId);
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
            return !(_.isString(child) || child instanceof OId) &&
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
            return !(_.isString(child) || child instanceof OId) &&
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

function _checkLinks(prevs, nexts, teiRoot) {
  var cur = teiRoot
    , continueTeis = {}
    , prev, next
  ;
  while (cur.prev) {
    prev = prevs.shift();
    cur.prev = new OId(cur.prev);
    if (prev && prev._id.equals(cur.prev)) {
      cur._id = cur.prev;
      continueTeis[cur._id] = cur;
      if (prevs.length > 0) {
        cur.prevChildIndex = _.findIndex(prev.children, function(id) {
          if (id._id) {
            id = id._id;
          }
          return id.equals(prevs[0]._id);
        });
        cur._children = _.map(prev.children, function(child) {
          if (_.isString(child)) {
            child = new OId(child);
          } else if (child._id) {
            child = child._id;
          }
          return child;
        });
        cur.nextChildIndex = cur._children.length;
      } else {
        return new Error('prev element is not match: ' + cur);
      }
      if ((cur.children || []).length > 0) {
        cur = cur.children[0];
      } else {
        cur = {};
      }
    } else {
      return new Error('prev elements are not match: ' + prev._id + ' ' + cur);
    }
  }
  while (prevs.length > 1) {
    prev = prevs.shift();
    cur = {
      _id: prev._id,
      attrs: prev.attrs,
      children: [],
    };
    continueTeis[cur._id] = cur;
    cur.prevChildIndex = _.findIndex(prev.children, function(id) {
      if (id._id) {
        id = id._id;
      }
      return id.equals(prevs[0]._id);
    });
    cur._children = _.map(prev.children, function(child) {
      if (_.isString(child)) {
        child = new OId(child);
      } else if (child._id) {
        child = child._id;
      }
      return child;
    });
    cur.nextChildIndex = cur._children.length;
  }
  cur = teiRoot;
  while (cur.next) {
    next = nexts.shift();
    cur.next = new OId(cur.next);
    if (next && next._id.equals(cur.next)) {
      cur._id = new OId(cur.next);
      continueTeis[cur._id] = cur;

      if (cur.prev && !cur.next.equals(cur.prev)) {
        return new Error('prev and next conflict' + cur.prev + ' ' + cur.next);
      }
      if (nexts.length > 0) {
        cur.nextChildIndex = _.findIndex(next.children, function(id) {
          if (id._id) {
            id = id._id;
          }
          return id.equals(nexts[0]._id);
        });
        cur._children = _.map(next.children, function(child) {
          if (_.isString(child)) {
            child = new OId(child);
          } else if (child._id) {
            child = child._id;
          }
          return child;
        });
        if (!cur.hasOwnProperty('prevChildIndex')) {
          cur.prevChildIndex = -1;
        }
      } else {
        return new Error('next element is not match: ' + next.children);
      }

      if ((cur.children || []).length > 0) {
        cur = _.last(cur.children);
      } else {
        cur = {};
      }
    } else {
      return new Error('next elements are not match' + next._id + ' ' + cur);
    }
  }
  while (nexts.length > 1) {
    next = nexts.shift();
    cur = {
      _id: next._id,
      attrs: next.attrs,
      children: [],
    };
    continueTeis[cur._id] = cur;
    cur.nextChildIndex = _.findIndex(next.children, function(id) {
      if (id._id) {
        id = id._id;
      }
      return id.equals(nexts[0]._id);
    });
    cur._children = _.map(next.children, function(child) {
      if (_.isString(child)) {
        child = new OId(child);
      } else if (child._id) {
        child = child._id;
      }
      return child;
    });
    if (!cur.hasOwnProperty('prevChildIndex')) {
      cur.prevChildIndex = -1;
    }
  }
  return continueTeis;
}

function _parseTei(teiRoot, docRoot) {
  var docMap = {}
    , docs = []
    , teis = []
    , continueTeis = {}
    , entityRoot = {children: [], texts: [], ancestors: []}
    , queue, cur, foundPrev, foundNext, entity
  ;
  teiRoot.parentEntity = entityRoot;

  docMap[docRoot._id] = docRoot;
  console.log('--- start commit ---');
  console.log('--- parse docs ---');
  queue = [];
  docRoot.children = _loadChildren(docRoot, queue);
  while (queue.length > 0) {
    cur = queue.shift();
    cur.children = _loadChildren(cur, queue);
    if (_.isString(cur._id)) {
      cur._id = new OId(cur._id);
    }
    docs.push(cur);
    docMap[cur._id] = cur;
  }
  console.log(docMap);

  console.log('--- parse entity ---');
  //  Entity
  console.log('--- parse xmls ---');
  //  TEI
  queue = [teiRoot];
  _.defaults(teiRoot, {
    ancestors: [],
    children: [],
    _id: new OId(),
  });

  while (queue.length > 0) {
    cur = queue.shift();
    if (cur.name === '#text') {
      cur.children = [];
    }
    if (!cur.children) {
      cur.children = [];
    }
    if (cur.entity) {
      entity = {
        name: cur.entity,
        children: [],
        texts: [],
      };
      cur.parentEntity.children.push(entity);
      _.each(cur.children, function(child) {
        child.parentEntity = entity;
      });
    } else {
      _.each(cur.children, function(child) {
        child.parentEntity = cur.parentEntity;
      });
    }

    if ((cur.children.length === 0) && (
      !_.isNumber(cur.prevChildIndex) || cur.prevChildIndex === -1
    )) {
      cur.parentEntity.texts.push(cur);
    }
    delete cur.parentEntity;
    delete cur.entity;

    foundPrev = 0;
    if (cur.prev) {
      foundPrev = _.findIndex(cur.children, function(child) {
        return !child.prev;
      });
      if (foundPrev === -1) foundPrev = 0;
      delete cur.prev;
    }
    foundNext = null;
    if (cur.next) {
      foundNext = _.findLastIndex(cur.children, function(child) {
        return !child.next;
      }) + 1;
      delete cur.next;
    }
    if (foundNext === null) {
      foundNext = cur.children.length;
    }
    cur.children = _loadChildren(cur, queue);
    cur.children = cur.children.slice(foundPrev, foundNext);
    if (cur.doc) {
      if (_.isString(cur.doc)) {
        cur.doc = new OId(cur.doc);
      }
      cur.docs = docMap[cur.doc].ancestors.concat(cur.doc);
      delete cur.doc;
    }
    if (
      (_.isNumber(cur.prevChildIndex) && cur.prevChildIndex > -1) ||
      (_.isNumber(cur.nextChildIndex) && cur.nextChildIndex > -1)
    ){
      if (!continueTeis[cur._id]) {
        continueTeis[cur._id] = cur;
      }
    } else {
      teis.push(cur);
    }
  }

  return {
    teis: teis,
    docs: docs,
    continueTeis: continueTeis,
    entityRoot: entityRoot,
  };
}

function updateEntityTree(entity, data, entities, updateEntities, callback) {
  var children = data.children;

  Entity.find({
    _id: {$in: entity.children},
    name: {$in: _.map(children, function(child) {
      return child.name;
    })},
  }).exec(function(err, entityChildren) {
    var insertIndex = entity.children.length
      , insertEntities = []
      , update = false
    ;
    _.each(children, function(child) {
      var queue = [child]
        , cur, found
      ;
      found = _.findIndex(entityChildren, function(entityChild) {
        return entityChild.name === child.name;
      });
      if (!entity.fake) {
        child.ancestors = entity.ancestors.concat(entity._id);
      }
      if (found > -1) {
        insertIndex = found + 1;
        child._id = entityChildren[found]._id;
        _.each(child.texts, function(tei) {
          tei.entities = entityChildren[found].ancestors.concat(child._id);
        });
        delete child.texts;
        insertEntities.push({
          entityChild: entityChildren[found],
          child: child,
        });
      } else {
        child._id = new OId();
        if (!child.ancestors) {
          if (entity.fake) {
            child.ancestors = [];
          } else {
            child.ancestors = entity.ancestors.concat(entity._id);
          }
        }
        while (queue.length > 0) {
          cur = queue.shift();
          cur.children = _loadChildren(cur, queue);
          _.each(cur.texts, function(tei) {
            tei.entities = cur.ancestors.concat(cur._id);
          });
          delete cur.texts;
          entities.push(cur);
        }
        entity.children.splice(insertIndex, 0, child._id);
        update = true;
      }

    });
    if (update) {
      updateEntities.push(entity);
    }

    async.each(insertEntities, function(item, cb) {
      updateEntityTree(
        item.entityChild, item.child, entities, updateEntities, cb);
    }, callback);
  });
}

function _commitTEI(continueTeis, teis, callback) {
  console.log('_commitTEI');
  console.log(continueTeis);
  console.log(teis);
  async.parallel([
    function(cb) {
      var deleteTeis = [];
      async.forEachOf(continueTeis, function(tei, id, cb1) {
        var _children = tei._children || []
          , prevChildIndex = tei.prevChildIndex
          , nextChildIndex = tei.nextChildIndex
          , prevChildren = _children.slice(0, prevChildIndex + 1)
          , nextChildren = _children.slice(nextChildIndex)
          , $set
        ;
        console.log('#############');
        console.log(tei);
        deleteTeis.push.apply(
          deleteTeis, _children.slice(prevChildIndex + 1, nextChildIndex));
        if (prevChildIndex < nextChildIndex) {
          tei.children = prevChildren.concat(tei.children, nextChildren);
          $set = {
            children: tei.children,
          };
          /*
          if (tei.children.length === 0) {
            $set.docs = tei.docs;
            $set.entities = tei.entities;
          }
          */
          return TEI.collection.update({_id: new OId(id)}, {
            $set: $set,
          }, cb1);
        } else {
          cb1(null);
        }
      }, function(err) {
        if (err) return cb(err);
        deleteTeis = _.map(deleteTeis, function(id) {
          if (_.isString(id)) {
            return new OId(id);
          } else {
            return id;
          }
        });
        TEI.remove({
          $or: [
            {ancestors: {$in: deleteTeis}},
            {_id: {$in: deleteTeis}},
          ]
        }, cb);
      });
    },
    function(cb) {
      if (teis.length > 0) {
        TEI.collection.insert(teis, function(err, objs) {
          console.log('--- save text done ---');
          if (err) console.log(err);
          cb(err, objs);
        });
      } else {
        cb(null, null);
      }
    },
  ], callback);
};

var Doc = mongoose.model('Doc', DocSchema);

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


// TODO: TEI should not save empty text
var TEISchema = extendNodeSchema('TEI', {
  text: String,
  docs: [{type: ObjectId, ref: 'Doc'}],
  entities: [{type: ObjectId, ref: 'Entity'}],
  attrs: {type: Schema.Types.Mixed},
});

var TEI = mongoose.model('TEI', TEISchema);

module.exports = {
  Community: Community,
  User:  require('./user'),
  Doc: Doc,
  Entity: Entity,
  TEI: TEI,
  Revision: mongoose.model('Revision', RevisionSchema),
  Action: mongoose.model('Action', ActionSchema),
};
