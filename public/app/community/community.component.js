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
  constructor: [
    RouteParams, Router, Location, CommunityService, UIService, 
  function(
    routeParams, router, location, communityService, uiService
  ) {
    console.log('Community');
    this._routeParams = routeParams;
    this._router = router;
    this._location = location;
    this._communityService = communityService;
    this._uiService = uiService;

    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
    ;
  }],
  ngOnInit: function() {
    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
    ;
    this.route = route;
    this.community = this._communityService.get(id);
    this._uiService.communitySubject.next(id);
    this._communityService.fetch(id, {
      populate: 'documents entities'
    }).subscribe(function(cc) {
      console.log(cc);
      
    });
  },
  navigate: function(route) {
    var instruction = this._router.generate([
      'Community', {id: this.community.getId(), route: route}
    ]);
    this._location.go(instruction.toRootUrl());
    this.route = route;
  },
});

module.exports = CommunityComponent;
