var AuthService = require('./services/auth')
  , UIService = require('./services/ui')
  , CommunityService = require('./services/community')


var CreateCommunityComponent = ng.core.Component({
  selector: 'tc-create-community',
  templateUrl: '/app/createcommunity.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
    require('./editcommunity.component'),
  ],
}).Class({
  constructor: [CommunityService, UIService, AuthService,  function(communityService, uiService, authService) {
    this._uiService = uiService;
    this._authService = authService;
    this._communityService = communityService;
  }],
  ngOnInit: function() {
    var uiService = this._uiService
      , self = this
    ;
    this._authService.authUser$.subscribe(function(authUser) {
      if (!authUser) {
        uiService.loginModel$.emit('show');
      } else {
        self.name = authUser.getName();
      }
    });
  },
});

module.exports = CreateCommunityComponent;
