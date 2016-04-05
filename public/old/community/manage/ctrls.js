
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
  ;
  $('#manageModal').width("400px");
  $('#manageModal').height("400px");
  var community = TCService.app.communities.filter(function (obj){ return obj._id === communityId;})[0];
  $scope.text = '';
  $scope.message=$scope.success='';
  var documents = [];
  _.each(community.documents, function(mydoc, i) {
    documents[i] = TCService.get(mydoc, Doc);
  });
  $scope.submit = function() {
  if ($scope.doc.name == undefined || $scope.doc.name.trim()=="" ) {
        $scope.message = 'The document must have a name';
        return
    }
    var doc = new Doc();
    doc.name=$scope.doc.name;
    var matcheddoc=documents.filter(function (obj){return obj.name === $scope.doc.name;})[0];
    if (matcheddoc) {
      $scope.message = 'There is already a document "'+$scope.doc.name+'"';
      return;
    }
    if (!$scope.text && !$scope.filereader) {
      $scope.message = 'Either paste text into the text box or choose a file';
      return;
    }
    $scope.message="";
    $scope.success="Adding document \""+$scope.doc.name+"\" now."
    if (!doc._id) {
      doc.community = community;
      doc.$save(function() {
        community.documents.push(doc);
        documents.push({name: doc.name});
        TCService.commit({
          doc: doc,
          text: $scope.text || $scope.filereader,
        }).then(function (){
          $scope.success="Document \""+$scope.doc.name+"\" added."
          doc._id="";
          setTimeout( function() {
            $scope.success=""
          },2000);
          doc.name="";
        });
      });
    } else {
      TCService.commit({
        doc: doc,
        text: $scope.text || $scope.filereader,
      }), {}, function (){
        console.log("DONE");
      };
    }
  };
};
AddXMLDocCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];

var AddDocPageCtrl = function($scope, $routeParams, $location, TCService) {
  var Doc = TCService.Doc
    , doc = new Doc()
  ;
 var community=$scope.$parent.$parent.community;
 $('#manageModal').width("430px");
 $('#manageModal').height("355px");
 $scope.oneormany="OnePage";
 $scope.pageName="";
 $scope.submit = function(){
   if ($scope.oneormany=="OnePage") {
     if ($scope.pageName=="") {
       $scope.message="You must supply a name for the page";
       return;
     }
     if (!$scope.$parent.$parent.document.children.length) {
       TCService.commit({
          doc: $scope.$parent.$parent.document,
          text:  '<text><body><pb n="'+$scope.pageName+'"/></body></text>'
        }).then (function (newdoc){
          //this is assuming that the page added is the first page in the document!
          $scope.success="Page \""+$scope.pageName+"\" added."
          $scope.message="";
          $('#manageModal').modal('hide');
          $location.path('/community/'+$scope.$parent.$parent.community._id+'/view/'+$scope.$parent.$parent.document._id+'/'+newdoc.children[0])
          //close the window
      //    TCService.toggleDoc(newdoc);
        });
     }
   }
 }
 $scope.showSingle = function() {
   $("#MMADPsingle").show();
   $("#MMADPmultiple").hide();
 }
 $scope.showMany = function(){
   $("#MMADPsingle").hide();
   $("#MMADPmultiple").show();
 }
 $scope.fromFile = function() {
   $("#MMAPPSingleFile").show();
   $("#MMAPPSingleWeb").hide();
 }
 $scope.fromWeb = function(){
   $("#MMAPPSingleWeb").show();
   $("#MMAPPSingleFile").hide();
 }
 $scope.fromZip = function() {
   $("#MMAPPMFF").show();
   $("#MMAPPMFDD").hide();
 }
 $scope.fromDD = function(){
   $("#MMAPPMFDD").show();
   $("#MMAPPMFF").hide();
 }
};
AddDocPageCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];


var AddDocCtrl = function($scope, $routeParams, $location, TCService) {
  var Doc = TCService.Doc
    , doc = new Doc()
  ;
 var community=$scope.$parent.$parent.community
  _.each(community.documents, function(doc, i) {
    community.documents[i] = TCService.get(doc, Doc);
  });
  $scope.doc = doc;
  $('#manageModal').width("350px");
  $('#manageModal').height("188px");
  $scope.message="";
  $scope.success="";
  $scope.submit = function() {
    if ($scope.doc.name == undefined || $scope.doc.name.trim()=="" ) {
          $scope.message = 'The document must have a name';
          $('#MMADdiv').css("margin-top", "0px");
          $('#MMADbutton').css("margin-top", "10px");
          return
      }
      var matcheddoc=community.documents.filter(function (obj){return obj.name === $scope.doc.name;})[0];
      if (matcheddoc) {
        $scope.message = 'There is already a document "'+$scope.doc.name+'"';
        $('#MMADdiv').css("margin-top", "0px");
        $('#MMADbutton').css("margin-top", "10px");
        return;
      }
      //we got a document! add it
    newdoc = new Doc({
        name: $scope.doc.name,
        community: community,
    });
    newdoc.$save(function(){
      community.documents.push(newdoc);
      TCService.commit({
        doc: newdoc,
        text: "<text><body></body></text>",
      }).then(function (){
          $scope.success="Document "+newdoc.name+" added to community "+community.name;
          $('#MMADdiv').hide();
          if ($scope.$parent.$parent.userStatus=="2" || $scope.$parent.$parent.userStatus=="1") {
              $scope.$parent.$parent.userStatus="3";
              $scope.$parent.$parent.docname=$scope.doc.name;
              $scope.$parent.$parent.document=$scope.doc;
              $location.path('/community/' + community._id + '/view');
            }
          setTimeout( function() {
            $scope.$parent.$parent.closeManageModal();
          },2000);
        });
    });
  }
};
AddDocCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];

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
  AddDocPageCtrl: AddDocPageCtrl,
  AddDocCtrl: AddDocCtrl,
};
