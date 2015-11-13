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
  works: [{type: ObjectId, ref: 'Work'}],
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

var TextNodeSchema = new Schema({
  text: String,
  docs: [{type: ObjectId, ref: 'Doc'}],
  works: [{type: ObjectId, ref: 'Work'}],
  xmls: [{type: ObjectId, ref: 'XML'}],
});
var TextNode = mongoose.model('TextNode', TextNodeSchema);

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


        _.each(ancestors1, function(id, i) {
          if (!id.equals(ancestors2[i])) {
            common = ancestors1.slice(0, i);
            ancestors1 = ancestors1.slice(i);
            ancestors2 = ancestors2.slice(i);
            return false;
          }
        });

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
            ancestors.concat(children.slice(
              children.indexOf(ancestors1[0]._id) + 1,
              children.indexOf(ancestors2[0]._id)
            ));
          }

          _.each(ancestors1.slice(1), function(obj, i) {
            var children = ancestors1[i].children;
            ancestors = ancestors.concat(
              children.slice(children.indexOf(obj._id) + 1)
            );
          });

          _.each(ancestors2.slice(1), function(obj, i) {
            var children = ancestors2[i].children;
            ancestors = ancestors.concat(
              children.slice(0, children.indexOf(obj._id))
            );
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
  texts: [{type: ObjectId, ref: 'TextNode'}],
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

function _loadWorkTexts(obj, texts) {
  var indexes = obj.texts || []
    , ancestors = obj.ancestors.concat(obj._id)
    , ids = []
    , text
  ;
  for (var i = 0, len = indexes.length; i < len; i++) {
    text = texts[indexes[i]];
    text.works = ancestors;
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
  text.xmls = ancestors;
  ids.push(text._id);
  return ids;
}



_.assign(DocSchema.methods, baseDoc.methods, {
  commit: function(data, callback) {
    var docRoot = data.doc
      , workRoot = data.work
      , xmlRoot = data.xml
      , texts = data.texts
      , doc = this
      , queue
      , cur, curDoc, curWork, curEl
      , docs = []
      , works = []
      , xmls = []
    ;
    console.log('--- start commit ---');
    texts = _.map(texts, function(text) {
      return {
        text: text,
        _id: new OId(),
      };
    }) || [];
    console.log(texts.length);
    console.log('--- parse docs ---');
    queue = [docRoot];
    _.defaults(docRoot, {
      ancestors: [],
      _id: new OId(),
    });
    while (queue.length > 0) {
      curDoc = queue.shift();
      curDoc.children = _loadChildren(curDoc, queue);
      docs.push(curDoc);
      if (docs.length % 1000 === 0) {
        console.log(docs.length);
      }
    }

    console.log(docs.length);
    _.each(docs, function(doc) {
      doc.texts = _loadDocTexts(doc, texts);
    });

    console.log('--- parse works ---');
    //  Work
    queue = [workRoot];
    _.defaults(workRoot, {
      ancestors: [],
      _id: new OId(),
    });
    while (queue.length > 0) {
      curWork = queue.shift();
      curWork.children = _loadChildren(curWork, queue);
      works.push(curWork);
    }
    _.each(works, function(work) {
      work.texts = _loadWorkTexts(work, texts);
    });

    console.log('--- parse xmls ---');
    //  XML
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
      function(cb) {
        console.log('--- save text ---');
        TextNode.collection.insert(texts, function(err, objs) {
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
        Work.collection.insert(works, function(err, objs) {
          console.log('--- save work done ---');
          cb(err, objs);
        });
      },
      function(cb) {
        console.log('--- save xml ---');
        XML.collection.insert(xmls, function(err, objs) {
          console.log('--- save xml done ---');
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


var baseWork = BaseNodeSchema('Work');
var WorkSchema = new Schema(_.assign(baseWork.schema, {
  texts: [{type: ObjectId, ref: 'TextNode'}],
}));
_.assign(WorkSchema.methods, baseWork.methods);
var Work = mongoose.model('Work', WorkSchema);

var baseXML = BaseNodeSchema('XML');
var XMLSchema = new Schema(_.assign(baseXML.schema, {
  texts: [{type: ObjectId, ref: 'TextNode'}],
  attrs: {type: Schema.Types.Mixed},
}));
_.assign(XMLSchema.methods, baseWork.methods);
_.assign(XMLSchema.statics, baseWork.statics);

var XML = mongoose.model('XML', XMLSchema);

var NodeSchemaSchema = new Schema({
  name: String,
});

module.exports = {
  Community: mongoose.model('Community', CommunitySchema),
  User:  require('./user'),
  Doc: Doc,
  Work: Work,
  TextNode: TextNode,
  XML: XML,
  Revision: mongoose.model('Revision', RevisionSchema),
};


