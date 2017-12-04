var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , Community = require('./community')
  , Doc = require('./doc')
  , TEI = require('./tei')
  , Revision = require('./revision')
  , Entity = require('./entity')
  , Collation = require('./collation')
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




var InvitationSchema = new Schema({

});



//guys: this is the boss which determines what collections get set up in the database
module.exports = {
  Community: Community,
  User:  require('./user'),
  Doc: Doc,
  Entity: Entity,
  TEI: TEI,
  Revision: Revision,
  Collation: Collation,
  Action: mongoose.model('Action', ActionSchema),
};
