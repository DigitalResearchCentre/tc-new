var _ = require('lodash')
  , $ = require('jquery')
  , bson = require('bson')
  , ObjectID = bson.ObjectID
;
require('../utils/mixin');

function createObjTree(node, queue) {
  var obj = {
    name: node.nodeName,
    children: [],
  };
  switch (node.nodeType) {
    case node.ELEMENT_NODE:
      var attrs = {};
      _.each(node.attributes, function(attr) {
        attrs[attr.name] = attr.value;
      });
      if (attrs) {
        obj.attrs = attrs;
      }
      _.each(node.childNodes, function(childNode) {
        queue.push({parent: obj, child: childNode});
      });
      break;
    case node.TEXT_NODE:
      obj.text = node.nodeValue;
      break;
    case node.COMMENT_NODE:
      obj.text = node.nodeValue;
      break;
    case node.DOCUMENT_TYPE_NODE:
      obj = '';
      break;
    //case node.DOCUMENT_NODE:
    //case node.PROCESSING_INSTRUCTION_NODE:
    //case node.DOCUMENT_FRAGMENT_NODE:
    default:
      break;
  }
  return obj;
}

function loadObjTree(xmlDoc, parentEl, obj, queue) {
  if (obj.name === '#text') {
    childEl = xmlDoc.createTextNode(obj.text);
  } else if (obj.name === '#comment') {
    childEl = xmlDoc.createComment(obj.text || '');
  } else {
    childEl = xmlDoc.createElement(obj.name);
    _.each(obj.attrs, function(v, k) {
      childEl.setAttribute(k, v);
    });
    _.each(obj.children, function(child) {
      if (!_.isString(child)) {
        queue.push({parent: childEl, child: child});
      }
    });
  }
  parentEl.appendChild(childEl);
}

function parseXML(text) {
  var parser, xmlDoc;
  if (window.DOMParser) {
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(text, 'text/xml');
  } else {
    xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
    xmlDoc.async = false;
    xmlDoc.loadXML(text);
  }
  return xmlDoc;
}

function xmlDoc2json(xmlDoc) {
  var queue = []
    , obj = createObjTree(xmlDoc.childNodes[0], queue)
  ;
  while (queue.length > 0) {
    var item = queue.shift()
      , parent = item.parent
      , child = createObjTree(item.child, queue)
    ;
    if (_.isNumber(item.child.textIndex)) {
      child.textIndex = item.child.textIndex;
    }
    parent.children.push(child);
  }
  return obj;
}

function xml2json(xml) {
  var xmlDoc = parseXML(xml);
  return xmlDoc2json(xmlDoc);
}

function json2xml(obj) {
  return new XMLSerializer().serializeToString(json2xmlDoc(obj));
}

function json2xmlDoc(obj) {
  var xmlDoc = document.implementation.createDocument('', '', null)
    , queue = []
  ;
  loadObjTree(xmlDoc, xmlDoc, obj, queue);
  while (queue.length > 0) {
    var item = queue.shift()
      , parentEl = item.parent
      , child = item.child
    ;
    loadObjTree(xmlDoc, parentEl, child, queue);
  }
  return xmlDoc;
}

function iterate(iter, cb) {
  var result = iter.iterateNext();
  while (result) {
    cb(result);
    result = iter.iterateNext();
  }
}

function teiElementEqual(el1, el2) {
  return el1.name === el2.name && 
    (el1.attrs || {}).n === (el2.attrs || {}).n;
}

function checkLinks(teiRoot, links, callback) {
  var cur = {
    children: [teiRoot],
  };
  missingLink = _.find(links.prev, function (link) {
    var child = _.find(cur.children, function(child) {
      return child.name !== '#text';
    });
    if (teiElementEqual(child, link)) {
      cur = child;
      cur.prev = link._id;
    } else {
      return link;
    }
  });
  if (missingLink) {
    return callback({
      message: 'Prev TEI elements missing',
      element: missingLink,
    });
  }
  cur = {
    children: [teiRoot],
  };
  missingLink = _.find(links.next, function (link) {
    var child = _.findLast(cur.children, function(child) {
      return child.name !== '#text';
    });
    if (teiElementEqual(child, link)) {
      cur = child;
      cur.next = link._id;
    } else {
      return link;
    }
  });
  if (missingLink) {
    return callback({
      message: 'Next TEI elements missing',
      element: missingLink,
    });
  }
}

