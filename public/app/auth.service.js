var Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , Inject = ng.core.Inject
  , RESTService = require('./rest.service')
;

var AuthService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, function(http){
    var self = this;
    RESTService.call(this, http);
    this.resourceUrl = 'auth';

    this._authUser = null;
    this._authUserSubject = new Rx.Subject();
    window.as = this;
  }],
  getAuthUser: function() {
    var self = this;
    if (!this._authUser$) {
      console.log('hello');
      this._authUser$ = this.detail(null, {
        search: {
          populate: JSON.stringify('memberships.community'),
        },
      }).map(function(res) {
        var authUser = res.json();
        return authUser._id ? authUser : null;
      }).merge(this._authUserSubject).map(function(authUser) {
        self._authUser = authUser;
        return authUser;
      }).publishReplay(1).refCount();
    }
    return this._authUser$;
  },
  isAuthenticated: function() {
    return (this._authUser || {})._id;
    //return this._authUser && this._authUser.local.authenticated === 1;
  },
  logout: function() {
    var self = this;
    this.http.get('/auth/logout/').subscribe(function() {
      self._authUserSubject.next(null);
    });
  },
});


module.exports = AuthService;

