var _ = require('lodash')
  , Model = require('./model')
  , Doc = require('./doc')
  , Entity = require('./entity')
;

var Community = _.inherit(Model, function(data) {
  return this._super.constructor.call(this, data);
}, {
  fields: {
    _id: {},
    public: false,
    name: "",
    abbr: "",
    longName: "",
    description: "",
    accept: false,
    autoaccept: false,
    alldolead: false,
    haspicture: false,
    image: false,
    entities: function(objs) {
      var cls = Entity;
      var results = _.map(objs, function(attrs) {
        if (_.isString(attrs)) {
          attrs = new cls({_id: attrs});
        } else if (!attrs instanceof cls) {
          attrs = new cls(attrs);
        }
        return attrs;
      });
      return results;
    },
    documents: function(objs) {
      var cls = Doc;
      var results = _.map(objs, function(attrs) {
        if (_.isString(attrs)) {
          attrs = new cls({_id: attrs});
        } else if (!(attrs instanceof cls)) {
          attrs = new cls(attrs);
        }
        return attrs;
      });
      return results;
    },
  },
  toJSON: function() {
    var json = this._super.toJSON.call(this)
      , docs = []
    ;
    _.each(this.attrs.documents, function(obj) {
      var id = obj.getId();
      if (id) {
        docs.push(id);
      }
    });
    return _.assign(json, {
      documents: docs,
    });
  }
}, {
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


