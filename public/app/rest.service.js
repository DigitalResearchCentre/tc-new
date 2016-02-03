var URI = require('urijs')
  , URITemplate = require('urijs/src/URITemplate')
  , _ = require('lodash')
  , Model = require('./models/model')
;
var Http = ng.http.Http;

var BACKEND_URL = 'http://localhost:3000/api/';

var RESTService = ng.core.Injectable().Class({
  constructor: [Http, function(http) {
    this.http = http;
  }],
  url: function(options) {
    var template = BACKEND_URL + '{resource}/{id}/{func}/';
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
      var uri = new URI();
      uri.query(options.search);
      options.search = uri.query();
    }
    return options;
  },
  create: function(data, options) {
    var self = this;
    options = this.prepareOptions(options);
    return this.http.post(
      this.url(), JSON.stringify(data), options
    ).map(function(res) {
      var cls = self.modelClass();
      return new cls(res.json());
    });
  },
  update: function(data, options) {
    var self = this;
    options = this.prepareOptions(options);
    return this.http.put(
      this.url(), JSON.stringify(data), options
    ).map(function(res) {
      var cls = self.modelClass();
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
    if (obj.isNew()) {
      return this.create(obj.toJSON(), options);
    } else {
      return this.update(obj.toJSON(), options);
    }
  },
  fetch: function(id, search) {
    return this.detail(id, {
      search: search
    });
  }
});

module.exports = RESTService;
