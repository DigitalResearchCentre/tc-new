var EventEmitter = ng.core.EventEmitter
  , AuthService = require('./auth.service')
  , CommunityService = require('./community.service')
;

var UIService = ng.core.Class({
  constructor: [AuthService, CommunityService,
    function(authService, communityService){

    var self = this;
    this.loginModel$ = new EventEmitter();
    this.manageModel$ = new EventEmitter();
    this._communitySubject = new EventEmitter();
    this._communityService = communityService;

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
      this._communityService.fetch(community.getId(), {
        populate: JSON.stringify('documents entities')
      }).subscribe();
      if (community && community.attrs.documents) {
        this.setDocument(community.attrs.documents[0]);
      }
    }
    return community;
  },
  setDocument: function(doc) {
    if (doc !== this.document) {
      this.document = doc;
    }
    return doc;
   
  }
});

module.exports = UIService;
