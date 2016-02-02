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

var Model = _.inherit(Object, function(data) {
  var self = this;

  if (data._id) {
    self = _getCache(data._id);
    if (_.isUndefined(self)) {
      self = _setCache(data._id, this);
    }
  }

  if (_.isUndefined(self.fields)) {
    self.fields = {};
  }
  _.assign(self.fields, data);
  _.each(self.fields, function(value, field) {
    Object.defineProperty(self, field, {
      get: function() {return self.fields[field];},
    });
  });


  self._update(data);
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
  }
});


module.exports = Model;
