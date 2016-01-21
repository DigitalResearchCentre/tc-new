var RESTService = require('./rest.service')
  , Http = ng.http.Http
;

var AuthService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, function(http){
    var self = this;
    RESTService.call(this, http);
    this.resourceUrl = 'auth';
    var _authUser = this._authUser = {};
    this._authUserObserver = this.detail(null);
    this._authUserObserver.subscribe(function(res) {
      self._authUser = res.json();
    });
  }],
  getAuthUser: function() {
    return this._authUserObserver;
  },
  getAuthUserCommunities: function() {
    
  },
  isAuthenticated: function() {
    return !!this._authUser._id;
  },
  logout: function() {
    this._authUser = {};
  },
});

module.exports = AuthService;

