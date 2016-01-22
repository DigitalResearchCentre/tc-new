require('bootstrap');
require('./app.less');

var UIService = require('./ui.service');

var RouteParams = ng.router.RouteParams
  , CommunityService = require('./community.service')
  , AuthService = require('./auth.service')
;

var HomeComponent = ng.core.Component({
  selector: 'tc-home',
  template: '<div>foo</div>'
}).Class({
  constructor: function() {
    
  },
});
var MemberProfileComponent = ng.core.Component({
  selector: 'tc-home',
  template: '<div>foo</div>'
}).Class({
  constructor: function() {
    
  },
});

var CreateCommunityComponent = ng.core.Component({
  selector: 'tc-home',
  template: '<div>foo</div>'
}).Class({
  constructor: function() {
    
  },
});

var CommunityHomeComponent = ng.core.Component({
  selector: 'tc-community-home',
  template: '<div>bar</div>'
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

var AppComponent = ng.core.Component({
  selector: 'tc-app',
  templateUrl: '/app/app.html',
  providers: [AuthService],
  directives: [
    ng.router.ROUTER_DIRECTIVES, 
    require('./loginmodal.component'),
  ],
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(
    communityService, authService, uiService
  ) { 
    this._authService = authService;
    this._communityService = communityService;
    this._uiService = uiService;

    this.loginFrame = '/auth?url=/index.html';
    this.authUser = null;

    this.hideHeader = false;
    this.source="default";

    /*
    this.app = TCService.app;
    var authUser = TCService.app.authUser;
    authUser.$promise.then(function() {
      if (!authUser.local) {
      }
    });
    this.login = login;
    var $scope = {};
    $scope.$watch('login.loginFrame', function (){
      console.log(login);
    });
    console.log(location.pathname);
    */
   
  }],
  ngOnInit: function() {
    var self = this;
    this._authService.getAuthUser().subscribe(function(authUser) {
      self.authUser = authUser;
    });
    this._communityService.getPublicCommunities().subscribe(function(coms) { 
      self.publicCommunities = coms;
    });
  },
  isAuthenticated: function() {
    return this._authService.isAuthenticated();
  },
  showLoginModal: function() {
    this._uiService.loginModel$.emit('show');
  },
  showLoginProf: function() {
    this._uiService.loginModel$.emit('show-login-prof');
  },
  logout: function() {
    this._authService.logout();
  },
  loadModal: function(which) {
    console.log(which);
    $scope.source=which;
    $('#manageModal').modal('show');
  },
});
ng.router.RouteConfig([{
  path: '/home', name: 'Home', component: require('./home.component'),
}, {
  path: '/:id/home', name: 'CommunityHome', component: CommunityHomeComponent
}, {
  path: '/new-community', name: 'CreateCommunity', 
  component: CreateCommunityComponent
}, {
  path: '/profile', name: 'MemberProfile', 
  component: MemberProfileComponent
},])(AppComponent);


module.exports = AppComponent;

/*

tcApp.controller('AppCtrl', [
  '$scope', 'TCService', '$q', '$http', '$location', '$window',
  function($scope, TCService, $q, $http, $location, $window) {
}]);




var $ = require('jquery')
  , _ = require('lodash')
  , angular = require('angular')
  , config = require('../config')
  , login = require('./login.js')
;

var allCommunities=[];
var tcApp = angular.module('TCApp', [
  'ngRoute', 'ngResource', 'ngSanitize', 'jdFontselect',
  require('./community').name,
]);


tcApp
  .config(function($routeProvider) {
    $routeProvider.when('/', {
      templateUrl:'home.html'
    })
    .when('/profile', {
      templateUrl: 'profile.html'
    })
    .when('/about', {
      templateUrl: 'about.html'
    })
    .when('/community/new', {
      controller: 'CreateCommunityCtrl',
      templateUrl: 'community/tmpl/create.html'
    })
    .when('/community/:communityId/:params*', {
      controller: 'CommunityCtrl',
      templateUrl: 'community/index.html'
    })
    .otherwise({
      templateUrl:'home.html'
    });
  })
  .factory('TCService', TCService)
;



tcApp.directive('tcHeader', require('tc-header/tc-header.js'));




/*
var AppCtrl = function(TCService, $q, $http, $location, $window) {
  var Community = TCService.Community
    , authUser = TCService.app.authUser
    , vm = this
  ;
  vm.hideHeader = false;
  vm.authUser = authUser;
  vm.communities = TCService.app.communities;
  vm.login = login;

  if ($location.search().prompt !== 'redirectModal') {
    vm.loginFrame = '/auth';
  } else {
    vm.loginFrame = '';
    $window.parent.angular.element('#frame').scope().login.closeModal();
  }
};
_.assign(AppCtrl.prototype, {
  logout: function() {
    TCService.logout();
  },
});
AppCtrl.$inject = ['TCService', '$q', '$http', '$location', '$window'];
tcApp.controller('AppCtrl', AppCtrl);
*/
