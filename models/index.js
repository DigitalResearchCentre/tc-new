var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Promise = mongoose.Promise
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
  , OId = mongoose.Types.ObjectId
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
  haspicture: Boolean,
  image: String,
  documents: [{type: ObjectId, ref: 'Doc'}],
  entities: [{type: ObjectId, ref: 'Entity'}],
});

_.assign(CommunitySchema.methods, {
  getstatus: function(cb) {
    var Community = this.model('Community')
      , self = this
      , documents = this.documents
      , promise = new Promise()
    ;
    documents = Community.populate(this, 'documents');

    return _.when(documents).then(function(documents) {
      return Community.populate(self, {
        path: 'documents.children',
        model: 'Doc',
      });
    }).then(function() {
      var numOfPages = 0
        , numOfTranscripts = 0
        , numOfPagesTranscribed = 0
      ;
      _.each(self.documents, function(doc) {
        numOfPages += (doc.children || []).length;
        _.each(doc.children, function(child) {
          var l = child.revisions.length;
          numOfTranscripts += l;
          numOfPagesTranscribed += l > 0 ? 1 : 0;
        });
      });

      self.status = {
        numOfTranscripts: numOfTranscripts,
        numOfPages: numOfPages,
        numOfPagesTranscribed: numOfPagesTranscribed,
      };
      if (cb) {
        cb(null, self);
      }
      promise.fulfill(self);
      return promise;
    });
  },
});

_.assign(CommunitySchema.statics, {
  getOptFields: function() {
    return ['status'];
  }
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

var ActionSchema = new Schema({

});

var BaseNodeSchema = function(modelName) {
  return {
    schema: {
      name: String,
      ancestors: [{type: ObjectId, ref: modelName}],
      children: [{type: ObjectId, ref: modelName}],
    },
    methods: {
      getText: function() {
      },
      getChildrenAfter: function(targetId) {
        if (targetId._id) {
          targetId = targetId._id;
        }
        this.prototype.constructor.findOne({_id: targetId});
      },
    },
    statics: {
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
          _.each(nodes, function(node) {
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
      getNodesBetween: function(ancestors1, ancestors2, callback) {
        var nodes = []
          , common = []
          , ancestors = []
          , cls = this
        ;
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
            callback(err, common.concat(ancestors1, ancestors2, objs));
          });
        });
      },
    }
  };
};

var baseNode = BaseNodeSchema('Node');

var NodeSchema = new Schema(baseNode.schema);
_.assign(NodeSchema.methods, baseNode.methods);

var baseDoc = BaseNodeSchema('Doc');
var DocSchema = new Schema(_.assign(baseDoc.schema, {
  label: String,
  revisions: [{type: ObjectId, ref: 'Revision'}],
}));

function _loadChildren(cur, queue) {
  var children = cur.children
    , ancestors = cur.ancestors.concat(cur._id)
    , ids = []
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
    queue.push(child);
    ids.push(child._id);
  }
  return ids;
}

function _loadDocTexts(doc, texts) {
  var indexes = doc.texts || []
    , ancestors = doc.ancestors.concat(doc._id)
    , ids = []
    , text
  ;
  for (var i = 0, len = indexes.length; i < len; i++) {
    text = texts[indexes[i]];
    text.docs = ancestors;
    ids.push(text._id);
  }
  return ids;
}

function _loadEntityTexts(obj, texts) {
  var indexes = obj.texts || []
    , ancestors = obj.ancestors.concat(obj._id)
    , ids = []
    , text
  ;
  for (var i = 0, len = indexes.length; i < len; i++) {
    text = texts[indexes[i]];
    text.entities = ancestors;
    ids.push(text._id);
  }
  return ids;
}

function _loadXMLTexts(obj, texts) {
  var ancestors = obj.ancestors.concat(obj._id)
    , ids = []
    , text
  ;
  text = texts[obj.textIndex];
  delete obj.textIndex;
  text.xmls = ancestors;
  ids.push(text._id);
  return ids;
}

_.assign(DocSchema.statics, baseDoc.methods, {
  getPrevTexts: function(id, callback) {
    Doc.findOne({_id: id}).exec(function(err, doc) {
      if (err) {
        return callback(err);
      } else if (doc) {
        return doc.getPrevTexts(callback);
      } else {
        return callback(err, null);
      }
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
          if (parent.children.length > index) {
            return Doc.getPrevTexts(parent.children[index+1], cb);
          }
        }
        return cb(null, null);
      },
    ], callback);
  },
});

