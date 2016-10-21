var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , _ = require('lodash')
  , extendNodeSchema = require('./extend-node-schema')
;


// TODO: TEI should not save empty text
var TEISchema = extendNodeSchema('TEI', {
  name: String,
  text: String,
  isEntity: Boolean,
  entityName: String,
  entityAncestor: String,
  community: String,
  ancestors: [{type: Schema.Types.ObjectId, ref: 'TEI', index: true}],
  children: [{type: Schema.Types.ObjectId, ref: 'TEI', index: true}],
  docs: [{type: Schema.Types.ObjectId, ref: 'Doc', index: true}],
  entityChildren: [{type: Schema.Types.ObjectId, ref: 'TEI', index: true}],
  attrs: {type: Schema.Types.Mixed},
  doNotWrite: Boolean,
}, {
  statics: {
    clean: function(data) {
      const nodeData = _.defaults(
        {}, _.pick(data, [
          '_id', 'name', 'text', 'isEntity', 'entityName', 'entityAncestor', 'ancestors', 'children', 'docs',  'entityChildren', 'attrs',

        ]), {
          ancestors: [],
          children: [],
          entityChildren: [],
        }
      );
      this._assignId(nodeData);
      return nodeData;
    }
  }
});

function createPath(curPath, childEl) {
  var path="";
  for (var i=0; i<curPath.length; i++) {
    var elName=curPath[i].name;
    if (curPath[i].name=="l") elName="line";
    if (curPath[i].name=="p") elName="para";
    if (curPath[i].name=="ab") elName="block";
    if (curPath[i].attrs.type) elName=curPath[i].attrs.type;
//    path=
  }
}


module.exports = mongoose.model('TEI', TEISchema);
