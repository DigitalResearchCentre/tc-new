var URI = require('urijs')
  , URITemplate = require('urijs/src/URITemplate')
  , _ = require('lodash')
  , Rx = require('rxjs')
  , Model = require('../models/model')
  , config = require('../config')
;
var Http = ng.http.Http;

var RESTService = ng.core.Injectable().Class({
  constructor: [Http, function(http) {
    this.http = http;
  }],
  url: function(options) {
    var template = config.BACKEND_URL + '{resource}/{id}/{func}/';
    return URI.expand(template, _.assign({
      resource: this.resourceUrl,
    }, options)).normalize().toString();
  },
  modelClass: function() {
    return Model;
  },
  prepareOptions: function(options) {
    options = _.clone(options || {});
    if (!_.isString(options.search)) {
      var uri = new URI('');
      uri.query(options.search);
      options.search = uri.query();
    }

    options.headers = _.assign({
      'Content-Type': 'application/json'
    }, options.headers);
    return options;
  },
  create: function(data, options) {
    var self = this
      , cls = self.modelClass()
      , err
    ;
    if (data instanceof cls) {
      err = data.verify();
    } else {
      err = cls.verify(data);
    }
    if (err) {
      return Rx.Observable.create(function(obs) {
        obs.error(err);
      });
    }
    options = this.prepareOptions(options);
    return this.http.post(
      this.url(), JSON.stringify(data),  options
    ).map(function(res) {
      return new cls(res.json());
    });
  },
  update: function(id, data, options) {
    var self = this
      , cls = self.modelClass()
      , err
    ;
    if (data instanceof cls) {
      err = data.verify();
    } else {
      err = cls.verify(data);
    }
    if (err) {
      return Rx.Observable.create(function(obs) {
        obs.error(err);
      });
    }
    options = this.prepareOptions(options);
    return this.http.put(
      this.url({id: id}), JSON.stringify(data), options
    ).map(function(res) {
      return new cls(res.json());
    });
  },
  detail: function(id, options) {
    var self = this;
    options = this.prepareOptions(options);
    return this.http.get(this.url({ id: id }), options).map(function(res) {
      var cls = self.modelClass();
      return new cls(res.json());
    });
  },
  list: function(options) {
    var self = this;
    options = this.prepareOptions(options);
    return this.http.get(this.url(), options).map(function(res) {
      var cls = self.modelClass();
      return _.map(res.json(), function(data) {
        return new cls(data);
      });
    });
  },
  save: function(obj, options) {
    var id = obj._id || (_.isFunction(obj.getId) && obj.getId());
    if (id) {
      return this.update(id, obj, options);
    } else {
      return this.create(obj, options);
    }
  },
  fetch: function(id, search) {
    return this.detail(id, {
      search: search
    });
  }
});

module.exports = RESTService;
