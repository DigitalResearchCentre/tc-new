var _ = require('lodash')
  , URI = require('urijs')
  , Rx = require('rxjs')
  , config = require('../config')
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
    self.update(attrs);
  }
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
  }
}, {
  // @return {Observer} 
  getBackend: function() {
    return {};
  },
  fetch: function(options) {
    var cls = this;
    return this.getBackend().fetch(options).map(function(res) {
      if (_.isArray(res)) {
        return _.map(res, function(obj) {
          return new cls(obj);
        });
      } else {
        return new cls(res);
      }
    });
  },
  get: function(id) {
    return _getCache(id);
  }
});

module.exports = Model;


