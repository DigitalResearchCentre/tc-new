var RouteParams = ng.router.RouteParams
  , CommunityService = require('../community.service')
;

var CommunityHomeComponent = ng.core.Component({
  selector: 'tc-community-home',
  templateUrl: '/app/community/home.html',
}).Class({
  constructor: [RouteParams, CommunityService, function(
    _routeParams, _communityService
  ) {
    this._routeParams = _routeParams;
    this._communityService = _communityService;
  }],
  ngOnInit: function() {
    var id = this._routeParams.get('id');
    this._communityService.getCommunity(id).subscribe(function(res) {
      console.log(res);
      
    })
  },
});

module.exports = CommunityHomeComponent;
