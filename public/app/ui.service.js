var EventEmitter = ng.core.EventEmitter
  , AuthService = require('./auth.service')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
;

var UIService = ng.core.Class({
  constructor: [AuthService, CommunityService, DocService,
    function(authService, communityService, docService){

    var self = this;
    this.loginModel$ = new EventEmitter();
    this.manageModal$ = new EventEmitter();
    this._communitySubject = new EventEmitter();
    this._communityService = communityService;
    this._docService = docService;

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
      this._docService.fetch(doc.getId(), {
        populate: JSON.stringify('children'),
      }).subscribe();
    }
    return doc;
  }
});

module.exports = UIService;
