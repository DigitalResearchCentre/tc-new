var Observable = Rx.Observable
  , Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('./rest.service')
  , AuthService = require('./auth.service')
  , Doc = require('./models/doc')
;

var DocService = ng.core.Injectable().Class({
  extends: RESTService,
  constructor: [Http, AuthService, function(http, authService){
    var self = this;
    RESTService.call(this, http);

    this._authService = authService;
    this.resourceUrl = 'docs';

    this.initEventEmitters();
  }],
  modelClass: function() {
    return Doc;
  },
  initEventEmitters: function() {
    var self = this;
  },
});

module.exports = DocService;

