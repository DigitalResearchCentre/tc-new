var Observable = Rx.Observable
  , Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('../rest.service')
  , AuthService = require('../auth.service')
  , Doc = require('../models/doc')
;

function createObjTree(node, queue) {
  var obj = {
    name: node.nodeName,
    children: [],
  };
  if (node.entity) {
    obj.entity = node.entity;
  }
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
  window.xx = xmlDoc;
  var queue = []
    , text = xpath(xmlDoc, '//tei:text|//text').iterateNext()
    , obj = createObjTree(text, queue)
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

function checkLinks(teiRoot, links, docElement) {
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
    return {
      message: 'Prev TEI elements missing',
      element: missingLink,
    };
  }
  if (docElement) {
    delete docElement._id;
    cur.children.unshift(docElement);
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
    return {
      message: 'Next TEI elements missing',
      element: missingLink,
    };
  }
}

function xpath(xmlDoc, expr) {
  var nsResolver = xmlDoc.createNSResolver(
    xmlDoc.ownerDocument === null ?
      xmlDoc.documentElement :
      xmlDoc.ownerDocument.documentElement
  );

  function teiNSResolver(prefix) {
    var ns = nsResolver.lookupNamespaceURI(prefix)
      , nsMap = {
        'tei': 'http://www.tei-c.org/ns/1.0',
        'det': 'http://textualcommunities.usask.ca/'
      }
    ;
    return ns || nsMap[prefix] || nsMap.tei;
  }

  return xmlDoc.evaluate(expr, xmlDoc, teiNSResolver);
}

function parseTEI(text) {
  var xmlDoc = parseXML(text);
  _.each([
    '//tei:body/tei:div[@n]',
    '//tei:body/tei:div[@n]/tei:head[@n]',
    '//tei:body/tei:div[@n]/tei:ab[@n]',
    '//tei:body/tei:div[@n]/tei:l[@n]',
  ], function(expr) {
    var iter = xpath(xmlDoc, expr)
      , cur = iter.iterateNext()
    ;
    while(cur) {
      cur.entity = cur.getAttribute('n');
      cur = iter.iterateNext();
    }
  });
  return xmlDoc;
}

function commit(data, opts, callback) {
  var text = data.text
    , docResource = data.doc
    , docElement = data.docElement
    , links = data.links || {}
    , xmlDoc = parseTEI(text)
    , teiRoot = xmlDoc2json(xmlDoc)
    , docTags = ['pb', 'cb', 'lb']
    , docRoot = {_id: docResource._id, label: docResource.label, children: []}
    , queue = [teiRoot]
    , prevDoc = docRoot
    , docQueue = []
    , cur, curDoc, index, label, missingLink
  ;

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
    } else if (cur.name === '#text') {
      cur.doc = prevDoc._id;
    }

    _.forEachRight(cur.children, _.bind(queue.push, queue));
  }

  var err = checkLinks(teiRoot, links, docElement);
  if (err && callback) {
    return callback(err);
  }
  if (docElement) {
    docElement.doc = docRoot._id;
  }

  docResource.commit = {
    tei: teiRoot,
    doc: docRoot,
  };
  return docResource.$update(_.assign({}, opts), function() {
    if (callback) callback(null);
  });
}



var DocService = ng.core.Injectable().Class({
  extends: RESTService,
  constructor: [Http, AuthService, function(http, authService){
    var self = this;
    RESTService.call(this, http);

    this._authService = authService;
    this.resourceUrl = 'docs';

    this.initEventEmitters();
  }],
  modelClass: function() {
    return Doc;
  },
  initEventEmitters: function() {
    var self = this;
  },
  addPage: function(page) {
    return this.create(page);
  },
});

module.exports = DocService;

