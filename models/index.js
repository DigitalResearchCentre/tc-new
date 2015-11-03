var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Promise = mongoose.Promise
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
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
  teis: [{type: ObjectId, ref: 'Tei'}],
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

function _loadChildren(curDoc, queue, texts) {
  return _.map(curDoc._children, function(child, i) {
    var childDoc = new Doc(child);
    if (!childDoc.name) {
      childDoc.name = '' + (i + 1);
    }
    childDoc.ancestors = curDoc.ancestors.concat([curDoc._id]);
    childDoc.texts = _.map(child.texts, function(textIndex) {
      var text = texts[textIndex];
      text.docs = childDoc.ancestors.concat(childDoc._id);
      return text._id;
    });
    childDoc._children = child.children;
    queue.push(childDoc);
    return childDoc;
  });
}

function _loadWorkChildren(curWork, queue, texts) {
  return _.map(curWork._children, function(child, i) {
    var childDoc = new Work(child);
    if (!childDoc.name) {
      childDoc.name = '' + (i + 1);
    }
    childDoc.ancestors = curDoc.ancestors.concat([curDoc._id]);
    childDoc.texts = _.map(child.texts, function(textIndex) {
      var text = texts[textIndex];
      text.docs = childDoc.ancestors.concat(childDoc._id);
      return text._id;
    });
    childDoc._children = child.children;
    queue.push(childDoc);
    return childDoc;
  });
}
_.assign(DocSchema.methods, baseDoc.methods, {
  commit: function(data, callback) {
    var docRoot = data.doc
      , workRoot = data.work
      , teiRoot = data.tei
      , texts = data.texts
      , doc = this
      , queue
      , cur, curDoc, curWork
      , docs = []
      , works = []
      , teis = []
    ;
    texts = _.map(texts, function(text) {
      return new TextNode({text: text});
    }) || [];
    doc._children = docRoot.children || [];
    queue = [doc];
    while (queue.length > 0) {
      curDoc = queue.shift();
      curDoc.children = _loadChildren(curDoc, queue, texts);
      docs.push(curDoc);
    }

    if (workRoot._id) {
      curWork = workRoot;
    } else {
      curWork = new Work(workRoot);
      curWork._children = workRoot.children;
    }
    queue = [curWork];
    while (queue.length > 0) {
      curWork = queue.shift();
      curWork.children = _loadWorkChildren(curWork, queue, texts);

    }

    return callback();
    /*

    async.each(
      texts.concat(docs).concat(works).concat(teis),
      function(obj, cb) {
        obj.save(function(err) {
          cb(err);
        });
      },
      callback
    );
    */
  }
});

var Doc = mongoose.model('Doc', DocSchema);

var baseWork = BaseNodeSchema('Work');
var WorkSchema = new Schema(baseWork.schema);
_.assign(WorkSchema.methods, baseWork.methods);
var Work = mongoose.model('Work', WorkSchema);

var baseTei = BaseNodeSchema('Tei');
var TeiSchema = new Schema(baseTei.schema);
_.assign(TeiSchema.methods, baseTei.methods);
var Tei = mongoose.model('Tei', TeiSchema);

var NodeSchemaSchema = new Schema({
  name: String,
});

module.exports = {
  Community: mongoose.model('Community', CommunitySchema),
  User:  require('./user'),
  Doc: Doc,
  Work: Work,
  TextNode: TextNode,
  Tei: Tei,
  Revision: mongoose.model('Revision', RevisionSchema),
};


