var _ = require('lodash')
  , RouteParams = ng.router.RouteParams
  , Router = ng.router.Router
  , Location = ng.router.Location
  , CommunityService = require('../services/community')
  , AuthService = require('../services/auth')
  , UIService = require('../services/ui')
;

var CommunityComponent = ng.core.Component({
  selector: 'tc-community',
  templateUrl: '/app/community/community.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
    require('./about.component'),
    require('./home.component'),
    require('./view.component'),
    require('./manage.component'),
    require('../editcommunity.component'),
  ],
}).Class({
  constructor: [
    RouteParams, Router, Location, CommunityService, UIService, AuthService,
  function(
    routeParams, router, location, communityService, uiService, authService
  ) {
    this._routeParams = routeParams;
    this._router = router;
    this._location = location;
    this._communityService = communityService;
    this._uiService = uiService;
    if (authService._authUser) this.memberships = authService._authUser.attrs.memberships;
    else this.memberships-null;
    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
    ;
  }],
  ngOnInit: function() {
    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
      , uiService = this._uiService
    ;
    this.route = route;
    this.community = this._communityService.get(id);
    uiService.setCommunity(this.community);
  },
  navigate: function(route) {
    var instruction = this._router.generate([
      'Community', {id: this.community.getId(), route: route}
    ]);
    this._location.go(instruction.toRootUrl());
    this.route = route;
  },
  isLeader: function() {
      if (!this.memberships) return false;
      var memberships=this.memberships;
      var community=this.community;
      var leaderfound=memberships.filter(function (obj){return obj.community.attrs._id === community.attrs._id && (obj.role === "CREATOR" || obj.role === "LEADER");})[0];
      if (leaderfound) return true;
      else return false;
  }
});

module.exports = CommunityComponent;
