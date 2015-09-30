var $ = require('jquery')
  , _ = require('lodash')
  , angular = require('angular')
  , config = require('../config')
  , TCService = require('tc')
;
require('./app.less');

require('test');

var allCommunities=[];
var tcApp = angular.module('TCApp', [
  'ngRoute', 'ngResource', 'ngSanitize', 
  require('./community').name,
]);

tcApp
  .config(function($routeProvider) {
    $routeProvider.when('/', {
      templateUrl:'home.html'
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

tcApp.controller('AppCtrl', [
  '$scope', 'TCService', function($scope, TCService) {
  var Community = TCService.Community; 

  $scope.hideHeader = false;
  $scope.app = TCService.app;
  var authUser = TCService.app.authUser;

  authUser.$promise.then(function() {
    if (!authUser.local) {
      TCService.login('boy198512@gmail.com', 'test');
    }
  });
  $scope.logout = function() {
    TCService.logout();
  };
}]);

