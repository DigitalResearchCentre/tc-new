var _ = require('lodash')
  , Model = require('./model')
;

var Entity = _.inherit(Model, {
  // props
}, {
  // statics
  fields: {
    _id: '',
    name: '',
    entityName:'',
    isTerminal:''
  },
});

module.exports = Entity;