_.assign(DocSchema.methods, baseDoc.methods, {
  getPrevTexts: function(callback) {
    var doc = this;
    async.waterfall([
      function(cb) {
        TEI.find({docs: doc.ancestors.concat(doc._id)}).exec(cb);
      },
      function(teiLeaves, cb) {
        TEI.getTreeFromLeaves(teiLeaves, cb); 
      },
    ], function(err, teiRoot) {
      if (err) {
        return callback(err);
      }
      var cur = teiRoot
        , prevs = [cur]
        , index
      ;
      while ((cur.children || []).length > 0) {
        index = _.findIndex(cur.children, function(child) {
          return !(_.isString(child) || child instanceof OId);
        });
        cur = cur.children[index];
        prevs.push(cur);
      }
      callback(err, prevs);
    });
  },
  getNextTexts: function(callback) {
    return Doc.getNextTexts(this._id, callback);
  },
  commit: function(data, callback) {
    var self = this
      , doc = this.toObject()
      , teiRoot = data.tei
      , entityRoot = data.entity
      , docMap = {}
      , docs = []
      , teis = []
      , entities = []
      , queue, cur
    ;
    /*
    async.waterfall([
      function(cb) {
        Community.findOne({docs: this.ancestors[0]}).exec(cb);
      },
      function(community, cb) {
        Entity.find({
          _id: {$in: community.entities},
          name: entityRoot.name,
        }).exec(cb);       
      },
      function(entity, cb) {
        if (!entity) {
          entityRoot._id = new OId();
        }
      }
    ]);
    async.parallel([
      function(cb) {
        self.getPrevTexts(cb);
      },
      function(cb) {
        self.getNextTexts(cb);
      },
    ], function(err, results) {
      var prevs = results[0]
        , nexts = results[1]
        , first = teiRoot
        , last = teiRoot
        , cur = {children: [teiRoot]}
        , common, prev, next
        , commonLevel
      ;
      _.each(prevs, function(prev, i) {
        if (nexts.length > i && prev._id.equals(nexts[i]._id)) {
          cur = _.find(cur.children, function(child) {
            return child.prev;
          });
        } else {
          commonLevel = i;
        }
      });
      common = cur;
      prev = _.findIndex(common.children, function(child) {
        return child.prev;
      });
      next = _.findLastIndex(common.children, function(child) {
        return child.next;
      });
     
      _.each(prevs.slice(commonLevel), function() {
        var prev = _.find(cur.children, function(child) {
          return child.prev;
        });
        if (!cur) {
        }
      });

      prev = _.find(cur.children, function(child) {
        return child.prev;
      });


      var prevIndex = _.findIndex(cur.children, function(child) {
        return child.prev;
      });
      if (prevIndex) {
        cur.children = cur.children.slice(prevIndex);
      }
      var nextIndex = _.findLastIndex(cur.children, function(child) {
        return child.next;
      });
      if (nextIndex) {
        cur.children = cur.children.slice(0, nextIndex + 1);
      }


      console.log(prevs[0]);
      console.log(teiRoot);
    });
    return;
    */

    doc.children = data.doc.children;
    docMap[doc._id] = doc;
    console.log('--- start commit ---');
    console.log('--- parse docs ---');

    Doc.remove({ancestors: this._id}, function() {
      queue = [];
      self.children = doc.children = _loadChildren(doc, queue);
      while (queue.length > 0) {
        cur = queue.shift();
        cur.children = _loadChildren(cur, queue);
        if (_.isString(cur._id)) {
          cur._id = new OId(cur._id);
        }
        docs.push(cur);
        docMap[cur._id] = cur;
      }

      console.log('--- parse entity ---');
      //  Entity
      console.log('--- parse xmls ---');
      //  TEI
      queue = [teiRoot];
      _.defaults(teiRoot, {
        ancestors: [],
        _id: new OId(),
      });
      while (queue.length > 0) {
        cur = queue.shift();
        if (cur.name === '#text') {
          cur.children = [];
        }
        cur.children = _loadChildren(cur, queue);
        if (cur.doc) {
          if (_.isString(cur.doc)) {
            cur.doc = new OId(cur.doc);
          }
          cur.docs = docMap[cur.doc].ancestors.concat(cur.doc);
          if (cur.text == ' head ') {
            console.log(cur);
          }

          delete cur.doc;
        }
        teis.push(cur);
      }

      async.parallel([
        function(cb) {
          self.save(function(err, doc) {
            console.log(err);
            console.log(doc);
            cb(err, doc);
          });
        },
        function(cb) {
          console.log('--- save text ---');
          TEI.collection.insert(teis, function(err, objs) {
            console.log('--- save text done ---');
            if (err) console.log(err);
            cb(err, objs);
          });
        },
        function(cb) {
          console.log('--- save doc ---');
          Doc.collection.insert(docs, function(err, objs) {
            console.log('--- save doc done ---');
            cb(err, objs);
          });
        },
        /*
        function(cb) {
          console.log('--- save work ---');
          Entity.collection.insert(works, function(err, objs) {
            console.log('--- save work done ---');
            cb(err, objs);
          });
        },
        */
      ], function(err) {
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
});

var Doc = mongoose.model('Doc', DocSchema);


var baseEntity = BaseNodeSchema('Entity');
var EntitySchema = new Schema(_.assign(baseEntity.schema, {

}));
_.assign(EntitySchema.methods, baseEntity.methods);
var Entity = mongoose.model('Entity', EntitySchema);


var baseTEI = BaseNodeSchema('TEI');
var TEISchema = new Schema(_.assign(baseTEI.schema, {
  text: String,
  docs: [{type: ObjectId, ref: 'Doc'}],
  entities: [{type: ObjectId, ref: 'Entity'}],
  attrs: {type: Schema.Types.Mixed},
}));
_.assign(TEISchema.methods, baseTEI.methods);
_.assign(TEISchema.statics, baseTEI.statics);

var TEI = mongoose.model('TEI', TEISchema);


var NodeSchemaSchema = new Schema({
  name: String,
});

module.exports = {
  Community: mongoose.model('Community', CommunitySchema),
  User:  require('./user'),
  Doc: Doc,
  Entity: Entity,
  TEI: TEI,
  Revision: mongoose.model('Revision', RevisionSchema),
};


