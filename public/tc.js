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
      queue.push({parent: childEl, child: child});
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
    parent.children.push(child);
    child.parent = parent;
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

function commit2(text) {
  var xmlDoc = parseXML(text)
    , docTags = ['lb']
    , workTags = ['div', 'l']
    , iter
  ;

  //lb[count(preceding::
  _.each(docTags, function(tag) {
    iter = xmlDoc.evaluate()
  });

  text = {};
  doc = {};
  work = {};
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
    , texts = doc.getTexts();
  ;
  
}

function commit(page, text) {
  var textObj = xml2json(text)
    , texts = []
    , docTags = ['pb', 'cb', 'lb']
    , queue = []
    , docRoot = {children: []}
    , prevDoc, iter, node
  ;
 
  _.dfs(textObj, function(node, i) {
    var index = docTags.indexOf(node.name);
    if (index > -1) {
      var curDoc = {
        children: [],
      };
      if (!prevDoc) {
        docRoot.children.push(curDoc);
      } else {
        if (docTags.indexOf(prevDoc.label) < index) {
          queue.push(prevDoc);
        }
        while (queue.length > 0 && 
              docTags.indexOf(queue[queue.length-1].label) >= index) {
          queue.pop();
        }
        if (queue.length > 0) {
          queue[queue.length - 1].children.push(curDoc)
        }
        prevDoc = curDoc;
      }
    }


    if (node.name === '#text') {
      var textIndex = texts.length
        , sibling
      ;
      if (prevDoc) {
        sibling = _.last(prevDoc.children);
        if (sibling.texts) {
          sibling.texts.push(textIndex);
        } else {
          prevDoc.children.push({
            texts: [textIndex],
          });
        }
      }
      texts.push(node.children[0]);
      node.parent.children[i] = {texts: [textIndex]};
    } else {
    }
   
  });
  
  /*
  window.xmlDoc = xmlDoc;

  _.each([
    '//body/div[@n]',
    '//body/div[@n]/head[@n]',
    '//body/div[@n]/ab[@n]',
  ], function(xpath) {
    var iter = xmlDoc.evaluate(xpath, xmlDoc)
      , cur = iter.iterateNext()
    ;
    while (cur) {
      cur.setAttribute('det:entity', 'work');
      cur = iter.iterateNext();
    }
  });

  _.each([
    '//pb',
    '//cb',
    '//lb',
  ], function(xpath) {
    var iter = xmlDoc.evaluate(
        xpath, xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
      , cur = iter.iterateNext()
    ;
    while (cur) {
      cur.setAttribute('det:type', 'doc');
      cur = iter.iterateNext();
    }
  });
  
  iter = xmlDoc.createNodeIterator(xmlDoc, NodeFilter.SHOW_ALL);
  node = iter.iterateNext();
  while (node) {
    
    node.parentNode == prev.parentNode;

    if (node.nodeType === node.ELEMENT_NODE) {
      if (node.getAttribute('det:type') === 'doc') {
        node.nodeName
        docChild = {
          children: []
        };
        if (node.getAttribute('n')) {
          docChild.name = node.getAttribute('n');
        }
        docParent.children.push(docChild);
      } else (node.getAttribute('det:type') === 'work'){
        if (prev === null) {
          workParent = workRoot;
        }
      }

    } else if (node.nodeType === node.TEXT_NODE) {

    }
    prev = node;
    node = iter.iterateNext()
  }


  if (page) {
    while (true) {
      xpath = '//text()[count(preceding::lb)=' + i + ']';
      var iter = xmlDoc.evaluate(
          xpath, xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      var lb = iter.iterateNext();
      if (lb) {
        var doc = page.children[i-1];
        if (!doc) {
          doc = {
            children: [],
          };
          page.children.push(doc);
        }
        doc.name = i - 1;
        while (lb) {
          if (lb.nodeValue.trim()) {
            lb.doc = doc;
            doc.children.push(lb.nodeValue.trim());
          }
          lb = iter.iterateNext();
        }
        i += 1;
      } else {
        break;
      }
    }
  }
  var work = {
    children: [],
  };
  var parent = work;
  xpath = '//div';
  iter = xmlDoc.evaluate(
      xpath, xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
  var cur = iter.iterateNext();
      window.cur = cur;
      window.xx = xmlDoc;


  while(cur) {
    var child = {
      children: [],
    };
    child.name = cur.getAttribute('n');
    parent.children.push(child);

    ii = xmlDoc.evaluate(
      './/l', cur, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    c = ii.iterateNext();
    while (c) {
      var cc = {
        children: [],
      };
      cc.name = c.getAttribute('n');
      child.children.push(cc);
      iii = xmlDoc.evaluate(
        './/text()', c, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      t = iii.iterateNext();
      while (t) {
        if (t.nodeValue.trim()) {
          cc.children.push(t.nodeValue);
        }
        t = iii.iterateNext();
      }

      c = ii.iterateNext();
    }

    cur = iter.iterateNext();
  }
  console.log(page);
  console.log(work);
  */
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

  var Doc = $resource('/docs/:id', {
    id: '@_id',
  }, {
    'patch': {method: 'PATCH'},
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
      });
    },
    logout: function() {
      $resource('/logout/').get();
      app.authUser = {};
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
    commit: commit,
    Community: Community,
    Doc: Doc,
  };
  return TC;
}
TCService.$inject = ['$resource',];

module.exports = TCService;
