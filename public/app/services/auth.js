var Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , Inject = ng.core.Inject
  , RESTService = require('./rest')
  , User = require('../models/user')
  , Rx = require('rxjs')
;

var AuthService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, function(http){
    var self = this;
    RESTService.call(this, http);
    this.resourceUrl = 'auth';

    this._refresh = new Rx.Subject();

    this._authUser = null;

    this.initEventEmitters();
  }],
  modelClass: function() {
    return User;
  },
  initEventEmitters: function() {
    var self = this;

    this.authUser$ = this._refresh.startWith(null).flatMap(function() {
      return self.detail(null, {
        search: {
          populate: JSON.stringify('memberships.community'),
        },
      });
    }).map(function(authUser) {
        self._authUser = authUser.isNew() ? null : authUser;
        return self._authUser;
      })
      .publishReplay(1).refCount();
  },
  refresh: function() {
    this._refresh.next(null);
  },
  logout: function() {
    var refresh = this._refresh;
    this.http.get('/auth/logout/').subscribe(function() {
      refresh.next(null);
    });
  },
});


module.exports = AuthService;


