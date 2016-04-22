var _ = require('lodash')
  , Model = require('./model')
  , Doc = require('./doc')
  , Entity = require('./entity')
;

var Community = _.inherit(Model, {
  // props
}, {
  // statics
  fields: {
    _id: '',
    public: false,
    name: '',
    abbr: '',
    longName: '',
    description: '',
    accept: false,
    autoaccept: false,
    alldolead: false,
    haspicture: false,
    image: false,
    entities: Model.OneToManyField(Entity),
    documents: Model.OneToManyField(Doc),
    css: '',
    js: '',
    dtd: '',
  },
  verify: function(obj) {
    var message = [];
    if (!obj.name) {
      message.push("Community name cannot be blank");
    } else if (obj.name.length>19) {
      message.push(
        "Community name "+obj.name+" must be less than 20 characters");
    }
    if (!obj.abbr) {
      message.push("Community abbreviation cannot be blank");
    } else if (obj.abbr.length>4)  {
      message.push(
        "Community abbreviation "+obj.abbr+" must be less than 5 characters");
    }
    if (obj.longName && obj.longName.length>80) {
      message.push(
        "Community long name "+obj.longName+" must be less than 80 characters");
    }
    if (message.length > 0) {
      return {
        message: message.join(','),
      };
    } else {
      return null;
    }
  }
});

module.exports = Community;
