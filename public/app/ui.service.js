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
        self.authUser = authUser;
        var memberships = authUser.attrs.memberships;
        if (!self._community && memberships.length === 1) {
          self.setCommunity(memberships[0].community);
        }
      }
    });

    this.community = null;
  }],
  setCommunity: function(community) {
    if (community !== this.community) {
      this.community = community;
    }
    return community;
  }
});

module.exports = UIService;
