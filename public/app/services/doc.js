var Observable = Rx.Observable
  , Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('./rest')
  , UIService = require('./ui')
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
  var childEl;
  if (!obj) {
    return
  } 
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

/*
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
*/

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
  constructor: [
    Http, UIService,
    function(http, uiService){
    var self = this;
    RESTService.call(this, http);

    this._uiService = uiService;
    this.resourceUrl = 'docs';

    uiService.docService$.subscribe(function(event) {
      switch (event.type) {
        case 'refreshDocument':
          self.refreshDocument(event.payload).subscribe();
          break;
      }
    });
  }],
  modelClass: function() {
    return Doc;
  },
  refreshDocument: function(doc) {
    return this.fetch(doc.getId(), {
      populate: JSON.stringify('children'),
    });   
  },
  selectDocument: function(doc) {
    var uiService = this._uiService
      , self = this
    ;
    if (doc && uiService.state.document !== doc) {
      self.refreshDocument(doc).subscribe(function(doc) {
        self.selectPage(_.get(doc, 'attrs.children.0', null));
      });
    }
    uiService.setState('document', doc);
  },
  selectPage: function(page) {
    var uiService = this._uiService
      , self = this
    ;
    if (page && uiService.state.page !== page) {
      this.getTextTree(page).subscribe(function(teiRoot) {
        uiService.setState('tei', self.json2xml(teiRoot))
      });
    }
    uiService.setState('page', page);
  },
  getTextTree: function(doc) {
    var url = this.url({
      id: doc.getId(),
      func: 'texts',
    });
    return this.http.get(url, this.prepareOptions({}))
      .map(function(res) {
        if (!res._body) {
          return {};
        }
        var nodes = res.json()
          , nodesMap = {}
          , root
        ;
        _.each(nodes, function(node) {
          nodesMap[node._id] = node;
          node._children = _.map(node.children, function(childId) {
            return childId;
          });
        });
        _.each(nodesMap, function(node) {
          if (_.isEmpty(node.ancestors)) {
            root = node;
          } else {
            children = nodesMap[_.last(node.ancestors)].children;
            var index = children.indexOf(node._id);
            if (index > -1) {
              children.splice(index, 1, node);
            }
          }
        });
        _.each(nodesMap, function(node) {
          node.children = _.filter(node.children, function(child) {
            return !!child._id;
          });
        });
        return root;
      })
    ;
  },
  getRevisions: function(doc) {
    var url = this.url({
      id: doc.getId(),
      func: 'revisions',
    });
    return this.http.get(url, this.prepareOptions({}))
      .map(function(res) {
        if (!res._body) {
          return {};
        }
        return res.json();
      })
    ;
  },
  json2xml: json2xml,
  commit: function(data, opts, callback) {
    var self = this
      , docRoot = _.defaults(data.doc, {children: []})
      , text = data.text
      , teiRoot = {}
    ;
    console.log(data.doc);
    console.log(docRoot);
    if (text) {
      var xmlDoc = parseTEI(text || '')
        , docTags = ['pb', 'cb', 'lb']
        , docQueue = []
        , cur, prevDoc, curDoc, index, label
      ;
      teiRoot = xmlDoc2json(xmlDoc);
      if (docRoot.label === 'text') {
        prevDoc = docRoot;
      }
      _.dfs([teiRoot], function(cur) {
        if (!_.startsWith(cur.name, '#')) {
          index = docTags.indexOf(cur.name);
          // if node is doc 
          if (index > -1 || (prevDoc && cur.name === prevDoc.label)) {
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
      });
    }

    console.log(docRoot._id);
    if (docRoot._id) {
      return this.update(docRoot._id, {
        tei: teiRoot,
        doc: docRoot,
      }).map(function(doc) {
        self.selectDocument(doc);
      });
    } else {
      return this.create(_.assign(opts, {
        tei: teiRoot,
        doc: docRoot,
      })).map(function(doc) {
        self._uiService.createDocument(doc);
      });
    }
  }
});


module.exports = DocService;
