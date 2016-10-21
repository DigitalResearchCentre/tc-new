var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Types.ObjectId
  , extendNodeSchema = require('./extend-node-schema')
  , libxml = require('libxmljs')
  , Error = require('../common/error')
  , TEI = require('./tei')
  , Entity = require('./entity')
  , Community = require('./community')


const CheckLinkError = Error.extend('CheckLinkError');

var DocSchema = extendNodeSchema('Doc', {
  name: String,
  label: String,
  header: String,
  community: String,
  entities: [],
  image: Schema.Types.ObjectId,
  meta: Schema.Types.Mixed,
}, {
  methods: {
    _commit: function(
      teiRoot, docRoot, leftBound, rightBound, callback
    ) {
      let self = this
        , docsMap = {}
        , updateTeis = []
        , insertTeis = []
        , deleteTeis = []
        , docs
        , docEl
        , insertEntities = []
        , topEntities = []
        , communityAbbr = docRoot.community
      ;
     if (self.ancestors.length === 0) {
        docEl = {name: 'text'};
      } else {
        docEl = {name: self.label, attrs: {n: self.name}};
      }
      if (_.isEmpty(teiRoot)) {
        let loop = true;

        return async.whilst(
          function() {
            return loop;
          },
          function(cb) {
            return TEI.collection.remove({
              docs: self._id,
              children: [],
            }, function(err, result) {
              loop = !err && result.result.ok === 1 && result.result.n > 0;
              cb(null);
            });
          },
          function(err) {
            let tei = new TEI({
              name: self.label,
              docs: self.ancestors.concat(self._id),
            });
            if (!_.isEmpty(leftBound)) {
              tei.attrs = {n: self.name};
              if (leftBound.length === 1) {
                TEI.insertFirst(_.last(leftBound), tei, callback);
              } else {
                TEI.insertAfter(_.last(leftBound), tei, callback);
              }
            } else {
              tei.save(callback);
            }
          }
        );
      }

      let boundsMap = _boundsMap(leftBound, rightBound);
      let errors = _linkBounds(docEl, leftBound, rightBound, teiRoot);

      // load docs
      docs = Doc._loadNodesFromTree(docRoot);
      _.each(docs, function(d) {
        docsMap[d._id.toString()] = d;
      });
      docRoot = docs.shift();

      _.dfs([teiRoot], function(el) {
        let cur = TEI.clean(el);
        if (!el.children) {
          el.children = [];
        }
        if (el.doc) {
          cur.docs = docsMap[el.doc].ancestors.concat(new ObjectId(el.doc));
        }
        cur.children = TEI._loadChildren(cur);
        if (el._bound) {
          let item = boundsMap[el._id.toString()];
          if (item.el) {
            errors.push(`continue element ${_el2str(el)} break on page`);
          } else {
            item.el = el;
            item.newChildren = cur.children;
          }
        } else {
          insertTeis.push(cur);
        }
        _.each(el.children, function(child, i) {
          child.prev = el.children[i-1];
          child.next = el.children[i+1];
        });
      });

      let results = _parseBound(boundsMap);
      errors = errors.concat(results.errors);
      deleteTeis = deleteTeis.concat(results.deleteTeis);
      updateTeis = results.updateTeis;
      if (errors.length > 0) {
        return callback(new CheckLinkError(errors.join('<br/>')));
      }
  //      self.entities=filterEntities(insertTeis, communityAbbr);
        //all the entities are now listed. Accumulate them in liveEntities list
  //      topEntities=filterLiveEntities(insertTeis, insertEntities);
      var uniqueEntities = {};
      //convert tei references to toplevel entities to entity ids from the database, write to entities
  //    console.log(insertTeis);
      filterEntities(insertTeis, communityAbbr, function(myentities, err) {
      //    self.entities=myentities;
          topEntities=filterLiveEntities(insertTeis, insertEntities);
    //      console.log(insertTeis);
          uniqueEntities = _.uniqBy(insertEntities, "entityName");
          console.log("addjusting teis")
          //at this point: we adjust ancestor TEIs by removing deleted teis from entitychildren AND writing altered ancestor
          //into ancestor tei
          //note TODO: this may NOT catch all that need to be caught. Will only catch the last men standing in the ancestor queue
          //could be different ancestors referenced in deleted page. May have to deal with those differently
          insertTeis=removeDNW(insertTeis);
          async.parallel([
            function(cb1) {
          //    console.log(self);
          //    console.log(topEntities);
              self.entities=topEntities;
  //            console.log(self);
              self.children = docRoot.children;
              self.save(function(err) {
                console.log('save done');
                cb1(err, self);
              });
            },
            function(cb1) {
              for (var i=0; i<docs.length; i++) {docs[i].community=communityAbbr};
              if (docs.length > 0) {
                  Doc.collection.insert(docs, function(err) {
                  console.log('docs done');
                  cb1(err);
                });
              } else {
                cb1(null, []);
              }
            },
            function(cb1) {
              console.log("delete these"); console.log(deleteTeis);
              //first, remove entity children from master TEIs
              if (deleteTeis.length > 0) {
                TEI.collection.remove({
                  $or: [
                    {ancestors: {$in: deleteTeis}},
                    {_id: {$in: deleteTeis}},
                  ]
                }, function(err) {
                  console.log('delete teis done');
                  cb1(err);
                });
              } else {
                cb1(null, []);
              }
            },
            function(cb1) {
              console.log("delete entity children");
              //first, remove entity children from ancestor TEIs
              if (deleteTeis.length > 0) {
                async.map(deleteTeis, findEntChildren, function (err, results) {
                  var uniqueEntities = _.uniqBy(results, "entityName");
                  console.log("got the results before removal "+uniqueEntities);
                  console.log("deleteTEIs"+deleteTeis);
                  for (var i=0; i<uniqueEntities.length; i++) {
                    if (uniqueEntities[i]) {
                      for (var j=0; j<deleteTeis.length; j++) {
                        var index = uniqueEntities[i].entityChildren.indexOf(deleteTeis[j]);
                        if (index>-1) {
                          uniqueEntities[i].entityChildren.splice(index, 1);
                        }
                      }
                    }
                  }
                  console.log("got the results after removal "+uniqueEntities);
                  async.forEachOf(uniqueEntities, function(up) {
                    if (up) {
                      const cb2 = _.last(arguments);
                      TEI.collection.update({_id: up._id}, {
                        $set: {entityChildren: up.entityChildren},
                      }, cb2);
                    }
                  }, function(err) {
                    console.log('update ent children done');
                    cb1(err);
                  });

                  //save all our entities now
                  cb1(err);
                });
              } else {
                cb1(null, []);
              }
            },
            function(cb1) {
              if (updateTeis.length > 0) {
                async.forEachOf(updateTeis, function(up) {
                  const cb2 = _.last(arguments);
                  TEI.collection.update({_id: up._id}, {
                    $set: {children: up.children},
                  }, cb2);
                }, function(err) {
                  console.log('update teis done');
                  cb1(err);
                });
              } else {
                cb1(null, []);
              }
            },
           function(cb1) {
              if (uniqueEntities.length > 0) {
                async.forEachOf(uniqueEntities, function(up) {
                  const cb2 = _.last(arguments);
                  /*    Entity.update({'entityName': up.entityName}, up, {upsert:true}, function(err){
                        cb2(err);
                      }); */
                    //this version is MJCH MUCH faster then using upsert
                    Entity.findOne({'entityName': up.entityName}, function(err, entity) {
                    if (!entity)  {
                      Entity.collection.insert(up, function(err){
                  //      cb3(err);
                      });
                    }
                    cb2(err);
                  });
                }, function(err) {
                  console.log('insert entities done');
                  cb1(err);
                  });
              } else {
                cb1(null, []);
              }
            },
            function(cb1) {
              if (topEntities.length) {
                async.forEachOf(topEntities, function(up) {
                  const cb2 = _.last(arguments);
                  Community.update({'abbr': communityAbbr}, {$addToSet: {"entities": {"entityName":up.entityName, "isTerminal": up.isTerminal, "name": up.name} } },
                    cb2);
                }, function(err) {
                  console.log('insert topentities done');
                  cb1(err);
                });
              } else cb1(null, []);
            },
            function(cb1) {
              console.log("about to do insert teis");
              //for some reason: we get an error when we are trying to insert only some teis
              console.log(insertTeis);
              async.forEachOf(insertTeis, function(insert) {
                const cb2 = _.last(arguments);
                TEI.collection.insert(insert, cb2);
              }, function(err) {
                    console.log(err);
                    console.log('insert teis done');
                    cb1(err);
                });
          /*          if (insertTeis.length > 0) {

                TEI.collection.insert(insertTeis, function(err) {
                  console.log(err);
                  console.log('insert teis done');
                  cb1(err);
               });
             } else cb1(null, []); */
            },
          ], callback);
       });
    },
    commit: function(data, callback) {
      var self = this
        , teiRoot = data.tei || {}
        , docRoot = _.defaults(data.doc, self.toObject())
        , communityAbbr = data.community
        , revision = data.revision
        ;
        async.waterfall([
        function(cb1) {
          Doc.getOutterTextBounds(self._id, cb1);
        },
        function(leftBound, rightBound) {
          const cb = _.last(arguments)
          if (!_.isEmpty(teiRoot)) {
            _.dfs([teiRoot], function(el) {
              el.children = _.filter(el.children, function(child) {
                return !(
                  child.name === '#text' &&
                  (child.text || '').trim() === ''
                );
              });
            });
          }
          self._commit(
            teiRoot, docRoot, leftBound, rightBound,
            function(err) {
              return cb(err, self);
            }
          );
        },
      ], callback);
    },
  },
  statics: {
    clean: function(data) {
      const nodeData = _.defaults(
        {}, _.pick(data, [
          '_id', 'name', 'label', 'image', 'children', 'ancestors'
        ]), {
          ancestors: [],
          children: [],
        }
      );
      this._assignId(nodeData);
      return nodeData;
    },
    getTexts: function(id, callback) {
      let results = [];
      async.waterfall([
        function(cb) {
          TEI.find({docs: id, children: []}, cb);
        },
        function(nodes) {
          const cb = _.last(arguments);
          results = nodes;
          TEI.getAncestorsFromLeaves(nodes, cb);
        },
        function(ancestors) {
          const cb = _.last(arguments);
          cb(null, ancestors.concat(results));
        },
      ], callback);
    },
    getTextsLeaves: function(id, callback) {
      async.waterfall([
        function(cb) {
          TEI.find({docs: id}, cb);
        },
        function(texts) {
          const cb = _.last(arguments);
          TEI.orderLeaves(texts, cb);
        }
      ], callback);
    },
    /*
    * example: <div1>
    *            <div2>
    *              <pb n="1"/><ab1><t1/></ab1>
    *              <pb n="2"/>
    *            <div2>
    *            <t2/>
    *            <pb n="3"/>
    *          </div1>
    *  should return [div1, div2 ab1, t1], [div1, pb]
    */
    getOutterTextBounds: function(id, callback) {
      const cls = this;
      async.parallel([
        function(cb) {
          cls.getLeftTextBound(id, cb);
        },
        function(cb) {
          cls.getRightTextBound(id, cb);
        },
      ], function(err, results) {
        callback(err, results[0], results[1]);
      });
    },
    getLeftTextBound: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls._getParentAndIndex(id, cb);
        },
        function(parent, index) {
          const cb = _.last(arguments);
          if (!parent) {
            cb(null, []);
          } else if (index === 0) {
            async.waterfall([
              function(cb1) {
                TEI.find({docs: parent.ancestors.concat(parent._id)}, cb1);
              },
              function(texts) {
                const cb1 = _.last(arguments);
                TEI.orderLeaves(texts, cb1);
              },
              function(orderedLeaves) {
                const cb1 = _.last(arguments);
                const node = _.last(orderedLeaves);
                if (node) {
                  TEI.getAncestors(node._id, function(err, ancestors) {
                    cb1(err, (ancestors || []).concat(node));
                  });
                } else {
                  cb1(null, []);
                }
              }
            ], cb);
          } else {
            cls.getLastTextPath(parent.children[index - 1], cb);
          }
        }
      ], callback);
    },
    getRightTextBound: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls.getNext(id, cb);
        },
        function(next) {
          const cb = _.last(arguments);
          if (!next) {
            return cb(null, []);
          }
          TEI.find({docs: next.ancestors.concat(next._id)}, cb);
        },
        function(texts) {
          const cb = _.last(arguments);
          if (_.isEmpty(texts)) {
            return cb('ok', []);
          }
          TEI.orderLeaves(texts, cb);
        },
        function(orderedLeaves) {
          const cb = _.last(arguments);
          if (_.isEmpty(orderedLeaves)) {
            return cb('ok', []);
          }
          let node = _.first(orderedLeaves);
          TEI.getAncestors(node._id, function(err, ancestors) {
            cb(err, ancestors.concat(node));
          });
        },
      ], function(err, bound) {
        if (err === 'ok') {
          err = null;
        }
        callback(err, bound);
      });
    },
    getFirstTextPath: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls.getFirstText(id, cb);
        },
        function(node) {
          const cb = _.last(arguments);
          if (node) {
            TEI.getAncestors(node._id, function(err, ancestors) {
              cb(err, (ancestors || []).concat(node));
            });
          } else {
            cb(null, []);
          }
        },
      ], callback);
    },
    getLastTextPath: function(id, callback) {
      const cls = this;
      async.waterfall([
        function(cb) {
          cls.getLastText(id, cb);
        },
        function(node) {
          const cb = _.last(arguments);
          if (node) {
            TEI.getAncestors(node._id, function(err, ancestors) {
              cb(err, (ancestors || []).concat(node));
            });
          } else {
            cb(null, []);
          }
        }
      ], callback);
    },
    getFirstText: function(id, callback) {
      const cls = this;
      cls.getTextsLeaves(id, function(err, texts) {
        callback(err, _.first(texts));
      });
    },
    getLastText: function(id, callback) {
      const cls = this;
      cls.getTextsLeaves(id, function(err, texts) {
        callback(err, _.last(texts));
      });
    },

    getEntityIds: function(docId, entityId, callback) {
      if (_.isString(docId)) {
        docId = new ObjectId(docId);
      }
      if (_.isString(entityId)) {
        entityId = new ObjectId(entityId);
      }
      async.waterfall([
        function(cb) {
          if (entityId) {
            Doc.Entity.findOne({_id: entityId}).exec(cb);
          } else {
            cb(null, null);
          }
        },
        function(entity, cb) {
          var key, query;
          if (entity) {
            key =  'entities.' + (entity.ancestors.length + 1);
            query = {
              $and: [{
                docs: docId,
                entities: entityId,
              }]
            };
          } else {
            key = 'entities.0';
            query = {
              docs: docId,
            };
          }
          TEI.db.db.command({
            distinct: 'teis',
            key: key,
            query: query,
          }, cb);
        }
      ], callback);
    },
    getEntities: function(docId, entityId, callback) {
      this.getEntityIds(docId, entityId, function(err, result) {
        if (err) {
          return callback(err);
        }
        if (result.ok !== 1) {
          return callback(result);
        }
        Doc.Entity.find({_id: {$in: result.values}}).exec(callback);
      });
    },
  }
});



