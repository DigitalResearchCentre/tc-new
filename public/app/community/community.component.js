var _ = require('lodash')
  , RouteParams = ng.router.RouteParams
  , Router = ng.router.Router
  , Location = ng.router.Location
  , CommunityService = require('../community.service')
  , AuthService = require('../auth.service')
  , UIService = require('../ui.service')
;


var CommunityComponent = ng.core.Component({
  selector: 'tc-community',
  templateUrl: '/app/community/community.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES, 
    require('./about.component'),
    require('./home.component'),
    require('./view.component'),
  ],
}).Class({
  constructor: [RouteParams, Router, Location, CommunityService, function(
    routeParams, router, location, communityService 
  ) {
    console.log('Community');
    this._routeParams = routeParams;
    this._router = router;
    this._location = location;
    this._communityService = communityService;

    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
    ;
    console.log(id);
  }],
  ngOnInit: function() {
    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
    ;
    this.route = route;
    this._communityService.getCommunity$(id).subscribe(function(community) {
      self.community = community;
    });
  },
  navigate: function(route) {
    var instruction = this._router.generate([
      'Community', {id: this.community._id, route: route}
    ]);
    this._location.go(instruction.toRootUrl());
    this.route = route;
  },
});

module.exports = CommunityComponent;



