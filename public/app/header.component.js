var _ = require('lodash')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
  , UIService = require('./ui.service')
  , DocService = require('./services/doc')
  , config = require('./config')
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
  constructor: [CommunityService, AuthService, UIService, DocService, function(
    communityService, authService, uiService, docService
  ) {
    console.log('Header');
    this._authService = authService;
    console.log(authService);
    this._communityService = communityService;
    this._docService = docService;
    this.uiService = uiService;

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
//      console.log(authUser);
    });
    communityService.publicCommunities$.subscribe(function(communities) {
      self.publicCommunities = communities;
    });
    communityService.allCommunities$.subscribe(function(communities) {
      self.allCommunities = communities;
    });

  },
  showCreateOrJoin: function() {
    return this.authUser && this.authUser.attrs.local && this.authUser.attrs.local.authenticated=="1" && _.isEmpty(this.authUser.attrs.memberships);
  },
  showAddDocument: function() {
    var community = this.uiService.community;
    if (community) {
        var isleader=null;
      var isleader = this.authUser.attrs.memberships.filter(function (obj){
        return (obj.community.attrs._id === community.attrs._id && (obj.role==="LEADER"||obj.role==="CREATOR"));}
      )[0];
      if (!isleader) return false;
    }
    //if I'm not the leader of the commmunity..
    if (community) {
      return _.isEmpty(community.attrs.documents);
    }
  },
  showAddPage: function() {
    var doc = this.uiService.document;
    return doc && _.isEmpty(doc.attrs.children);
  },
  showLoginModal: function() {
    this.uiService.loginModel$.emit('show');
  },
  showLoginProf: function() {
    this.uiService.loginModel$.emit('show-login-prof');
  },
  logout: function() {
    this._authService.logout();
  },
  loadModal: function(which) {
    if (which === 'add-document-page') {
      which = {
        type: which,
        parent: this.uiService.document,
      };
    }
    this.uiService.manageModal$.emit(which);
  },
  showNoUser: function() {
    return !this.authUser || !this.authUser.attrs.local || this.authUser.attrs.local.authenticated=='0';
  }
});

module.exports = HeaderComponent;
