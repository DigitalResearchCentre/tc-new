var UpLoadCtrl = function ($scope) {
    // upload later on form submit or something similar
    // upload on file select or drop
    $scope.upload = function (file) {
        var fileReader = new FileReader();
      fileReader.onload = function(evt) {
        $scope.$parent.community.image = evt.target.result;
        $scope.$parent.community.haspicture=true;
      };
      fileReader.readAsDataURL(file);
    };
    $scope.nullImage = function () {
      $scope.$parent.community.image ="";
      $scope.$parent.community.image =false;
    };
};
UpLoadCtrl.$inject = ['$scope'];

var ProfileMemberCtrl = function($scope, $routeParams, $location, TCService) {
    var user=TCService.app.authUser;
    $scope.nmemberships=0;
    $scope.communities=TCService.app.communities;
    $scope.memberships = TCService.app.authUser.memberships;
    if ($scope.memberships) {
      $scope.nmemberships=$scope.memberships.length;
      _.each($scope.communities, function(community) {
        var matched = $scope.memberships.filter(function (obj){
          return obj.community._id === community._id;
        })[0];
        if (!matched && community.accept) {
          community.available=1;
        } else {
          community.available=0;
        }
      });
    }
    $scope.joinComm= function(communityId) {
        $location.path('/community/' + communityId + '/join');
    };
    $scope.create=function() {
      $location.path('/community/new');
    }
};
ProfileMemberCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];

var MemberCtrl = function($scope, $routeParams, $location, TCService) {
    var params = $routeParams.params
      , communityId = $routeParams.communityId
      , Community = TCService.Community
      , community
    ;
    var user=TCService.app.authUser;
//    $scope.tab = params.split('/').shift(); do we need this?
    $scope.community = community = TCService.app.communities.filter(
      function (obj){
        return obj._id === communityId;
      }
    )[0];
    $scope.isMember=false; $scope.isLeader=false; $scope.isCreator=false; $scope.canJoin=false; $scope.isTranscriber=false;
    $scope.nmemberships=0;
    $scope.communityId=communityId;
    if ($scope.isCreate) { //new memberships not written in time
      $scope.isMember=true;
      $scope.isCreate=false;
    }
    if (user.local)  {
      var memberships = TCService.app.authUser.memberships;
      $scope.nmemberships=memberships.length;
      var matchedmem=memberships.filter(function (obj){return obj.community._id === communityId;})[0];
      if (matchedmem)  {
        $scope.isMember=true;  //I am a member of this community
        if (matchedmem.role=="LEADER") $scope.isLeader=true;
        if (matchedmem.role=="CREATOR") $scope.isCreator=true;
        if (matchedmem.role=="TRANSCRIBER") $scope.isTranscriber=true;
      } else if (community.accept) $scope.canJoin=true;
    } else {
      if (community.accept) $scope.canJoin=true;
    }
    $scope.join= function() {
        $location.path('/community/' + communityId + '/join');
    };
};
MemberCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];

//figure out: am I a member of this community, its leader.. what
var CommunityCtrl = function($scope, $routeParams, TCService) {
    var params = $routeParams.params
      , communityId = $routeParams.communityId
      , Community = TCService.Community
      , community
    ;
    var user=TCService.app.authUser;
    var tabs = {
      'about': 'tmpl/about.html',
      'home': 'tmpl/home.html',
      'view': 'tmpl/view.html',
      'manage': 'manage/manage.html',
      'join':'tmpl/join.html'
    };
    $scope.tab = tabs[params.split('/').shift()];

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
    var matchedname=communities.filter(function (obj){return obj.name === community.name;})[0];
    var matchedabbrev=communities.filter(function (obj){return obj.abbr === community.abbr;})[0];
    if (matchedname && matchedname._id!=community._id) {
      message="Community name "+community.name+" already exists";
    } else if (matchedabbrev && matchedabbrev._id!=community._id) {
      message="Community abbreviation "+community.abbr+" already exists";
    } else if (!community.name) {
      message="Community name cannot be blank";
    } else if (!community.abbr) {
      message="Community abbreviation cannot be blank";
    } else if (community.name.length>19) {
      message="Community name "+community.name+" must be less than 20 characters";
    } else if (community.abbr.length>4)  {
      message="Community abbreviation "+community.abbr+" must be less than 5 characters";
    } else if (community.longName && community.longName.length>80) {
      message="Community long name "+community.longName+" must be less than 80 characters";
    }
    return message;
}

