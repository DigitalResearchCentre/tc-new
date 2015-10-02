//file upload stuff
var upLoadFile = angular.module('fileUpload', ['ngFileUpload']);

upLoadFile.controller('UpLoadCtrl', ['$scope', 'Upload', function ($scope, Upload) {
    // upload later on form submit or something similar
    // upload on file select or drop
    $scope.upload = function (file) {
        Upload.upload({
            url: 'upload/url',
            data: {file: file, 'username': $scope.username}
        }).then(function (resp) {
            console.log('Success ' + resp.config.file.name + 'uploaded. Response: ' + resp.data);
        }, function (resp) {
            console.log('Error status: ' + resp.status);
        }, function (evt) {
            var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
            console.log('progress: ' + progressPercentage + '% ' + evt.config.file.name);
        });
    };
}]);

var CommunityCtrl = function($scope, $routeParams, TCService) {
    var params = $routeParams.params
      , communityId = $routeParams.communityId
      , Community = TCService.Community
      , community
    ;
    $scope.tab = params.split('/').shift();
    $scope.community = community = TCService.get(communityId, Community);

    if (!community.status) {
      $scope.community.$get({
        fields: JSON.stringify([
          'status',
          {path: 'documents', select: 'name'},
        ]),
      });
    }
};
CommunityCtrl.$inject = ['$scope', '$routeParams', 'TCService'];

function checkCommunity (communities, community) {
    var message="";
    if (communities.filter(function (obj){return obj.name === community.name;})[0]) {message="Community name "+community.name+" already exists"}
    else if (communities.filter(function (obj){return obj.abbr === community.abbr;})[0]) {message="Community abbreviation "+community.abbr+" already exists"}
    else if (!community.name) {message="Community name cannot be blank"}
    else if (!community.abbr) {message="Community abbreviation cannot be blank"}
    else if (community.name.length>19) {message="Community name "+community.name+" must be less than 20 characters"}
    else if (community.abbr.length>4)  {message="Community abbreviation "+community.abbr+" must be less than 5 characters"}
    else if (community.longName.length>80) {message="Community long name "+community.longName+" must be less than 80 characters"}
    return message;
}

var CreateCommunityCtrl = function($scope, $routeParams, $location, TCService) {
    var params = $routeParams.params
      , Community = TCService.Community
      , community = new Community()
    ;
    $scope.community = community;
	  $scope.community.public=false;
	  $scope.community.accept=false;
    $scope.submit = function() { //is everything in order? if not, send messages and warnings
      console.log(TCService);
     	$scope.message=checkCommunity(TCService.app.communities, community);
		if ($scope.message!="") {
    		$location.path('/community/new');
    	} else {
    			community.$save(function() {
        		$location.path('/community/' + community._id + '/home');
	    	 });
	    };
    };
};

CreateCommunityCtrl.$inject = [
  '$scope', '$routeParams', '$location', 'TCService'];

var ViewCtrl = function($scope, $routeParams, TCService) {
  var params = $routeParams.params.split('/')
    , Doc = TCService.Doc
  ;
  $scope.docId = params[1];

  $scope.toggleNode = function(doc) {
    var expand = doc.expand = !doc.expand;
    if (!doc.children || _.isString(doc.children[0])) {
      TCService.get(doc, Doc).$get({
        fields: JSON.stringify({path: 'children', select: 'name'}),
      }, function() {
        doc.expand = expand;
      });
    }
  };
};
ViewCtrl.$inject = ['$scope', '$routeParams', 'TCService'];

var ViewerCtrl = function($scope, $routeParams, TCService) {
  var params = $routeParams.params.split('/')
    , Doc = TCService.Doc
    , pageId = params[2]
    , databaseRevision = {created: 'Version in database'}
  ;
  $scope.page = null;
  $scope.selectedRevision = null;
  $scope.transcript = '';
  $scope.revisions = [];

  $scope.$watch('page.revisions', function() {
    var page = $scope.page || {};
    $scope.revisions = [];
    _.forEachRight(page.revisions, function(revision) {
      if (!_.isString(revision)) {
        $scope.revisions.push(revision);
      }
    });
    $scope.revisions.push(databaseRevision) ;
    $scope.selectedRevision = $scope.revisions[0];
  });
  if (pageId) {
    $scope.page = TCService.get(pageId, Doc);
    if (!$scope.page.revisions || _.isString(_.last($scope.page.revisions))) {
      $scope.page.$get({
        fields: JSON.stringify({path: 'revisions'}),
      });
    }
  }
  $scope.save = function() {
    var page = $scope.page;
    Doc.patch({id: page._id}, {
      revision: $scope.selectedRevision.text
    }, function() {
      $scope.page.$get({
        fields: JSON.stringify({path: 'revisions'}),
      });
    });
  };
  $scope.commit = function() {
    TCService.commit($scope.page, $scope.selectedRevision.text, {
      fields: JSON.stringify({path: 'revisions'}),
    });
  };

};
ViewCtrl.$inject = ['$scope', '$routeParams', 'TCService'];


var ManageCtrl = function($scope, $routeParams, TCService) {
  var community = $scope.$parent.community
    , Doc = TCService.Doc
    , doc = new Doc()
  ;
  $scope.doc = doc;
  $scope.text = 'hello';

  $scope.submit = function() {
    if (!doc._id) {
      doc.community = community;
      doc.$save(function() {
        community.documents.push(doc);
        TCService.commit(doc, $scope.text);
      });
    } else {
      TCService.commit(doc, $scope.text);
    }
  };
};
ManageCtrl.$inject = ['$scope', '$routeParams', 'TCService'];


module.exports = {
  CommunityCtrl: CommunityCtrl,
  CreateCommunityCtrl: CreateCommunityCtrl,
  ViewCtrl: ViewCtrl,
  ViewerCtrl: ViewerCtrl,
  ManageCtrl: ManageCtrl,
};
