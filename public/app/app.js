require('bootstrap');
require('./app.less');

AppComponent = ng.core.Component({
  selector: 'tc-app',
  template: '<h1>hello</h1>'
}).Class({
  constructor: function() {
    var Community = TCService.Community;

    this.hideHeader = false;
    this.source="default";
    this.app = TCService.app;

    var authUser = TCService.app.authUser;
    authUser.$promise.then(function() {
      if (!authUser.local) {
        //TCService.login('boy198512@gmail.com', 'test');
      }
    });
    this.login = login;
    $scope.$watch('login.loginFrame', function (){
      console.log(login);
    });
    console.log(location.pathname);
    this.loginFrame = '/auth?url=/index.html';
  },
  logout: function() {
    TCService.logout();
  },
  loadModal: function(which) {
    console.log(which);
    $scope.source=which;
    $('#manageModal').modal('show');
  },
});

tcApp.controller('AppCtrl', [
  '$scope', 'TCService', '$q', '$http', '$location', '$window',
  function($scope, TCService, $q, $http, $location, $window) {
}]);


module.exports = AppComponent;


var $ = require('jquery')
  , _ = require('lodash')
  , angular = require('angular')
  , config = require('../config')
  , TCService = require('tc')
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
