var URI = require('urijs')
  , URITemplate = require('urijs/src/URITemplate')
  , _ = require('lodash')
;
var Http = ng.http.Http;

var BACKEND_URL = 'http://localhost:3000/api/';
window.URI = URI;

var RESTService = ng.core.Class({
  constructor: [Http, function(http) {
    this.http = http;
  }],
  url: function(options) {
    var template = BACKEND_URL + '{resource}/{id}/{func}/';
    return URI.expand(template, _.assign({
      resource: this.resourceUrl,
    }, options)).normalize().toString();
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
    options = this.prepareOptions(options);
    return this.http.post(
      this.url(), JSON.stringify(data), options
    );
  },
  detail: function(id, options) {
    options = this.prepareOptions(options);
    return this.http.get(this.url({ id: id }), options);
  },
  list: function(options) {
    options = this.prepareOptions(options);
    window.ll = this.http.get(this.url(), options);
    return this.http.get(this.url(), options);
  },
});

module.exports = RESTService;