var CreateCommunityCtrl = function($scope, $routeParams, $location, TCService) {
    var params = $routeParams.params
      , Community = TCService.Community
      , community = new Community()
    ;
    community.public=false;
    community.accept=false;
    community.autoaccept= false;
    community.alldolead= false;
    community.haspicture= false;
    community.creator= TCService.app.authUser._id;
    $scope.community = community;
    $scope.isCreate=true;
    $scope.submit = function() { //is everything in order? if not, send messages and warnings
      $scope.message=checkCommunity(TCService.app.communities, community);
        if ($scope.message!=="") {
          $location.path('/community/new');
        } else {
          community.$save(function() {
        //    if (picFile) community.image= picFile.$
            $scope.isCreate=true;
            $location.path('/community/' + community._id + '/home');
          });
        }
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

function _getTei(data) {
  var docs = {}
    , texts = {}
    , teiRoot = {name: 'TEI', children: []}
  ;
  _.each(data.descendants, function(doc) {
    docs[doc._id] = doc;
  });
  _.each(data.texts, function(el) {
    texts[el._id] = el;
    if (el.name === '#text' && el.text) {
      el.children = [el.text];
    }
  });
  _.each(texts, function(el) {
    var parentId = _.last(el.ancestors);
    if (!parentId || !texts[parentId]) {
      teiRoot.children.push(el);
    } else {
      parent = texts[parentId];
      parent.children[parent.children.indexOf(el._id)] = el;
      el.parent = parent;
    }
  });
  return teiRoot;
}

var ViewerCtrl = function($scope, $routeParams, TCService) {
  var params = $routeParams.params.split('/')
    , Doc = TCService.Doc
    , pageId = params[2]
    , databaseRevision = {created: 'Version in database'}
    , page
  ;
  $scope.page = page = null;
  $scope.selectedRevision = null;
  $scope.transcript = '';
  $scope.revisions = [];

  $scope.$watch('page.revisions', function() {
    page = $scope.page || {};
    $scope.revisions = [];
    _.forEachRight(page.revisions, function(revision) {
      if (!_.isString(revision)) {
        $scope.revisions.push(revision);
      }
    });
    $scope.revisions.push(databaseRevision) ;
    $scope.selectedRevision = $scope.revisions[0];
  });

  $scope.json2xml = TCService.json2xml;

  if (pageId) {
    $scope.page = page = TCService.get(pageId, Doc);

    if (!page.revisions || _.isString(_.last(page.revisions))) {
      page.$get({
        fields: JSON.stringify('revisions'),
      });
    }

    Doc.getLinks({id: page._id}, function(data) {
      $scope.links = data;
      $scope.prevLink = _.last(data.prev);
      $scope.nextLink = _.last(data.next);
    });
    Doc.getTrees({id: page._id}, function(data) {
      var teiRoot = data
        , firstText = teiRoot
        , parent, index
      ;
      while ((firstText.children || []).length > 0) {
        index = _.findIndex(firstText.children, function(child) {
          return !_.isString(child);
        });
        firstText.children = firstText.children.slice(index);
        parent = firstText;
        firstText = firstText.children[0];
      }
      if (parent) {
        parent.children.shift();
      }
      databaseRevision.text = TCService.json2xml(teiRoot);
    });
    /*
    Doc.getLinks({id: page._id}, function(data) {
      console.log(data);
    });
    */
  }

  $scope.save = function() {
    page = $scope.page;
    Doc.patch({id: page._id}, {
      revision: $scope.selectedRevision.text
    }, function() {
      page.$get({
        fields: JSON.stringify('revisions'),
      });
    });
  };

  $scope.commit = function() {
    var links = $scope.links;
    
    TCService.commit({
      doc: $scope.page, 
      text: $scope.selectedRevision.text,
      links: {
        prev: links.prev.slice(0, _.findIndex(links.prev, $scope.prevLink) + 1),
        next: links.next.slice(0, _.findIndex(links.next, $scope.nextLink) + 1),
      },
    }, {
      fields: JSON.stringify({path: 'revisions'}),
    }, function(err) {
      if (err) {
        return alert(err);
      }
      Doc.getTrees({id: page._id}, function(data) {
        var teiRoot = _getTei(data);
        databaseRevision.text = TCService.json2xml(teiRoot.children[0]);
      });
    });
  };

};
ViewCtrl.$inject = ['$scope', '$routeParams', 'TCService'];

module.exports = {
  CommunityCtrl: CommunityCtrl,
  CreateCommunityCtrl: CreateCommunityCtrl,
  ViewCtrl: ViewCtrl,
  ViewerCtrl: ViewerCtrl,
  UpLoadCtrl: UpLoadCtrl,
  MemberCtrl: MemberCtrl,
  ProfileMemberCtrl: ProfileMemberCtrl,
};
