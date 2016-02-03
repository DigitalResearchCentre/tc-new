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
  fetch: function(options) {
    var id = this.getId()
      , opts = _.assign({_id: id}, options)
      , self = this
    ;
    if (!id) {
      return Rx.Observable.throw(new Error('can not fetch without id'));
    }
    if (!this._fetch$) {
      this._fetch$ = this.constructor.getBackend().fetch(opts)
        .map(function(res) {
          self.update(res);
          return self;
        });
    }
    return this._fetch$;
  },
  save: function() {
    var self = this
      , url = this.getResourceUrl()
      , cls = this.constructor
      , obs
    ;
    if (url) {
      obs = cls.getBackend().post(this.attrs);
    } else {
      obs = Rx.Observable.throw(new Error('resource has not set yet'));
    }
    return obs.do(function(res) {
      var id = self.getId()
        , err
      ;
      // return id should always match existing id
      if (id && id !== res._id) {
        err = new Error('model id isn\'t match');
        self.onSaveError(err);
        return Rx.Observable.throw(err);
      }
      self.update(res);
    }, function(err) {
      self.onSaveError(err);
    });
  },
  onSaveError: function(err) {
  },
  // @return {Observer}
  getBackend: function() {
    return {};
  },
  get: function(key) {
    return this.fields[key];
  },
  isNew: function() {

  },
});

module.exports = Model;
