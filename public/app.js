var $ = require('jquery')
  , _ = require('lodash')
  , angular = require('angular')
  , config = require('../config')
  , TCService = require('tc')
  , login = require('./login.js')
;
require('./app.less');
require('bootstrap');

require('test');

window.$ = $;

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

tcApp.controller('AppCtrl', [
  '$scope', 'TCService', '$q', '$http', '$location', function($scope, TCService, $q, $http, $location) {

  var Community = TCService.Community;

  $scope.hideHeader = false;
  $scope.app = TCService.app;
  var authUser = TCService.app.authUser;
  authUser.$promise.then(function() {
    if (!authUser.local) {
      //TCService.login('boy198512@gmail.com', 'test');
    }
  });
  $scope.logout = function() {
    TCService.logout();
  };
  $scope.login = login;
  console.log(location.pathname)
  $scope.loginFrame = '/auth?url=/index.html';
}]);

function pipe(f1, f2) {
  var funcs = Array.prototype.slice.call(arguments);

  return function() {
    var result = arguments;
    if (funcs.length > 0) {
      result = funcs.shift().apply(null, result);
    }
    funcs.forEach(function(func) {
      result = func(result);
    });
    return result;
  }

}
function foo(a, b, c) {
  console.log(a);
  return a+b+c;
}
function bar(a) {
  console.log(a);
  return a+2;
}
function baz(a) {
  console.log(a);
  return a+3;
}
console.log(pipe()(1, 2, 3));
