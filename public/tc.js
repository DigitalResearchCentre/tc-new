var _ = require('lodash')
  , $ = require('jquery')
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
      obj.children = [node.nodeValue.trim()];
      break;
    case node.COMMENT_NODE:
      obj.children = [node.nodeValue.trim()];
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
    childEl = xmlDoc.createTextNode(obj.children[0]);
  } else if (obj.name === '#comment') {
    childEl = xmlDoc.createComment(obj.children[0] || '');
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
  console.log(obj);
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


function foo() {
  var d1 = {
    name: '1r',
    children: [
      {
        name: '1',
        children: [
          {text: 'hello world'},
          {text: 'foo bar'},
          {text: 'see you'},
        ],
      },
      {name: '2'},
      {name: '3'},
    ]
  };
  var doc = {}
    , texts = doc.getTexts()
  ;

}

function commit(docResource, text, opts, callback) {
  var texts = []
    , xmlDoc = parseXML(text)
    , docTags = ['pb', 'cb', 'lb']
    , docRoot = {children: []}
    , workRoot = {children: []}
    , queue
    , teiRoot
    , prevDoc
  ;
  xmlDoc.work = workRoot;

  _.each([
    '//body/div[@n]',
    '//body/div[@n]/head[@n]',
    '//body/div[@n]/ab[@n]',
    '//body/div[@n]/l[@n]',
  ], function(xpath) {
    var iter = xmlDoc.evaluate(xpath, xmlDoc)
      , cur = iter.iterateNext()
      , parent
      , work
    ;
    while(cur) {
      work = {
        name: cur.getAttribute('n') || '',
        children: [],
      };
      cur.work = work;
      parent = cur.parentNode;
      while (parent) {
        if (parent.work) {
          parent.work.children.push(work);
          break;
        }
        parent = parent.parentNode;
      }
      cur = iter.iterateNext();
    }
  });

  var iter = xmlDoc.createNodeIterator(xmlDoc, NodeFilter.SHOW_ALL);
  var node = iter.nextNode();
  var label;
  queue = [docRoot];
  prevDoc = docRoot;
  prevDoc.children = [];
  while (node) {
    if (node.nodeType === node.ELEMENT_NODE) {
      var index = docTags.indexOf(node.nodeName);
      // if node is doc
      if (index > -1) {
        var curDoc = {
          label: node.nodeName,
          children: [],
        };
        if (node.getAttribute('n')) {
          curDoc.name = node.getAttribute('n');
        }
        if (!prevDoc) {
          docRoot.children.push(curDoc);
        } else {
          if (docTags.indexOf(prevDoc.label) < index) {
            queue.push(prevDoc);
          }
          while (queue.length > 0) {
            label = _.last(queue).label;
            if (!label || docTags.indexOf(label) < index) {
              break;
            }
            queue.pop();
          }
          if (queue.length > 0) {
            queue[queue.length - 1].children.push(curDoc);
          }
        }
        prevDoc = curDoc;
      }
    } else if (node.nodeType === node.TEXT_NODE) {
      var textIndex = texts.length
        , parentNode = node.parentElement
        , sibling
      ;
      if (prevDoc) {
        sibling = _.last(prevDoc.children);
        if (sibling && sibling.texts) {
          sibling.texts.push(textIndex);
        } else {
          prevDoc.children.push({
            texts: [textIndex],
            children: [],
          });
        }
      }

      while (parentNode) {
        if (parentNode.work) {
          parentNode.work.children.push({
            texts: [textIndex],
            children: [],
          });
          break;
        }
        parentNode = parentNode.parentElement;
      }

      texts.push(node.nodeValue.trim());
      node.textIndex = textIndex;
    }
    node = iter.nextNode();
  }

  docResource.commit = {
    xml: xmlDoc2json(xmlDoc),
    doc: docRoot,
    work: workRoot,
    texts: texts,
  };
  return docResource.$update(_.assign({}, opts), callback);
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
    }
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
