var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , _ = require('lodash')
  , extendNodeSchema = require('./extend-node-schema')
;


// TODO: TEI should not save empty text
var TEISchema = extendNodeSchema('TEI', {
  name: String,
  text: String,
  docs: [{type: Schema.Types.ObjectId, ref: 'Doc', index: true}],
  entities: [{type: Schema.Types.ObjectId, ref: 'Entity', index: true}],
  attrs: {type: Schema.Types.Mixed},
}, {
  statics: {
    clean: function(data) {
      const nodeData = _.defaults(
        {}, _.pick(data, [
          '_id', 'name', 'text', 'docs', 'entities', 'attrs',
          'children', 'ancestors',
        ]), {
          ancestors: [],
          children: [],
        }
      );
      this._assignId(nodeData);
      return nodeData;
    }
  }
});

module.exports = mongoose.model('TEI', TEISchema);

