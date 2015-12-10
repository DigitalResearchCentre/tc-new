var ManageCtrl = function($scope, $routeParams, $location, TCService) {
  var community = $scope.community = $scope.$parent.community;

  $scope.tmpl = $routeParams.params.split('/')[1] || 'edit-community';
  $scope.manageBaseUrl = '/community/' + community._id + '/manage/';

  $scope.isCreate=false;
  $scope.update = function() {
    //is everything in order? if not, send messages and warnings
    community.$update(function() {
      $location.path('/community/' + community._id + '/manage');
    });
  };
};
ManageCtrl.$inject = [
  '$scope', '$routeParams', '$location', 'TCService'
];


var AddXMLDocCtrl = function($scope, $routeParams, TCService) {
  var community = $scope.$parent.community
    , Doc = TCService.Doc
    , doc = new Doc()
  ;
  $scope.doc = doc;
  $scope.text = '';

  $scope.submit = function() {
    if (!doc._id) {
      doc.community = community;
      doc.$save(function() {
        community.documents.push(doc);
        TCService.commit({
          doc: doc,
          text: $scope.text || $scope.filereader,
        });
      });
    } else {
      TCService.commit({
        doc: doc,
        text: $scope.text || $scope.filereader,
      });
    }
  };
};
AddXMLDocCtrl.$inject = ['$scope', '$routeParams', 'TCService'];

module.exports = {
  ManageCtrl: ManageCtrl,
  AddXMLDocCtrl: AddXMLDocCtrl,
};
