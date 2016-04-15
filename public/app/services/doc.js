var Observable = Rx.Observable
  , Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('./rest')
  , AuthService = require('./auth')
  , Doc = require('../models/doc')
  , bson = require('bson')()
  , ObjectID = bson.ObjectID
;

function handleError(err, callback) {
  if (_.isFunction(callback)) {
    callback(err);
  }
  return Observable.throw(err);
}


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
  let childEl;
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

function checkLinks(teiRoot, links) {
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
    var self = this
      , pageId = new ObjectID()
      , obs = Observable.empty()
      , docId
    ;
    page._id = pageId;
    if (page.parent) {
      docId = page.parent.getId();
      if (_.isEmpty(page.parent.attrs.children)) {
        page.parent = docId;
        obs = this.update(docId, {
          commit: {
            tei: {
              name: 'text',
              doc: docId,
              children: [{
                name: 'body',
                doc: docId,
                children: [{
                  name: 'pb',
                  doc: pageId,
                  children: [],
                }]
              }]
            },
            doc: {
              children: [
                page,
              ]
            }
          }
        });
      } else {
        page.parent = docId;
        obs = this.create(page);
      }
    } else if (page.after) {
      page.after = page.after.getId();
      obs = this.create(page);
    }
    return obs.map(function(page) {
      return page;
    });
  },
  getTrees: function(doc) {
    var url = this.url({
      id: doc.getId(),
      func: 'texts',
    });

    return this.http.get(url, this.prepareOptions({}))
      .map(function(res) {
        if (!res._body) {
          return {};
        }
        return res.json();
      });
  },
  getLinks: function(page) {
    return this.http.get(
      this.url({id: page.getId(), func: 'links'}),
      this.prepareOptions({})
    ).map(function(res) {
      return res.json();
    });
  },
  json2xml: json2xml,
  commit: function(data, opts, callback) {
     var text = data.text
      , docModel = data.doc
      , docElement = data.docElement
      , links = data.links || {}
      , xmlDoc = parseTEI(text)
      , teiRoot = xmlDoc2json(xmlDoc)
      , docTags = ['text', 'pb', 'cb', 'lb']
      , docRoot = {
        _id: docModel.getId(), label: docModel.attrs.label, children: []
      }
      , queue = [teiRoot]
      , docQueue = []
      , cur, prevDoc, curDoc, index, label, missingLink
    ;
    var err = checkLinks(teiRoot, links);
    if (err) {
      return handleError(err, callback);
    }

    // dfs on TEI tree, find out all document
    /*
    _.dfs([teiRoot], function(node) {

    });
    */
    while (queue.length > 0) {
      cur = queue.shift();
      console.log(cur);
      if (!_.startsWith(cur.name, '#')) {
        index = docTags.indexOf(cur.name);
        // if node is doc 
        if (index > -1) {
          if (cur.name === docRoot.label) {
            if (!prevDoc) {
              curDoc = docRoot;
              docQueue.push(curDoc);
            } else {
              return handleError({
                message: 'duplicate ' + cur.name  + ' element',
                element: cur,
              }, callback);
            }
          } else if (prevDoc){
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
          }
          prevDoc = curDoc;
        }
        cur.text = '';
      }
      if (prevDoc) {
        cur.doc = prevDoc._id;
      }


      _.forEachRight(cur.children, function(child) {
    //    console.log(child);
        queue.unshift(child);
      });
    }

    return this.update(docModel.getId(), {
      commit: {
        tei: teiRoot,
        doc: docRoot,
      }
    });
  }
});

function _hidePb(teiRoot) {
  var firstText = teiRoot
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
  return teiRoot;
}
module.exports = DocService;