function _isContinueEl(el1, el2) {
  const attrs1 = _.get(el1, 'attrs', {})
    , attrs2 = _.get(el2, 'attrs', {})
  ;
  return (el1.name === '*' || el2.name === '*' || el1.name === el2.name) &&
    attrs1.n === attrs2.n;
}


function _idEqual(id1, id2) {
  return ObjectId.isValid(id1) && ObjectId.isValid(id2) &&
    (new ObjectId(id1)).equals(id2);
}

function _el2str(el) {
  return `${el.name}`;
}

function _boundsMap(leftBound, rightBound) {
  const boundsMap = {};
  _.each(leftBound, function(bound, i) {
    let child = leftBound[i+1];
    let item = boundsMap[bound._id.toString()] = {
      bound: bound,
    };
    if (child) {
      let index = _.findIndex(bound.children, function(id) {
        return _idEqual(id, child._id);
      });
      item.prevChild = index;
    }
  });
  _.each(rightBound, function(bound, i) {
    let child = rightBound[i+1];
    let item = boundsMap[bound._id.toString()];
    if (!item) {
      item = boundsMap[bound._id.toString()] = {
        bound: bound,
      };
    }
    if (child) {
      let index = _.findIndex(bound.children, function(id) {
        return _idEqual(id, child._id);
      });
      item.nextChild = index;
    }
  });
  return boundsMap;
}

