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

const Community = mongoose.model('Community', CommunitySchema);
module.exports = Community;

