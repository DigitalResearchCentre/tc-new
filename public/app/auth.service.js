var Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , Inject = ng.core.Inject
  , RESTService = require('./rest.service')
  , User = require('./models/user')
;

var AuthService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, function(http){
    var self = this;
    RESTService.call(this, http);
    this.resourceUrl = 'auth';

    this._authUserSubject = new Rx.Subject();

    this._authUser = new User();

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
        return authUser.isNew() ? authUser : null;
      })
      .merge(this._authUserSubject).map(function(authUser) {
        console.log(authUser);
        self._authUser = authUser;
        console.log(authUser);
        return authUser;
      })
      .publishReplay(1).refCount();
  },
  modelClass: function() {
    return User;
  },
  isAuthenticated: function() {
    return this._authUser.isNew();
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


