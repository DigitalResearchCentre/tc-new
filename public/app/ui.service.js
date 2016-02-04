var EventEmitter = ng.core.EventEmitter
  , AuthService = require('./auth.service')
;

var UIService = ng.core.Class({
  constructor: [AuthService, function(authService){

    var self = this;
    this.loginModel$ = new EventEmitter();
    this.manageModel$ = new EventEmitter();
    this._communitySubject = new EventEmitter();

    authService.authUser$.subscribe(function(authUser) {
      if (authUser) {
        var memberships = authUser.attrs.memberships;
        if (!self._community && memberships.length === 1) {
          self.setCommunity(memberships[0].community);
        }
      }
    });
    this.community$ = this._communitySubject.map(function(community) {
      self._community = community;
      return community;
    }).publishReplay(1).refCount();
  }],
  setCommunity: function(community) {
    console.log(community);
    if (community !== this._community) {
      this._communitySubject.next(community);
    }
    return community;
  }
});

module.exports = UIService;
