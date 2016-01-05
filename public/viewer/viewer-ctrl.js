
var ViewCtrl = function($routeParams, $location, $scope, TCService) {
  var vm = this
    , params = _.defaults({
      viewBy: 'page',
    }, $routeParams)
    , Doc = TCService.Doc
    , Entity = TCService.Entity
    , community = TCService.app.community
  ;

  $("ul.nav-tabs a").click(function (e) {
    e.preventDefault();
      $(this).tab('show');
  });

  vm.toggleDoc = function(doc) {
    var expand = doc.expand = !doc.expand;
    if (!doc.children || _.isString(doc.children[0])) {
      TCService.get(doc, Doc).$get({
        fields: JSON.stringify([{
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
  vm.toggleEntity = function(node, doc) {
    var expand = node.expand = !node.expand;
    if (!node.entities) {
      Doc.getEntities({
        id: doc._id, entityId: node._id
      }, function(entities) {
        node.entities = entities;
      });
    }
  };

  vm.selectEntity = function(entity, doc) {
    Entity.getDocs({
      id: entity._id, docId: doc._id
    }, function(docs) {
      $location.path(
        '/community/' + vm.community._id
        + '/view/' + doc._id + '/' + docs[0]._id + '/');
    });
  };
};
ViewCtrl.$inject = ['$routeParams', '$location', '$scope', 'TCService'];

var ViewerCtrl = function($routeParams, TCService) {
  var params = $routeParams.params.split('/')
    , vm = this
    , Doc = TCService.Doc
    , pageId = params[2]
    , databaseRevision = {created: 'Version in database'}
    , page, pb
  ;
  vm.page = page = null;
  vm.selectedRevision = null;
  vm.transcript = '';
  vm.revisions = [];

  vm.$watch('page.revisions', function() {
    page = vm.page || {};
    vm.revisions = [];
    _.forEachRight(page.revisions, function(revision) {
      if (!_.isString(revision)) {
        vm.revisions.push(revision);
      }
    });
    vm.revisions.push(databaseRevision) ;
    vm.selectedRevision = vm.revisions[0];
  });

  vm.json2xml = TCService.json2xml;

  if (pageId) {
    vm.page = page = TCService.get(pageId, Doc);

    if (!page.revisions || _.isString(_.last(page.revisions))) {
      page.$get({
        fields: JSON.stringify('revisions'),
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
      vm.links = data;
      vm.prevLink = _.last(data.prev);
      vm.nextLink = _.last(data.next);
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
      databaseRevision.text = TCService.json2xml(teiRoot);
    });
    /*
    Doc.getLinks({id: page._id}, function(data) {
      console.log(data);
    });
    */
  }

  vm.save = function() {
    page = vm.page;
    Doc.patch({id: page._id}, {
      revision: vm.selectedRevision.text
    }, function() {
      page.$get({
        fields: JSON.stringify('revisions'),
      });
    });
  };

  vm.commit = function() {
    var links = vm.links;
    TCService.commit({
      doc: vm.page,
      text: vm.selectedRevision.text,
      docElement: pb,
      links: {
        prev: links.prev.slice(0, _.findIndex(links.prev, vm.prevLink) + 1),
        next: links.next.slice(0, _.findIndex(links.next, vm.nextLink) + 1),
      },
    }, {
      fields: JSON.stringify({path: 'revisions'}),
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
ViewerCtrl.$inject = ['$routeParams', 'TCService'];
