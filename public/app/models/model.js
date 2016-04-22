var _ = require('lodash')
  , URI = require('urijs')
  , Rx = require('rxjs')
  , bson = require('bson')()
  , ObjectID = bson.ObjectID
  , Error = require('../../../common/error')
;

var CACHE_STORE = {};
var FieldDefError = Error.extend('FieldDefError');

function _getCache(id) {
  if (_.isObject(id)) {
    id = id._id;
  }
  return CACHE_STORE[id];
}

function _setCache(id, obj) {
  CACHE_STORE[id] = obj;
  return obj;
}

var Model = _.inherit(Object, function(attrs) {
  var self = this
    , id = attrs ? attrs._id : null
  ;
  this.attrs = {};
  this.json = {};
  if (id) {
    self = _getCache(id);
    if (self === void 0) {
      self = _setCache(id, this);
    }
  }

  self.set(_.assign(
    // use undefined value trigger setter set default value
    _.zipObject(_.keys(this.constructor.fields)),
    attrs
  ));
  return self;
}, {
  set: function(key, value) {
    var self = this;
    if (_.isObject(key)) {
      _.each(key, function(value, key) {
        self.set(key, value);
      });
      return;
    }
    var field = this.constructor.fields[key];
    if (!_.isUndefined(field)) {
      if (_.isFunction(field)) {
        this.attrs[key] = this.json[key] = field.bind(this)(value);
      } else if (_.isArray(field) && _.every(field.slice(0, 2), _.isFunction)) {
        this.attrs[key] = field[0].bind(this)(value);
        this.json[key] = field[1].bind(this)(value);
      } else {
        this.attrs[key] = this.json[key] = _.isUndefined(value) ? field : value;
      }
    } else {
      this.attrs[key] = value;
    }
  },
  toJSON: function() {
    return this.json;
  },
  isNew: function() {
    return !this.getId();
  },
  getId: function() {
    return this.attrs._id;
  },
  verify: function() {
    return this.prototype.constructor.verify(this.toJSON());
  }
}, {
  extend: function(child, props, statics) {
    var cls = _.inherit(this, child, props, statics);
    if (_.isFunction(cls.fields)) {
      cls.fields = cls.fields();
    }
    return cls;
  },
  fields: {
    /*
    // setter and getter:  attrs.foo === 'foo' && json.foo === 'foo'
    foo: function(value) {return 'foo'}, 
    bar: [
      function(value) {return 'bar'}, // setter: attrs.foo === 'bar'
      function(value) {return 'foo}, // getter:  json.foo === 'foo'
    ],
    foobar: 'helloworld',  // equivalent to function(v){
      return _.isUndefined(v) ? 'helloworld' : v;
    } 
    */

  },
  verify: function() {
    return null;
  },
  validateId: function(id) {
    if (id instanceof ObjectID) {
      return id.toString();
    }
    try {
      return new ObjectId(id).toString();
    } catch (e) {
      return null;
    }
  },
  OneToManyField: function(cls) {
    return [
      function(objs) {
        return _.map(objs, function(attrs) {
          if (_.isString(attrs)) {
            attrs = new cls({_id: attrs});
          } else if (!attrs instanceof cls) {
            attrs = new cls(attrs);
          }
          return attrs;
        });
      },
      function(objs) {
        cls = this.constructor;
        return _.filter(_.map(objs, function(obj) {
          if (obj instanceof Model) {
            return obj.getId();
          } else {
            return _.get(obj, '_id', obj);
          }
        }), function(id) {
          return cls.validateId(id);
        });
      }
    ];
  },
});

module.exports = Model;

