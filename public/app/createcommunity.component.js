var AuthService = require('./auth.service')
  , UIService = require('./ui.service')
;

var CreateCommunityComponent = ng.core.Component({
  selector: 'tc-create-community',
  templateUrl: '/app/createcommunity.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES, 
    require('./editcommunity.component'),
  ],
}).Class({
  constructor: [UIService, AuthService,  function(uiService, authService) {
    this._uiService = uiService;
    this._authService = authService;
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

