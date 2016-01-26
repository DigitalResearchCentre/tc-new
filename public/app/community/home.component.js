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
    this._routeParams = routeParams;
    this._communityService = communityService;
    this._uiService = uiService;
  }],
  ngOnInit: function() {
    var self = this;
    this.uiService.community$.subscribe(function(community) {
      self.community = community;
    });
    var ping = this.ping = new ng.core.EventEmitter();

    var i = 0;
    setInterval(function() {
      i += 1;
      ping.next(i);
    }, 2000);
  },
});

module.exports = CommunityHomeComponent;
