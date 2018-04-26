var _ = require('lodash')
  , AuthService = require('./services/auth')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , CommunityService = require('./services/community')
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
  constructor: [AuthService, UIService, DocService, CommunityService, function(
    authService, uiService, docService, communityService
  ) {
    this._authService = authService;
    this._docService = docService;
    this._communityService = communityService;
    this.uiService = uiService;

    this.loginFrame = '/auth?url=/index.html';

    this.source="default";
    this.show=true;
    this.environment=config.env
    this.state = uiService.state;
    this.state.showTop=true;
  }],
  ngOnInit: function() {
    var self = this;

    this.createNotChosen=true;
    this.createChosen=false;
  },
  isAuthenticated: function() {
    return _.get(
      this.state.authUser, 'attrs.local.authenticated', null
    ) === "1";
  },
  getMemberships: function() {
    return _.get(this.state.authUser, 'attrs.memberships', []);
  },
  showCreateOrJoin: function() {
    return this.isAuthenticated() && _.isEmpty(this.getMemberships());
  },
  createNotChosenF: function() {
    return this.createNotChosen;
  },
  createChosenF: function() {
    var self=this;
    this.uiService.sendCommand$.subscribe(function(chosen) {
      if (chosen==="createChosen") {
          self.createChosen=true;
          self.createNotChosen=false;
      }
    });
    return self.createChosen;
  },
  saveCommunity: function() {
//    console.log('saveCommunity click');
    this.uiService.sendCommand$.emit("createCommunity");
  },
  showAddDocument: function() {
    var community = this.state.community
      , authUser = this.state.authUser
    ;
    return this._communityService.canAddDocument(community, authUser) &&
      _.isEmpty(_.get(community, 'attrs.documents', []));
  },
  showAddPage: function() {
    var community = this.state.community
      , authUser = this.state.authUser
    ;
    var doc = this.state.document;
    if (!this._communityService.canAddDocument(community, authUser)) return(false);
    return doc && _.isEmpty(_.get(doc, 'attrs.children'));
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
        document: this.state.document,
        parent: this.state.document,
        page: null,
        afterPage: false,
        multiple: false
      };
    }
    this.uiService.manageModal$.emit(which);
  },
  showNoUser: function() {
    return !this.isAuthenticated();
  }
});

module.exports = HeaderComponent;
