var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , extendNodeSchema = require('./extend-node-schema')
;


// TODO: TEI should not save empty text
var TEISchema = extendNodeSchema('TEI', {
  name: String,
  text: String,
  docs: [{type: Schema.Types.ObjectId, ref: 'Doc'}],
  entities: [{type: Schema.Types.ObjectId, ref: 'Entity'}],
  attrs: {type: Schema.Types.Mixed},
});

module.exports = mongoose.model('TEI', TEISchema);


