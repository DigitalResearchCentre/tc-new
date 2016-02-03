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
    , id
  ;

  if (attrs === void 0) {
    attrs = {};
  }
  this.cacheField = {};
  this.options = {};
  this.attrs = attrs;
  id = this.getId();

  if (id) {
    self = _getCache(id);
    if (self === void 0) {
      self = _setCache(id, this);
    }
  }
  self.update(attrs);
  return self;
}, {
  fieldMap: {

  },
  get: function(key, options) {
    var map = this.fieldMap[key]
      , value = this.attrs[key]
      , cacheField = this.cacheField
      , opts = _.defaults({}, options)
      , raw = opts.raw
      , noCache = opts.noCache
    ;
    if (!raw && map) {
      if (_.isFunction(map)) {
        if (noCache || cacheField[key] === void 0) {
          cacheField[key] = map.bind(this)(value);
        }
        value = cacheField[key];
      } else {
        value = map;
      }
    }
    return value;
  },
  getOptions: function() {
    return _.assign(this.options, {
      idName: '_id',
    }, this.constructor.options);
  },
  getResourceUrl: function() {
    var resource = this.getOptions().resource;
    if (resource) {
      return new URI(config.BACKEND_URL + '/' + resource)
        .normalize().toString();
    }
  },
  getId: function() {
    return this.attrs[this.getOptions().idName];
  },
  isNew: function() {
    return !!this.getId();
  },
  update: function(attrs) {
    var fieldMap = this.fieldMap
      , cacheField = this.cacheField
      , self = this
    ;
    _.assign(this.attrs, attrs);
    _.each(attrs, function(value, key) {
      if (fieldMap[key]) {
        self.get(key, {noCache: true});
      }
    });
    return this;
  },
});

module.exports = Model;

