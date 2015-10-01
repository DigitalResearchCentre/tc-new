var mongoose = require('mongoose')
  , _ = require('lodash')
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
  revisions: [{type: ObjectId, ref: 'Revision'}],
}));
_.assign(DocSchema.methods, baseDoc.methods);

var baseWork = BaseNodeSchema('Work');
var WorkSchema = new Schema(baseWork.schema);
_.assign(WorkSchema.methods, baseWork.methods);


var NodeSchemaSchema = new Schema({
  name: String,
});



module.exports = {
  Community: mongoose.model('Community', CommunitySchema),
  User:  require('./user'),
  Doc: mongoose.model('Doc', DocSchema),
  Work: mongoose.model('Work', WorkSchema),
  Revision: mongoose.model('Revision', RevisionSchema),
};

