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
  }],
  getAuthUser: function() {
    if (!this._authUser$) {
      var subject = new Rx.Subject();

      this._authUser$ = this.detail(null, {
        search: {
          populate: JSON.stringify('memberships'),
        },
      }).map(function(res) {
        return res.json();
      }).merge(subject).map(function(r) {
        return r._id ? r : null;
      }).publishReplay(1).refCount();
    }
    return this._authUser$;
  },
  getAuthUserCommunities: function() {
    if (!this._publicCommunities$) {
      var subject = new Rx.Subject()
        , self = this
      ;

      this._publicCommunities$ = this.list({
        search: {
          find: JSON.stringify({public: true}),
        },
      }).map(function(res) {
        return res.json();
      }).merge(subject).map(function(r) {
        self._authUser = r;
        return r;
      }).publishReplay(1).refCount();
    }
    return this._publicCommunities$;
  },
  isAuthenticated: function() {
    return self._authUser && self._authUser.local.authenticated === 1;
  },
  logout: function() {
    this._authUser = {};
  },
});

module.exports = AuthService;

