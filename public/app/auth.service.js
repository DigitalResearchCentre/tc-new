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

    this._authUserSubject = new Rx.Subject();

    this._authUser = null;

    this.initEventEmitters();
  }],
  initEventEmitters: function() {
    var self = this;
    this.authUser$ = this
      .detail(null, {
        search: {
          populate: JSON.stringify('memberships.community'),
        },
      })
      .map(function(authUser) {
        return authUser._id ? authUser : null;
      })
      .merge(this._authUserSubject).map(function(authUser) {
        self._authUser = authUser;
        return authUser;
      })
      .publishReplay(1).refCount();
  },
  isAuthenticated: function() {
    console.log(_authUser);
    return (this._authUser || {})._id;
    //return this._authUser && this._authUser.local.authenticated === 1;
  },
  logout: function() {
    var subject = this._authUserSubject;
    this.http.get('/auth/logout/').subscribe(function() {
      subject.next(null);
    });
  },
});


module.exports = AuthService;


