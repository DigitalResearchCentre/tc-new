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
  create: function(data, options) {
    return this.http.post(this.url(), JSON.stringify(data), options);
  },
  detail: function(id, options) {
    return this.http.get(this.url({
      id: id
    }), options);
  },
  list: function(options) {
    console.log(this.url());
    return this.http.get(this.url(), options);
  },
});

var CommunitiesService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, function(http){
    RESTService.call(this, http);
    this.resourceUrl = 'communities';

    window.ob = this.list().subscribe(function(res) {
      window.t = this;
      window.res = res;
      console.log(res.json());
    });


window.ooo = new Rx.Observable(function(o) {
      window.obs = o;
      
    });

  }],
});

module.exports = CommunitiesService;


