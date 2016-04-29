var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , Community = require('./community')
  , Doc = require('./doc')
  , TEI = require('./tei')
  , Entity = require('./entity')
;

Doc.Entity = Entity;
Entity.Doc = Doc;

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
  committed: {type: Date},
  status: String, // submitted committed previsous_db
  text: String,
  spentTime: Number,
});
_.assign(RevisionSchema.statics, {
  status: {
    IN_PROGRESS: 'IN_PROGRESS',
    SUBMITTED: 'SUBMITTED',
    COMMITTED: 'COMMITTED', // not necessary, could check committed time 
  },
})



var InvitationSchema = new Schema({

});




module.exports = {
  Community: Community,
  User:  require('./user'),
  Doc: Doc,
  Entity: Entity,
  TEI: TEI,
  Revision: mongoose.model('Revision', RevisionSchema),
  Action: mongoose.model('Action', ActionSchema),
};
