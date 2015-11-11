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

          var children;
          common = results[0];
          ancestors1 = results[1];
          ancestors2 = results[2];

          children = _.last(common).children;

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

function _loadChildren(cls, cur, queue, texts, bindText) {
  return _.map(cur._children, function(data, i) {
    var child = new cls(data);
    if (!child.name) {
      child.name = '' + (i + 1);
    }
    child.ancestors = cur.ancestors.concat([cur._id]);
    child.texts = _.map(data.texts, function(textIndex) {
      var text = texts[textIndex];
      bindText(text, child.ancestors.concat(child._id));
      return text._id;
    });
    child._children = data.children;
    queue.push(child);
    return child;
  });
}

function _loadWorkChildren(cur, queue, texts) {
  return _.map(cur._children, function(data, i) {
    var child = new cls(data);
    if (!child.name) {
      child.name = '' + (i + 1);
    }
    child.ancestors = cur.ancestors.concat([cur._id]);
    child.texts = _.map(data.texts, function(textIndex) {
      var text = texts[textIndex];
      bindText(text, child.ancestors.concat(child._id));
      return text._id;
    });
    child._children = data.children;
    queue.push(child);
    return child;
  });
 
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
    texts = _.map(texts, function(text) {
      return new TextNode({text: text});
    }) || [];
    async.each(texts, function(text, cb) {
      text.save(cb);
    }, function(err) {
      if (err) {
        console.log(err);
      } else {
        doc._children = docRoot.children || [];
        queue = [doc];
        console.log(doc.children);
        while (queue.length > 0) {
          curDoc = queue.shift();
          curDoc.children = _loadChildren(
            Doc, curDoc, queue, texts, 
            function(text,ids){
              text.docs = ids;
            }
          );
          docs.push(curDoc);
        }
        console.log(doc.children);

        //  Work
        if (workRoot._id) {
          curWork = workRoot;
        } else {
          curWork = new Work(workRoot);
          curWork._children = workRoot.children;
        }
        queue = [curWork];
        while (queue.length > 0) {
          curWork = queue.shift();
          curWork.children = _loadWorkChildren(
            Work, curWork, queue, texts, 
            function(t,ids){
              t.works = ids;
            }
          );
          works.push(curWork);
        }

        //  XML
        if (xmlRoot._id) {
          curEl = xmlRoot;
        } else {
          curEl = new XML(xmlRoot);
          curEl._children = xmlRoot.children;
        }
        queue = [curEl];
        while (queue.length > 0) {
          curEl = queue.shift();
          curEl.children = _loadChildren(
            function(data) {
              if (data.name === '#text') {
                data.texts = [data.textIndex];
                data.children = [];
              }
              var xml = new XML(data);
              return xml;
            }, curEl, queue, texts, 
            function(t, ids){
              t.xmls = ids;
            }
          );
          xmls.push(curEl);
        }

        async.each(docs.concat(works).concat(xmls), function(obj, cb) {
          obj.save(cb);
        }, function(err) {
          if (!err) {
            async.each(texts, function(obj, cb) {
              obj.save(cb);
            }, callback);
          } else {
            callback(err);
          }
        });
      }
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


