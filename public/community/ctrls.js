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
    };
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

var CommunityHdrCtrl = function($scope, $routeParams, $location, TCService) {
  var authUser = TCService.app.authUser;
  var community;
  TCService.app.communities.$promise.then(function() {
    authUser.$promise.then(function() {
        if (authUser.local && authUser.memberships.length==1 && (authUser.memberships[0].role=="CREATOR" || authUser.memberships[0].role=="LEADER")) {
          community = TCService.app.communities.filter(function (obj){ return obj._id === authUser.memberships[0].community._id;})[0];
        }
      if (!authUser.local) { $scope.userStatus="0"}
      else if (!authUser.memberships.length) {$scope.userStatus="1"} //user, but no communities or memberships
      else if (authUser.memberships.length==1 && authUser.memberships[0].role=="CREATOR" && !community.documents.length) {$scope.userStatus="2";}  //user, one community, but no documents
      else if (authUser.memberships.length==1 && authUser.memberships[0].role=="CREATOR" && community.documents.length==1) {
        var doc = TCService.get(community.documents[0], TCService.Doc);
        var options = {fields: JSON.stringify([{path: 'children', select: 'name'}])}
        doc.$get(options, function(){
          if (!doc.children.length) {
            $scope.userStatus="3";
            $scope.docname=doc.name;
            //test... if we have a call to index page only, reset the view
            console.log("in commhdr "+$(location).attr('href'));
            if ($scope.$parent.tab=="tmpl/view.html") {
              $location.path('/community/' + community._id + '/view')
            }
          }  else $scope.userStatus="4";
        });
      }  //user, one community, one document, but no pages
      else $scope.userStatus="4";
    });
  });
};
CommunityHdrCtrl.$inject = ['$scope', '$routeParams', '$location', 'TCService'];

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
            //if this is the first community -- send to the main screen, set to add pages
            //ie: only one membership, and a leader of that!
            if ($scope.$parent.$parent.userStatus=="1") {
              $scope.$parent.$parent.community=community;
              $scope.$parent.$parent.userStatus=="2";
            }
            $location.path('/community/' + community._id + '/home');
          });
        }
    };
    $scope.update = function() { //is everything in order? if not, send messages and warnings
          console.log("here")
          community.$save();
    };
};

CreateCommunityCtrl.$inject = [
  '$scope', '$routeParams', '$location', 'TCService'];

ViewCtrl.$inject = [
  '$scope', '$routeParams', '$location', '$timeout', 'TCService'
];
function ViewCtrl($scope, $routeParams, $location, $timeout, TCService) {
  console.log($routeParams);
  var params = $routeParams.params.split('/')
    , Doc = TCService.Doc
    , Entity = TCService.Entity
  ;
  $("ul.nav-tabs a").click(function (e) {
    e.preventDefault();
      $(this).tab('show');
  });
  $scope.docId = params[1];
  if (params.length > 2) {
    $scope.pageId = params[2];
  }
  $scope.toggleDoc = function (doc) {
    var expand = doc.expand = !doc.expand;
    if (!doc.children || _.isString(doc.children[0])) {
      TCService.get(doc, Doc).$get({
        populate: JSON.stringify([{
          path: 'children', select: 'name'
        }]),
      }, function() {
        doc.expand = expand;
      });
      Doc.getEntities({id: doc._id}, function(entities) {
        doc.entities = entities;
      });
    }
  };
;
  $scope.toggleEntity = function(node, doc) {
    var expand = node.expand = !node.expand;
    if (!node.entities) {
      Doc.getEntities({
        id: doc._id, entityId: node._id
      }, function(entities) {
        node.entities = entities;
      });
    }
  };
  if ($scope.pageId) {
    //$scope.toggleDoc($scope.docId);
  }

  $scope.selectEntity = function(entity, doc) {
    Entity.getDocs({
      id: entity._id, docId: doc._id
    }, function(docs) {
      $location.path(
        '/community/' + $scope.community._id
        + '/view/' + doc._id + '/' + docs[0]._id + '/');
    });
  };

  $scope.extractXML = function($event, doc) {
    if (!$event.target.href) {
      $event.preventDefault();
      Doc.getTrees({id: doc._id}, function(data ) {
        $event.target.href = 'data:text/xml,' + TCService.json2xml(data);
        $timeout(function() {
          $event.target.click();
        });
      });
    }
  };
}

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
    , page, pb
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
        populate: JSON.stringify('revisions'),
      });
    }

    Doc.getLinks({id: page._id}, function(data) {
      _.forEachRight(data.prev, function(el) {
        if (el.name === '#text') {
          data.prev.pop();
        } else {
          return false;
        }
      });
      _.forEachRight(data.next, function(el) {
        if (el.name === '#text') {
          data.prev.pop();
        } else {
          return false;
        }
      });
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
        pb = parent.children.shift();
      }
      //here we test what is going to appear in the viewer
      var viewtext=TCService.json2xml(teiRoot);
      if (viewtext=="<text><body/></text")
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
      docElement: pb,
      links: {
        prev: links.prev.slice(0, _.findIndex(links.prev, $scope.prevLink) + 1),
        next: links.next.slice(0, _.findIndex(links.next, $scope.nextLink) + 1),
      },
    }, {
      populate: JSON.stringify({path: 'revisions'}),
    }, function(err) {
      if (err) {
        return console.log(err);
      }
      Doc.getTrees({id: page._id}, function(data) {
        var teiRoot = _getTei(data);
        databaseRevision.text = TCService.json2xml(teiRoot.children[0]);
      });
    });
  };
};
ViewerCtrl.$inject = ['$scope', '$routeParams', 'TCService'];

module.exports = {
  CommunityCtrl: CommunityCtrl,
  CreateCommunityCtrl: CreateCommunityCtrl,
  ViewCtrl: ViewCtrl,
  ViewerCtrl: ViewerCtrl,
  UpLoadCtrl: UpLoadCtrl,
  MemberCtrl: MemberCtrl,
  ProfileMemberCtrl: ProfileMemberCtrl,
  CommunityHdrCtrl: CommunityHdrCtrl,
};
