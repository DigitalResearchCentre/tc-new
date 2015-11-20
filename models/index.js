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



_.assign(DocSchema.methods, baseDoc.methods, {
  commit: function(data, callback) {
    var docs = data.docs
      , entities = data.entities
      , teiRoot = data.tei
      , queue
      , cur
      , docs = []
      , entities = []
    ;
    console.log('--- start commit ---');
    console.log('--- parse docs ---');

    Doc.remove({ancestors: this._id});
    this.children = [];
    this.save();
    var teis = TEI.find({docs: this._id});
    function findTree(teis) {
      return [];
    }
    var teitree = findTree(teis);
    // TODO find out all tei need be deleted
    // then delete them
    
    Doc.collection.insert(docs);

    console.log('--- parse entity ---');
    //  Entity
    console.log('--- parse xmls ---');
    //  TEI
    queue = [xmlRoot];
    _.defaults(xmlRoot, {
      ancestors: [],
      _id: new OId(),
    });
    while (queue.length > 0) {
      curEl = queue.shift();
      if (curEl.name === '#text') {
        curEl.children = [];
        curEl.texts = _loadXMLTexts(curEl, texts);
      }
      curEl.children = _loadChildren(curEl, queue);
      xmls.push(curEl);
    }


    async.parallel([
      _.bind(function(cb) {
        this.save(cb);
      }, this),
      function(cb) {
        console.log('--- save text ---');
        TEI.collection.insert(texts, function(err, objs) {
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
      function(cb) {
        console.log('--- save work ---');
        Entity.collection.insert(works, function(err, objs) {
          console.log('--- save work done ---');
          cb(err, objs);
        });
      },
    ], function(err) {
      console.log(err);
      callback(err);
    });
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