function commit(data, opts, callback) {
  console.log(data);
  var text = data.text
    , docResource = data.doc
    , links = data.links || {}
    , xmlDoc = parseXML(text)
    , teiRoot = xmlDoc2json(xmlDoc)
    , docTags = ['pb', 'cb', 'lb']
    , entityRoot = {children: []}
    , docRoot = {_id: docResource._id, label: docResource.label, children: []}
    , queue = [teiRoot]
    , prevDoc = docRoot
    , docQueue = []
    , cur, curDoc, index, label, missingLink
  ;

  xmlDoc.entity = entityRoot;

  _.each([
    '//body/div[@n]',
    '//body/div[@n]/head[@n]',
    '//body/div[@n]/ab[@n]',
    '//body/div[@n]/l[@n]',
  ], function(xpath) {
    var iter = xmlDoc.evaluate(xpath, xmlDoc)
      , cur = iter.iterateNext()
      , parent
      , entity
    ;
    while(cur) {
      entity = {
        name: cur.getAttribute('n') || '',
        children: [],
      };
      cur.entity = entity;
      parent = cur.parentNode;
      while (parent) {
        if (parent.entity) {
          parent.entity.children.push(entity);
          break;
        }
        parent = parent.parentNode;
      }
      cur = iter.iterateNext();
    }
  });

  checkLinks(teiRoot, links, callback);

  // dfs on TEI tree, find out all document
  while (queue.length > 0) {
    cur = queue.pop();
    if (!_.startsWith(cur.name, '#')) {
      index = docTags.indexOf(cur.name);
      // if node is doc
      if (index > -1) {
        curDoc = {
          _id: ObjectID().toJSON(),
          label: cur.name,
          children: [],
        };
        if ((cur.attrs || {}).n) {
          curDoc.name = (cur.attrs || {}).n;
        }
        if (docTags.indexOf(prevDoc.label) < index) {
          docQueue.push(prevDoc);
        }
        while (docQueue.length > 0) {
          label = _.last(docQueue).label;
          if (!label || docTags.indexOf(label) < index) {
            break;
          }
          docQueue.pop();
        }
        if (docQueue.length > 0) {
          _.last(docQueue).children.push(curDoc);
        }
        prevDoc = curDoc;
      }
      if ((cur.children || []).length === 0) {
        cur.text = '';
        cur.doc = prevDoc._id;
      }

      if (cur.entity) {
        cur.entity = true;
      }
    } else if (cur.name === '#text') {
      cur.doc = prevDoc._id;
    }

    _.forEachRight(cur.children, _.bind(queue.push, queue));
  }

  docResource.commit = {
    tei: teiRoot,
    doc: docRoot,
    entity: entityRoot,
  };
  return docResource.$update(_.assign({}, opts), function() {
    if (callback) callback(null);
  });
}

function TCService($resource) {
  MODEL_CACHE = {};

  var Community = $resource('/api/communities/:id', {
    id: '@_id',
  }, {
    'get': {
      transformResponse: function(data) {
        var community = angular.fromJson(data);
        _.each(community.documents, function(doc, i) {
          community.documents[i] = TC.get(doc, Doc);
        });
        return community;
      },
    },
    'update': {
      method: 'PUT',
    },
    'save':   {
      method:'POST',
      transformResponse: function(data) {
        var community = angular.fromJson(data);
        // auto sync
        app.communities.push(community);
        app.authUser.$get();
        return community;
      },
    },
  });

  var Doc = $resource('/api/docs/:id', {
    id: '@_id',
  }, {
    'patch': {method: 'PATCH'},
    'update': {method: 'PUT'},
    'getTrees': {
      url: '/api/docs/:id/texts',
      method: 'GET',
    },
    'getLinks': {
      url: '/api/docs/:id/links',
      method: 'GET',
    },

  });

  var Login = $resource('/auth/login/', null, {
    'login': {method: 'POST'},
  });

  var AuthUser = $resource('/api/auth/', {
    fields: JSON.stringify('memberships.community'),
  });

  var app = {
    authUser: AuthUser.get(),
    communities: Community.query(),
  };


  var TC = {
    app: app,
    login: function(email, password) {
      Login.login({email: email, password: password}, function(user) {
        app.authUser = AuthUser.get();
        app.isLoggedIn=true;
      });
    },
    logout: function() {
      $resource('/auth/logout/').get();
      app.authUser = {};
      app.isLoggedIn=false;
      $.get('/index.html#/home');
    },
    get: function(id, Model) {
      var cache, obj;
      if (_.isObject(id)) {
        obj = id;
        id = obj._id;
      } else {
        obj = {_id: id};
      }
      cache = MODEL_CACHE[id];
      if (!cache) {
        cache = MODEL_CACHE[id] = (Model ? new Model(obj) : obj);
      }
      return cache;
    },
    parseXML: parseXML,
    xml2json: xml2json,
    json2xml: json2xml,
    json2xmlDoc: json2xmlDoc,
    sendMail: function(mailOptions, cb) {
      $.post('/api/sendmail', mailOptions, cb);
    },
    commit: commit,
    Community: Community,
    Doc: Doc,
  };
  return TC;
}
TCService.$inject = ['$resource',];

module.exports = TCService;
