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
    var self = this
      , communityService = this._communityService
    ;
    this._authService.authUser$.subscribe(function(authUser) {
      self.authUser = authUser;
    });
    communityService.publicCommunities$.subscribe(function(communities) { 
      self.publicCommunities = communities;
    });
    this._uiService.community$.subscribe(function(id){
      self.community = communityService.get(id);
    });
  },
  showCreateOrJoin: function() {
    return this.authUser && _.isEmpty(this.authUser.memberships);
  },
  showAddDocument: function() {
    var memberships = this.authUser.memberships
      , community
    ;
    if (memberships && memberships.length === 1) {
      community = memberships[0].community;
    }
    return community && _.isEmpty(community.documents);
  },
  showAddPage: function() {
    return this.currentDoc && _.isEmpty(this.currentDoc.children);
  },
  isAuthenticated: function() {
    console.log('isAuthenticated');
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
