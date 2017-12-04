var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
;


var CreateCommunityComponent = ng.core.Component({
  selector: 'tc-create-community',
  templateUrl: '/app/createcommunity.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
    require('./editcommunity.component'),
],
}).Class({
  constructor: [CommunityService, UIService, function(
    communityService, uiService
  ) {
    this._uiService = uiService;
    this._communityService = communityService;
    this.state = uiService.state;
    this.state.addedDoc=false;
  }],
  ngOnInit: function() {
    this._uiService.loginRequired();
    this.state.addedDoc=false;
  },
});

module.exports = CreateCommunityComponent;
