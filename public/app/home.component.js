var UIService = require('./services/ui')
, config = require('./config')
;


var HomeComponent = ng.core.Component({
  selector: 'tc-home',
  templateUrl: '/app/home.html',
}).Class({
  constructor: [UIService, function( uiService) {
//    console.log('Home');
    this._uiService = uiService;
    this.environment=config.env
  }],
  getUserStatus: function() {
    /*
    var authUser = this.authUser
      , status = 0
    ;
    if (authUser && authUser.local) {
      if (_.isEmpty(authUser.memberships)) {
        status = 1;
      } else if (
        authUser.memberships.length === 1 &&
        (authUser.memberships[0].role=="CREATOR" || authUser.memberships[0].role=="LEADER") &&!$scope.community.documents.length
      ) {
        //user, one community, but no documents
        status = 2;
      } else if (
        authUser.memberships.length === 1 && (
          authUser.memberships[0].role=="CREATOR" ||
          authUser.memberships[0].role=="LEADER"
        ) && $scope.community.documents.length==1) {
        //user, one community, one document, but no pages
          //        var doc = TCService.get($scope.community.documents[0], TCService.Doc);
        var options = {fields: JSON.stringify([{path: 'children', select: 'name'}])}
        doc.$get(options, function(){
          if (!doc.children.length) {
            $scope.userStatus="3";
            $scope.docname=doc.name;
            $location.path('/community/' + $scope.community._id + '/view')
          }  else $scope.userStatus="4";
        });

    }
    }
    */
  },
});

module.exports = HomeComponent;
