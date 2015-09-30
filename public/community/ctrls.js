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

var CreateCommunityCtrl = function($scope, $routeParams, $location, TCService) {
    var params = $routeParams.params
      , Community = TCService.Community
      , community = new Community()
    ;
    $scope.community = community;
	$scope.community.public="0";
    $scope.submit = function() {
      community.$save(function() {
        console.log(community);
        //$location.path('/community/' + community._id + '/home');
      });
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
    , page
  ;
  $scope.page = null;
  if (pageId) {
    $scope.page = page = TCService.get(pageId, Doc);
    $scope.text = '';
    if (!page.revisions || _.isString(_.last(page.revisions))) {
      $scope.page.$get({
        fields: JSON.stringify({path: 'revisions'}),
      }, function() {
        var revision = _.last(page.revisions);
        if (revision) {
          $scope.text = revision.text;
        }
      });
    } else {
      var revision = _.last(page.revisions);
      if (revision) {
        $scope.text = revision.text;
      }
    }
  }
  $scope.save = function() {
    Doc.patch({id: page._id}, {text: $scope.text}, function() {
      page.$get();
    });
  };
  $scope.commit = function() {
    var text = $scope.text;
    TCService.commit($scope.page, text);
    /*
    */
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
    TCService.commit(null, $scope.text);

  }
};
ManageCtrl.$inject = ['$scope', '$routeParams', 'TCService'];


module.exports = {
  CommunityCtrl: CommunityCtrl,
  CreateCommunityCtrl: CreateCommunityCtrl,
  ViewCtrl: ViewCtrl,
  ViewerCtrl: ViewerCtrl,
  ManageCtrl: ManageCtrl,
};

