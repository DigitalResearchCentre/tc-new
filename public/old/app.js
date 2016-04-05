var $ = require('jquery')
  , _ = require('lodash')
  , angular = require('angular')
  , config = require('../config')
  , TCService = require('tc')
  , login = require('./login.js')
;
require('./app.less');
require('bootstrap');

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
  '$scope', 'TCService', '$q', '$http', '$location', '$window',
  function($scope, TCService, $q, $http, $location, $window) {
  var Community = TCService.Community;

  $scope.hideHeader = false;
  $scope.source="default";
  $scope.app = TCService.app;
  var authUser = TCService.app.authUser;
  TCService.app.communities.$promise.then(function() {
    authUser.$promise.then(function() {
        if (authUser.local && authUser.memberships.length==1 && (authUser.memberships[0].role=="CREATOR" || authUser.memberships[0].role=="LEADER")) {
          $scope.community = TCService.app.communities.filter(function (obj){ return obj._id === authUser.memberships[0].community._id;})[0];
        }
      if (!authUser.local) { $scope.userStatus="0"}
      else if (!authUser.memberships.length) {$scope.userStatus="1"} //user, but no communities or memberships
      else if (authUser.memberships.length==1 && (authUser.memberships[0].role=="CREATOR" || authUser.memberships[0].role=="LEADER") &&!$scope.community.documents.length) {$scope.userStatus="2";}  //user, one community, but no documents
      else if (authUser.memberships.length==1 && (authUser.memberships[0].role=="CREATOR" || authUser.memberships[0].role=="LEADER") && $scope.community.documents.length==1) {
        var doc = TCService.get($scope.community.documents[0], TCService.Doc);
        var options = {populate: JSON.stringify([{path: 'children', select: 'name'}])}
        doc.$get(options, function(){
          if (!doc.children.length) {
            $scope.userStatus="3";
            $scope.docname=doc.name;
            $scope.document=doc;
            $location.path('/community/' + $scope.community._id + '/view')
          }  else $scope.userStatus="4";
        });
      }  //user, one community, one document, but no pages
    });
  });
  $scope.logout = function() {
    $scope.userStatus="0";
    TCService.logout();
  };
  $scope.login = login;
  $scope.$watch('login.loginFrame', function (){
      console.log(login);
  });
  $scope.loadModal = function(which) {
    $scope.source=which;
    $("#MMADdiv").show();
    $("#MMADbutton").show();
    $('#manageModal').modal('show');
  }
  $scope.closeManageModal = function() {
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    this.message="";
    this.success="";
    $('#manageModal').modal('hide');
  }
  $scope.loginFrame = '/auth?url=/index.html';
}]);


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
