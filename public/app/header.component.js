var _ = require('lodash')
  , CommunityService = require('./community.service')
  , AuthService = require('./auth.service')
  , UIService = require('./ui.service')
;

var HeaderComponent = ng.core.Component({
  selector: 'tc-header',
  templateUrl: '/app/header.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
    require('./loginmodal.component'),
    require('./managemodal.component'),
  ],
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(
    communityService, authService, uiService
  ) {
    console.log('Header');
    this._authService = authService;
    console.log(authService);
    this._communityService = communityService;
    this._uiService = uiService;

    this.loginFrame = '/auth?url=/index.html';
    this.authUser = null;

    this.source="default";
  }],
  ngOnInit: function() {
    var that = this
      , communityService = this._communityService
    ;
    this._authService.getAuthUser().subscribe(function(authUser) {
      that.authUser = authUser;
    });
    communityService.getPublicCommunities().subscribe(function(communities) {
      that.publicCommunities = communities;
    });
    communityService.getMyCommunities().subscribe(function(communities) {
      that.myCommunities = communities;
      if (!that.community && communities.length == 1) {
        that._uiService.communitySubject.next(that.myCommunities[0]._id);
      }
    });
    this._uiService.community$.subscribe(function(id){
      that.community = communityService.get(id);
    })
  },
  showCreateOrJoin: function() {
    return this.authUser && _.isEmpty(this.authUser.memberships);
  },
  showAddDocument: function() {
    if (this.myCommunities.length=="1") {
        this.currentCommunity=this.myCommunities[0];
    }
    return this.currentCommunity && _.isEmpty(this.currentCommunity.documents);
  },
  showAddPage: function() {
    return this.currentDoc && _.isEmpty(this.currentDoc.children);
  },
  isAuthenticated: function() {
    return this._authService.isAuthenticated();
  },
  showLoginModal: function() {
    this._uiService.loginModel$.emit('show');
  },
  showLoginProf: function() {
    this._uiService.loginModel$.emit('show-login-prof');
  },
  logout: function() {
    this._authService.logout();
  },
  loadModal: function(which) {
    this._uiService.manageModel$.emit(which);
  },
});

module.exports = HeaderComponent;
