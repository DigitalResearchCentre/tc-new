var RouteParams = ng.router.RouteParams
  , CommunityService = require('../community.service')
;

var CommunityHomeComponent = ng.core.Component({
  selector: 'tc-community-home',
  templateUrl: '/app/community/home.html',
}).Class({
  constructor: [RouteParams, CommunityService, function(
    routeParams, communityService
  ) {
    this._routeParams = routeParams;
    this._communityService = communityService;
    window.rp = routeParams;
  }],
  ngOnInit: function() {
    var id = this._routeParams.get('id');
    this._communityService.getCommunity$(id).subscribe(function(res) {
      console.log(res);
      
    })
  },
});

module.exports = CommunityHomeComponent;