function _linkBounds(docEl, leftBound, rightBound, teiRoot) {
  let errors = [];
  _.dfs([teiRoot], function(el) {
    if (_isContinueEl(docEl, el)) {
      return false;
    } else {
      let bound = leftBound.shift();
      if (bound && _isContinueEl(bound, el)) {
        el._id = bound._id;
        el._bound = true;
      } else {
          if (el && bound)
          errors.push(`prev page element is not matched:
                    ${_el2str(el)} ${_el2str(bound)}`);
      }
    }
  });

  _.dfs([teiRoot], function(el) {
    if (rightBound.length > 1) {
      let bound = rightBound.shift();
      if (_isContinueEl(bound, el)) {
        el._id = bound._id;
        el._bound = true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }, function(el) {
    let children = [];
    _.forEachRight(el.children || [], function(childEl) {
      children.push(childEl);
    });
    return children;
  });

  return errors;
}

function _parseBound(boundsMap) {
  let errors = []
    , deleteTeis = []
    , updateTeis = []
  ;
  _.each(boundsMap, function(item) {
    let bound = item.bound
      , el = item.el
      , prevChild = item.prevChild
      , nextChild = item.nextChild
      , newChildren = item.newChildren || []
      , deleteChildren = bound.children
      , prevChildren = []
      , nextChildren = []
      , _children = []
    ;
    if (!el && _.isNumber(prevChild) && _.isNumber(nextChild)) {
      errors.push(`${_el2str(bound)} element missing`);
    }
    if (_.isNumber(prevChild)) {
      if (el && el.prev) {
        errors.push(
          `prev page element can not have prev sibling: ${_el2str(el)}`);
      }
      prevChildren = bound.children.slice(0, prevChild + 1);
      deleteChildren = deleteChildren.slice(prevChild + 1);
    }
    if (_.isNumber(nextChild)) {
      if (el && el.next) {
        errors.push(
          `next page element can not have next sibling: ${_el2str(el)}`);
      }
      nextChildren = bound.children.slice(nextChild);
      deleteChildren = deleteChildren.slice(
        0, deleteChildren.length - nextChildren.length);
    }
    if (!_.isNumber(prevChild) || prevChild !== nextChild) {
      if (_idEqual(_.first(newChildren), _.last(prevChildren))) {
        _children = prevChildren.concat(newChildren.slice(1));
      } else {
        _children = prevChildren.concat(newChildren);
      }
      if (_idEqual(_.last(_children), _.first(nextChildren))) {
        _children.pop();
      }
      _children = _children.concat(nextChildren);
      if (!_.isEqual(_children, bound.children)) {
        updateTeis.push({
          _id: bound._id,
          children: _children,
        });
      }
      deleteTeis = deleteTeis.concat(deleteChildren);
    }
  });
  return {
    errors: errors,
    updateTeis: updateTeis,
    deleteTeis: deleteTeis,
  };
}

function getTEIs (teiID, callback) {
  TEI.findOne({_id:teiID}, function (err, version) {
    callback(err, version);
  });
}

function findEntChildren (teiID, callback) {
  TEI.findOne({entityChildren: teiID}, function (err, version) {
  if (version) {
      console.log("found entchild "+version);
      console.log(teiID);
    }
    callback(err, version);
  });
}
function filterEntities(sourceTeis, community, callback) {
  var entities=[];
  //very slow doing lots of filter look ups -- ie doing a filter look up on each child. Let's do it another way..
  //go through all array, lookup from child to ancestor caching each child
  for (var i=0; i<sourceTeis.length; i++) {
    sourceTeis[i].isEntity=false;
    sourceTeis[i].community=community;  //help with housekeeping -- each tei gets allocated to a community
  }
  var curPath=[];
  /*either: we have a text element very early in the piece, or we are starting in media res*/
  /*if in media res: first element will have ancestors.  Extract and populate the path */
  var i=0;
  if (sourceTeis[i].ancestors.length) {
    //roll through teis till we hit an entity element...
    while (!isEntity(sourceTeis[i]) && (i<sourceTeis.length)) {i++};
    if (i==sourceTeis.length) { //no entities here at all
      callback(entities);
      return;
    }
  //  console.log("first element is")
  //  console.log(sourceTeis[i]);
    //use async routine to get ancestor details
    var currEntity={}, currAncestor={};
    async.map(sourceTeis[i].ancestors, getTEIs, function (err, results) {
      curPath.push({"tei_id": results[0]._id, "index":i,  "entName": "text" });
  //    //("before splice");
  //    console.log(sourceTeis[i]);
      results[0].doNotWrite=true;
      sourceTeis.splice(i,0,results[0]);
//      console.log("after splice");
//      console.log(sourceTeis[i]);
//      console.log(results);
      for (var j=1; j<results.length; j++) {
//          console.log("processing the tei ancestors "+j)
//          console.log(results[j]);
          if (isEntity(results[j])) {
            curPath.push({"tei_id":results[j]._id, "index":i+curPath.length, "entName": results[j].name, "entity": nameEntity(results[j], community, curPath.length), "doNotWrite": true});
            results[j].doNotWrite=true;
            sourceTeis.splice(i+curPath.length-1,0,results[j]);
            if (curPath.length==2) {
                //0 is text, 1 must be the entity
//                console.log("making the entity")
                if (results[j].docs && results[j].docs[1]) var page=results[j].docs[1];
                else page=null;
                entities.push({"tei_id":results[j]._id, "name":results[j].attrs.n, "page":page, "entityChildren":[]});
                currEntity=entities[entities.length-1];
            }
        }
        if (j==results.length-1) {
            currAncestor=sourceTeis[curPath[curPath.length-1].index]
  //          console.log("currentAncestor")
  //          console.log(currAncestor);
  //          console.log(curPath);
            processEntities(sourceTeis, i+curPath.length, curPath, entities, community, currEntity, currAncestor).then(function(){
    //          console.log("finished processing")
              callback(entities);
              return;
            });
        }
      }
    }); //end in media res situation
  } else {
      //deals with load from file, or first saved page
//    console.log("in load from file");
    for (; !curPath.length; i++) {
      var childEl=sourceTeis[i];
      if (childEl.name=="text") {
        curPath.push({"tei_id":childEl._id, "index":i, "entName": "text" });
        childEl.isEntity= true;
        childEl.entityChildren=[];
        processEntities(sourceTeis, i, curPath, entities, community, null, null).then(function(){
          callback(entities);
          return;
        });
      }
    }
  }
}

function isEntity(thisTei) {
    if (thisTei.attrs && thisTei.attrs.n && thisTei.children.length && thisTei.name!="pb" && thisTei.name!="cb" && thisTei.name!="lb") return true;
    else return false;
}

//tnis one is now recursive and asynchronous
function processEntities (sourceTeis, i, curPath, entities, community, currEntity, currAncestor) {
  var deferred = Promise.defer();  //makes sure we don't return till we have done all the recursion
  console.log("current path ")
  for (var z; z<curPath.length; z++) {
    console.log(curPath[z])
  }
  for (; i<sourceTeis.length; i++) {
    var childEl=sourceTeis[i];
    if (isEntity(childEl)) {
          //first, get the current ancestor. Do this by cycling through tei ancestors comparing to current path
          //pop current path if we need to till it holds the ancestor of this element
          //note that by definition, the text element must be in this path
          //now, we have to handle the case where we have a div element OUTSIDE this page
          //which did open the page but now does not, so won't appear in insertTeis listed
          //nor will its id appear in the current path -- we have to go fetch it...
  //    console.log("first entity "); console.log(childEl);
  //    console.log("curPath "); console.log(curPath);
      var j=childEl.ancestors.length-1, found=false;
      for (var j=childEl.ancestors.length-1; j>=0 && !found; j--) {
          for (var k=curPath.length-1; k>=0 && !found; k--) {
          if (String(curPath[k].tei_id)==String(childEl.ancestors[j])) {
              found=true;
//              console.log("we have an entity in the currpath "); console.log();
              currAncestor=sourceTeis[curPath[k].index];
              if (k<curPath.length-1) { //remove in current path where match is up the tree
                curPath.splice(k+1, curPath.length-k)
              }
              //however.. this ancestor might NOT be the immediate ancestor. In which case, we fetch the ancestors below this one
              //ie: might be an ancestor below
              //we are here if we have not got a match for this element
              //however: if the currpath holds ONLY entName 'text', then this element is a top level entity
              //now, things become complicated. If we are dealing with one page only, ancestors might be outside the page
              //and outside the currPath. So we have to get them off the element itself and add them to the current path
              //we may need this one later... for now, just cut it out
              if (j>10000)
            /*  if (j<childEl.ancestors.length-1) */ {
//                console.log("need to get an ancestor here for "+j+ " ancestor length"+childEl.ancestors.length)
//                console.log("childEl: "); console.log(childEl);
//                console.log("curPath: "); console.log(curPath);
                var ancestorsArr=[];
                for (j+1; j<childEl.ancestors.length; j++) {ancestorsArr.push(childEl.ancestors[j])};
//                console.log("ancestorsArr: "+ancestorsArr);
                async.map(ancestorsArr, getTEIs, function (err, results) {
                  //add them to the current path; splice to insertTeis; adjust nAncestors; then call processEntities yet again
//                  console.log("got the tei now, n found "+results.length);
//                  console.log(results);
                  for (var x=0; x<results.length; x++) {
                    curPath.push({"tei_id":results[x]._id, "index":i+x, "entName": results[x].name, "entity": nameEntity(results[x], community, x), "doNotWrite":true});
                    results[x].doNotWrite=true;  //so we don't write this one out
                    sourceTeis.splice(i+x, 0, results[x]);
          //          console.log(sourceTeis);
                    //this might be the entity.. if we have matched right back to the ancestor
                    if (curPath.length==2) {
                      if (results[x].docs && results[x].docs[1]) var page=results[x].docs[1];
                      else var page=null;
                      entities.push({"tei_id":results[x]._id, "name":results[x].attrs.n, "page":page, "entityChildren":[]});
                      currEntity=entities[entities.length-1];
                    }
                    if (x==results.length-1) {
                      currAncestor=results[x];
      //                console.log("looking at result "+x)
      //                console.log(currAncestor);
                    }
                  }
    //              console.log(curPath);
                  //having got that one out of the way.. now recurse back to main loop
                  processEntities (sourceTeis, i, curPath, entities, community, currEntity, currAncestor).then(function(){
    //                console.log("processed all the ones in here now");
                    deferred.resolve();
                  });
                });
              } else {
                //no problem identifying id; so append, go on to next element
                //now we have the ancestor. Tack this entity onto it...
                //recall that ancestors are ALWAYS found before children.  So ancestor will ALWAYS be in the current path
                //not always.. in the tricky case where
                childEl.isEntity= true;
                childEl.entityChildren=[];
                if (curPath.length>1) childEl.entityAncestor=currAncestor.entityName;
                else childEl.entityAncestor="";
                curPath.push({"tei_id":childEl._id, "index":i, "entName": childEl.name, "entity": nameEntity(childEl, community, curPath.length)});
                childEl.entityName=createPath(curPath, childEl);
                //special case! if the entity ancestor is text, this is a top-level entity
                if (currAncestor.name=="text") {
                  if (childEl.docs && childEl.docs[1]) var page=childEl.docs[1];
                  else var page=null;
                  entities.push({"tei_id":childEl._id, "name":childEl.attrs.n, "page":page, "entityChildren":[]});
                  currEntity=entities[entities.length-1];
                }
                if (currAncestor.doNotWrite && curPath.length!=3) {
                    //ancestor TEI already written. Find, add to entitity children save, go on
                    TEI.findOne({_id: currAncestor._id}, function(err, teiel) {
                      if (teiel) {
                        teiel.entityChildren.push(childEl._id);
                        teiel.save(function(err) {
                            if (err) throw err;
                            processEntities (sourceTeis, i, curPath, entities, community, currEntity, currAncestor).then(function(){
                              deferred.resolve();
                            });
                        });
                      }
                    });
                }
                else if (currAncestor.doNotWrite) {
                  TEI.findOne({_id: currAncestor_id}, function(err, teiel) {
                    if (teiel) {
                      teiel.entityChildren.push(childEl._id);
                      teiel.save(function(err) {
                          if (err) throw err;
                          processEntities (sourceTeis, i, curPath, entities, community, currEntity, currAncestor).then(function(){
                            deferred.resolve();
                          });
                      });
                    }
                  });
                }
                else currAncestor.entityChildren.push(childEl._id);
                if (curPath.length==3) {
                  //ie, we must be dealing with children of the top level entities
                   if (currEntity.doNotWrite) {
                      TEI.findOne({_id: currEntity_id}, function(err, teiel) {
                        if (teiel) {
                          teiel.entityChildren.push(childEl._id);
                          teiel.save(function(err) {
                              if (err) throw err;
                              processEntities (sourceTeis, i, curPath, entities, community, currEntity, currAncestor).then(function(){
                                deferred.resolve();
                              });
                          });
                        }
                      });
                   } else currEntity.entityChildren.push(childEl._id);
                }
                deferred.resolve();}
          }
        }
      }
    }
  }
//  console.log(entities)\
  return deferred.promise;
}


//where we write the name of the entity

function nameEntity(childEl, community, level) {
  var elName="";
  if (level==1) elName=community+":entity";
  else if (childEl.name=="l") elName="line";
  else if (childEl.name=="p") elName="para";
  else if (childEl.name=="ab") elName="block";
  else if (childEl.attrs.type) elName=childEl.attrs.type;
  else elName=childEl.name;
  return elName+"="+childEl.attrs.n;
}
function createPath(curPath, childEl) {
  var path="";
  for (var i=1; i<curPath.length; i++) {
    if (i>1) path=path+":";
    path=path+curPath[i].entity;
  }
  return path;
}


function filterLiveEntities(insertTeis, liveEntities) {
  //give us a list of all entities to be added
  //check if the entity exists
  //check too if not already written to live entities
  var topEntities=[];
  for (var i=0; i<insertTeis.length; i++) {
    if (insertTeis[i].name=="text") continue;
    if (insertTeis[i].isEntity) {
        var isTerminal=false;
        if (!insertTeis[i].entityChildren.length) isTerminal=true;
        if (!insertTeis[i].entityAncestor) topEntities.push({"entityName":insertTeis[i].entityName,"isTerminal": isTerminal, "name": insertTeis[i].attrs.n, "tei_id": insertTeis[i]._id, "entityChildren":insertTeis[i].entityChildren});
        liveEntities.push({"entityName":insertTeis[i].entityName ,"ancestorName": insertTeis[i].entityAncestor, "isTerminal": isTerminal, "name": insertTeis[i].attrs.n })
      }
  }
  //return list of top level entities in this community''
  return topEntities;
}

function removeDNW(arr) {
  for (var i=0; i<arr.length; i++) {
    console.log("element "+i)
    console.log(arr[i]);
    if (arr[i].doNotWrite) {
      console.log("got one to remove")
      //check no teis to delete are in the entity children; if they are, remove them
  /*    for (var j=0; j<deleteTeis.length; j++) {

  } */
      //then: replace entity children array in this element in the dbase
      arr.splice(i, 1);
      i--;
    }
  }
  return (arr);
}



const Doc = mongoose.model('Doc', DocSchema);
module.exports = Doc;
