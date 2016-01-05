
var ManageCtrl = function($scope, $routeParams, $location, TCService) {
  var community = $scope.community = $scope.$parent.community;
  //
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


var AddXMLDocCtrl = function($scope, $routeParams, $location, TCService) {
  var communityId = $routeParams.communityId
    , Doc = TCService.Doc
    , doc = new Doc()
  ;
  var community = TCService.app.communities.filter(function (obj){ return obj._id === communityId;})[0];
  _.each(community.documents, function(doc, i) {
    community.documents[i] = TCService.get(doc, Doc);  });
  $scope.doc = doc;
  $scope.text = '';
  $scope.message=$scope.success='';'';

  $scope.submit = function() {
  if ($scope.doc.name == undefined || $scope.doc.name.trim()=="" ) {
        $scope.message = 'The document must have a name';
        return
    }
    var matcheddoc=community.documents.filter(function (obj){return obj.name === $scope.doc.name;})[0];
    if (matcheddoc) {
      $scope.message = 'There is already a document "'+$scope.doc.name+'"';
      return;
    }
    if (!$scope.text && !$scope.filereader) {
      $scope.message = 'Either paste text into the text box or choose a file';
      return;
    }
    $scope.message="";
    $scope.success="Adding document now. Check the view in a few seconds."
    if (!doc._id) {
      doc.community = community;
      doc.$save(function() {
        community.documents.push(doc);
        TCService.commit({
          doc: doc,
          text: $scope.text || $scope.filereader,
        }), function (){
          console.log("DONE")
        };
      });
    } else {
      TCService.commit({
        doc: doc,
        text: $scope.text || $scope.filereader,
      });
    }
  };
};
AddXMLDocCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];

var GetXMLDocCtrl = function($scope, $routeParams, $location, TCService) {
  var communityId = $routeParams.communityId
  , Doc = TCService.Doc
  , doc = new Doc()
  , docXML = "";
 ;
  var community = TCService.app.communities.filter(function (obj){ return obj._id === communityId;})[0];
  _.each(community.documents, function(doc, i) {
    community.documents[i] = TCService.get(doc, Doc);  });
    $scope.community=community;
    $scope.docXML=docXML;
    $scope.getDocumentXML = function() {
      console.log($scope.getXMLDoc)
      $scope.docXML="getting xml now"
      Doc.getTrees({id: $scope.getXMLDoc}, function(data ) {
        $scope.docXML=TCService.json2xml(data);
        console.log('data:text/xml,' + $scope.docXML);
      });
    }
};

GetXMLDocCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];

module.exports = {
  ManageCtrl: ManageCtrl,
  AddXMLDocCtrl: AddXMLDocCtrl,
  GetXMLDocCtrl: GetXMLDocCtrl,
};
