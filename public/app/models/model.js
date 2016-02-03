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
  this.fields = {};
  this.attrs = attrs || {};
  attrs = this.attrs;
  

  if (attrs._id) {
    self = _getCache(attrs._id);
    if (_.isUndefined(self)) {
      self = _setCache(attrs._id, this);
    }
  }
  self._update(attrs);
  return self;
}, {
  _createId: function() {
    var _id = new ObjectID().toJSON();
    this.fields._id = _id;
    return _setCache(_id, this);
  },
  _update: function(data) {
    var fields = this.constructor.fields || {}
      , self = this
    ;
    _.each(data, function(value, key) {
      if (fields[key]) {
        value = fields[key](value);
      } else {
        value = value;
      }
      self.fields[key] = value;
    });
    return this;
  },
  get: function(key) {
    return this.fields[key];
  },
  isNew: function() {
    
  },
});

module.exports = Model;
