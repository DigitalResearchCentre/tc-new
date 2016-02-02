var RouteParams = ng.router.RouteParams
  , CommunityService = require('../community.service')
  , UIService = require('../ui.service')
;

var CommunityHomeComponent = ng.core.Component({
  selector: 'tc-community-home',
  templateUrl: '/app/community/home.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [RouteParams, CommunityService, UIService, function(
    routeParams, communityService, uiService
  ) {
    console.log('community home');
    this._routeParams = routeParams;
    this._communityService = communityService;
    this._uiService = uiService;
  }],
  ngOnInit: function() {
    var self = this;
    console.log(this.community);
    window.cc = this.community;
  },
});

module.exports = CommunityHomeComponent;
