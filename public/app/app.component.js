require('bootstrap');
require('./app.less');

var RouteParams = ng.router.RouteParams
  , CommunityService = require('./community.service')
  , AuthService = require('./auth.service')
  , HomeComponent = require('./home.component')
;

var MemberProfileComponent = ng.core.Component({
  selector: 'tc-member-profile',
  template: '<div>foo</div>'
}).Class({
  constructor: function() {
    
  },
});

var CreateCommunityComponent = ng.core.Component({
  selector: 'tc-create-community',
  template: '<div>foo</div>'
}).Class({
  constructor: function() {
    
  },
});

var AppComponent = ng.core.Component({
  selector: 'tc-app',
  templateUrl: '/app/app.html',
  providers: [AuthService],
  directives: [
    ng.router.ROUTER_DIRECTIVES, 
    require('./header.component'),
  ],
}).Class({
  constructor: [function() { 
  }],
});
ng.router.RouteConfig([{
  path: '/app/', name: 'Default', component: HomeComponent, 
}, {
  path: '/app/home', name: 'Home', component: HomeComponent, 
}, {
  path: '/app/:id/...', name: 'Community', 
  component: require('./community/community.component')
}, {
  path: '/app/new-community', name: 'CreateCommunity', 
  component: CreateCommunityComponent
}, {
  path: '/app/profile', name: 'MemberProfile', 
  component: MemberProfileComponent
}])(AppComponent);


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
