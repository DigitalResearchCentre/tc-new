var _ = require('lodash')
  , RouteParams = ng.router.RouteParams
  , CommunityService = require('../community.service')
  , AuthService = require('../auth.service')
  , UIService = require('../ui.service')
  , CommunityHomeComponent = require('./home.component')
;

var AboutComponent = ng.core.Component({
  selector: 'tc-community-about',
  template: '<div>bar bar</div>'
}).Class({
  constructor: [RouteParams, CommunityService, function(
    _routeParams, _communityService
  ) {
    this._routeParams = _routeParams;
    this._communityService = _communityService;
  }],
  ngOnInit: function() {
    var id = this._routeParams.get('id');
  },
});



var CommunityComponent = ng.core.Component({
  selector: 'tc-community',
  templateUrl: '/app/community/community.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES, 
  ],
}).Class({
  constructor: [RouteParams, CommunityService, function(
    _routeParams, _communityService
  ) {
    console.log('Community');
    this._routeParams = _routeParams;
    this._communityService = _communityService;
  }],
  ngOnInit: function() {
    var id = this._routeParams.get('id');
    console.log(id);
  },
});

ng.router.RouteConfig([{
  path: '/', name: 'Default', component: CommunityHomeComponent
}, {
  path: '/home', name: 'CommunityHome', 
  component: CommunityHomeComponent
}, {
  path: '/about', name: 'CommunityAbout', 
  component: AboutComponent
}])(CommunityComponent);


module.exports = CommunityComponent;



