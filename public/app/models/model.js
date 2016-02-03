var _ = require('lodash')
  , URI = require('urijs')
  , Rx = require('rxjs')
;

var CACHE_STORE = {};

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
  self.set(attrs);
  return self;
}, {
  fields: {

  },
  set: function(key, value) {
    var self = this;
    if (_.isObject(key)) {
      _.each(key, function(value, key) {
        self.set(key, value);
      });
      return;
    }
    var field = this.fields[key];
    if (!_.isUndefined(field)) {
      if (_.isFunction(field)) {
        this.attrs[key] = field.bind(this)(value);
      } else {
        this.attrs[key] = this.json[key] = value;
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
  verify: function() {
    return null;
  }
});

module.exports = Model;

