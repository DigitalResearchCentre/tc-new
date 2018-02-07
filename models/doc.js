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
  , Revision = require('./revision')
  , Community = require('./community')
  , $ = require('jquery')


const CheckLinkError = Error.extend('CheckLinkError');
var globalDoc;
var globalCommAbbr;
var origUpdateTeis;




var DocSchema = extendNodeSchema('Doc', {
  name: String,
  label: String,
  facs: String,
  header: String,
  community: String,
  entities: [],
  tasks:[],
  image: Schema.Types.ObjectId,
  meta: Schema.Types.Mixed,
  teiHeader: String,
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
        , deleteTeiEntities = []
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
//      console.log("we are putting a doc in here");
//      console.log(communityAbbr);
//      console.log(docEl)
      globalDoc=docRoot;
      globalCommAbbr=communityAbbr;
//      console.log("teiroot")
//      console.log(teiRoot);
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
              community: communityAbbr
            });
            if (!_.isEmpty(leftBound)) { //Xiaohan did not spot this one. Aren't I clever!
              if (self.facs) {
                tei.attrs={n: self.name, facs: self.facs};
              }
              else tei.attrs = {n: self.name};
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
//        console.log("teichildren: "+cur.children);
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
      origUpdateTeis=updateTeis;
      if (errors.length > 0) {
        return callback(new CheckLinkError(errors.join('<br/>')));
      }
      var uniqueEntities = [];
      var deleteEntitiesList=[];
      var updateTeiEls=[];
        //convert tei references to toplevel entities to entity ids from the database, write to entities
      var elInfo = {"currAncestor": {}, "curPath": [] };
      var fromVFile=false;
      //this one to pick up bug in routine for identifying teis-- when doc has only one page
      //deleteTeis is always blank, but everything has to go!
//      console.log("our teis")
//      console.log(insertTeis)
      if (_.isEmpty(deleteTeis) && String(docRoot.label)=="pb") {
        fromVFile=true;
        }
        async.waterfall([
        function (cb1) {
          filterEntities(docRoot, insertTeis, updateTeis, communityAbbr, elInfo, function(updateTeiElements, err) {
            topEntities=filterLiveEntities(insertTeis, insertEntities, communityAbbr);
            uniqueEntities = _.uniqBy(insertEntities, "entityName");
            updateTeiEls=updateTeiElements;
            cb1(err, updateTeiEls);
          });
        },
      function adjustDeleteTeis (argument, cb1) {
          if (fromVFile) {  //fix for mistake where single page deletion is blank
           TEI.findOne({docs: {$in: [docRoot._id]}}, function (err, deleteRoot) {
             if (!deleteRoot) {
                cb1(null, []);
             } else {
               deleteTeis.push(deleteRoot.ancestors[0]);
               cb1(null, []);
             }
           });
         } else  {cb1(null, [])}
       },
       function identifyTEIDeleteChildren (argument, cb1) {
           TEI.find({$or: [{ancestors: {$in: deleteTeis}}, {_id: {$in: deleteTeis}},]}, function (err, results) {
             deleteTeis=[];
             for (var i = 0; i < results.length; i++) {
               deleteTeis.push(results[i]._id);
             }
             for (var i=0; i<results.length; i++) {
               if (results[i].isEntity) {
                 var entityPath=[];
                 entityPath.push(results[i].entityName);
                 deleteTeiEntities.push({id:results[i]._id, entityName: results[i].entityName, ancestorName: results[i].entityAncestor, entityPath: entityPath, isEntity:results[i].isEntity});
               }
             }
             cb1(null, []);
           });
         },
         function removeChildEntitiesUpdates (TEIDeleteChildren, cb1) {
           //take out deleted children from updateTeis
           //go through entity children in teiUpdates and remove all in deletions
           for (var i=0; i<TEIDeleteChildren.length; i++) {
             for (var j=0; j<updateTeiEls.length; j++) {
               if (!_.isEmpty(updateTeiEls[j].entityChildren)) {
                 for (var k=0; k<updateTeiEls[j].entityChildren.length; k++) {
                   if (String(updateTeiEls[j].entityChildren[k])==String(TEIDeleteChildren[i].id)) {
                     updateTeiEls[j].entityChildren.splice(k--, 1);
                   }
                 }
               }
             }
           }
           cb1(null, TEIDeleteChildren);
         },
        function saveDocRoot (TEIDeleteChildren, cb1) {
          if (!insertTeis[0].ancestors.length || fromVFile) {
            if (fromVFile) {
              Doc.collection.update({_id: docRoot.ancestors[0]}, {
                $set: {entities:topEntities},
              }, cb1(null, self));
            } else {
              self.entities=topEntities;
              self.children = docRoot.children;
              self.save(function(err) {
                cb1(err, self);
              });
            }
          } else { //from doc
            if (insertTeis.length>1) {
              Doc.findOne({_id: insertTeis[1].docs[0]}, function(err, doc) {
                if (err) throw err;
                if (doc)  {
                  if (_.isEmpty(doc.entities)) {
                    doc.entities=topEntities;
                  } else {
                    for (var i=0; i<doc.entities.length; i++) {
                      for (var j=0; j<topEntities.length; j++) {
                        if (typeof(topEntities[j].alreadyHere) == "undefined") topEntities[j].alreadyHere=false;
                        if (doc.entities[i].entityName==topEntities[j].entityName) {
                          //top fella here .. check the children
                          //if existing child is to be deleted: take it out of here
                          //update tei_id is_terminal in doc
                          topEntities[j].alreadyHere=true;
                          doc.entities[i].tei_id=topEntities[j].tei_id;
                          doc.entities[i].isTerminal=topEntities[j].isTerminal;
                          for (var k=0; k<doc.entities[i].entityChildren.length; k++) {
                            for (var m=0; m<TEIDeleteChildren.length; m++) {
                              if (String(TEIDeleteChildren[m].id)==String(doc.entities[i].entityChildren[k])) {
                                doc.entities[i].entityChildren.splice(k, 1);
                                k--;
                              }
                            }
                          }
                          //deletion done. Let's add new children (to do: have to adjust order of children)
                          doc.entities[i].entityChildren.push(topEntities[j].entityChildren);
                        }
                      }
                    }
                    //top entity not in doc, just add it
                    for (var j=0; j<topEntities.length; j++) {
                      if (!topEntities[j].alreadyHere) doc.entities.push({entityName: topEntities[j].entityName, isTerminal: topEntities[j].isTerminal, name: topEntities[j].name, tei_id: topEntities[j].tei_id, entityChildren: topEntities[j].entityChildren});
                    }
                    //first -- if current top entity is among those to be deleted
                  }
                  //for some reason, straight doc.save does not work. This does.
                  Doc.collection.update({_id: doc._id}, {
                    $set: {entities: doc.entities},
                  }, cb1(null, self));
                } else {
                  cb1(null, self);
                }
              });
            } else (cb1(null, self));
          }
        },   //problem with Xiaohan's logic here: new docs are inserted but
            //old docs for this page are NOT deleted, nor are doc children for the pb updated. We do that here
            //if pb doc has children docs already: delete them, update links to new docs
        function checkOldPb (argument, cb1) {
          if (String(docRoot.label)=="pb") {
            Doc.findOne({_id: docRoot._id}, function(err, document){
              var docChildren=document.children;
              if (docChildren.length>0) {
                async.map(docChildren, deleteDocChildren, function (err, results) {
                  cb1(err,[]);
                })
              } else cb1(err, []);
            });
          } else cb1(null, []);
        },  //now, figure out which are the top level docs among those added are write them to the pb
        function updateDocChildren (argument, cb1) {
          if (String(docRoot.label)=="pb") {
            var topKids=[];
            for (var i = 0; i < docs.length; i++) {
              if (docs[i].ancestors[docs[i].ancestors.length-1]==docRoot._id) topKids.push(docs[i]._id);
            }
            Doc.collection.update({_id: docRoot._id}, {$set: {children: topKids}}, function (err){
              cb1(err, []);
            });
          } else cb1(null, []);
        },
        function(argument, cb1) {
          if (docs.length > 0) {
  //          console.log("all our docs"); console.log(docs);
            //add community to each one
            docs.forEach(function(eachDoc){eachDoc.community=globalCommAbbr})
            Doc.collection.insert(docs, function(err) {
              cb1(null, []);
            });
          } else {
            cb1(null, []);
          }
        },
        function deleteStuffFunct(argument, cb1) {
          //wierd things happening with synchronicity I think.. need to have things happen in order
          //first, remove entity children from master TEIs
          //set up waterfall to do the deletions
          if (deleteTeis.length) {
            async.waterfall([
              function getEntityNames (cbAsync) {
                 //create array of entities we are going to delete
                 //this information is already in deleteTeis. Just need to filter out the ones that are entities
                 for (var i = 0; i < deleteTeiEntities.length; i++) {
                   if (deleteTeiEntities[i].isEntity) {
                     for (var k=0; k<insertTeis.length; k++) {
                       if (insertTeis[k].entityName==deleteTeiEntities[i].entityName) {
                         deleteTeiEntities.splice([i--],1);
                         k=insertTeis.length;
                       }
                     }
                   } else {deleteTeiEntities.splice([i--],1)}
                 }
                 cbAsync(null, []);
              },
              function getDeleteEntityPaths (argument, cbAsync) {
                //create paths for every tei we are going to delete
                if (deleteTeiEntities.length>0) {
                  async.map(deleteTeiEntities, getEntityPaths, function (err, results){
                    deleteTeiEntities=results;
                    cbAsync(null, []);
                  });
                } else {
                  cbAsync(null, []);
                }
              },
              function deleteUpdateEntChildren (argument, cbAsync) {
                //check all the update elements and remove any entityChildren appearing in deleteTeis
                  if (updateTeiEls.length > 0) {
                    for (var i = 0; i < updateTeiEls.length; i++) {
                      if (updateTeiEls[i].isEntity) {
                        for (var j = 0; j < updateTeiEls[i].entityChildren.length; j++) {
                          for (var k = 0; k < deleteTeis.length; k++) {
                            if (String(updateTeiEls[i].entityChildren[j])==String(deleteTeis[k])) {
                              updateTeiEls[i].entityChildren.splice(j--, 1);
                              k=deleteTeis.length;
                            }
                          }
                        }
                      }
                    }
                    cbAsync(null, []);
                  } else {cbAsync(null, []);}
                },
                function(argument, cbAsync) {
                  if (deleteTeis.length > 0) {
                    TEI.collection.remove({
                      $or: [
                        {ancestors: {$in: deleteTeis}},
                        {_id: {$in: deleteTeis}},
                      ]
                    }, function(err) {
                      cbAsync(err, []);
                    });
                  } else {
                     cbAsync(null, []);
                  }
                },
              ], function (error, success) {
                  if (error) {
                      cb1(error, self);
                  }
                    cb1(null, self);
                });
            } else {cb1(null, self);}
          },
          function(argument, cb1) {
            if (updateTeiEls.length > 0) {
              async.forEachOf(updateTeiEls, function(up) {
                const cb2 = _.last(arguments);
                TEI.collection.update({_id: up._id}, {
                  $set: {children: up.children,  entityChildren: up.entityChildren},
                }, cb2);
              }, function(err) {
                cb1(err, self);
              });
            } else {
              cb1(null, self);
            }
          },
          function insertEntitiesFunct(argument, cb1) {
             var entityDict={};
             if (uniqueEntities.length > 300) {
               //get all the entities for this community
               Entity.find({'community': globalCommAbbr}, function (err, results) {
                 //match all entities found against uniqueEntities
                 for (var i=0; i<results.length; i++) {
                   entityDict[results[i].entityName]=1;
                 }
                 for (var i=0; i<uniqueEntities.length; i++) {
                   if (entityDict[uniqueEntities[i].entityName]==1)
                     uniqueEntities.splice(i--,1);
                 }
                 if (uniqueEntities.length) {
                   Entity.collection.insert(uniqueEntities, function(err){
                     cb1(null, self);
                     });
                   }  else cb1(null, self);
                 });
               } else if (uniqueEntities.length > 0) {
               //On smaller inserts -- creating a dictionary of values is overkill
                 async.forEachOf(uniqueEntities, function(up) {
                   const cb2 = _.last(arguments);
                     //this version is MJCH MUCH faster then using upsert
                     Entity.find({'entityName': up.entityName}, function(err, results) {
                     if (results.length==0)  {
                       Entity.collection.insert(up, function(err){
                       });
                     }
                     cb2(err);
                   });
                 }, function(err) {cb1(err, self);});
               } else {
                 cb1(null, self);
               }
           },
           function insertTopEntitiesFunc(argument, cb1) {
            //remove top entity if isTerminal is true
            for (var i=0; i<topEntities.length; i++) {
              if (topEntities[i].isTerminal) topEntities.splice(i, 1);
            }
            if (topEntities.length) {
              async.forEachOf(topEntities, function(up) {
                const cb2 = _.last(arguments);
                Community.update({'abbr': communityAbbr}, {$addToSet: {"entities": {"entityName":up.entityName, "isTerminal": up.isTerminal, "name": up.name} } },
                  cb2);
              }, function(err) {
                cb1(err, self);
              });
            } else cb1(null, self);
          },
          function(argument, cb1) {
            if (insertTeis.length > 0) {
      //        insertTeis.forEach(function(eachTEI){eachTEI.community=globalCommAbbr})
              TEI.collection.insert(insertTeis, function(err) {
                cb1(err, self);
              });
            } else {
              cb1(null, self);
            }
          },
          //comes here as we need teis inserted to be sure nothing omitted
         function deleteDeadEntities (argument, cb1) {
           if (deleteTeiEntities.length>0) {
             async.mapSeries(deleteTeiEntities, deleteEntityName, function (err, results) {
               cb1(err, self);
             });
           } else {cb1(null, self);}
         } /* ,
         function checkPbPlacement (argument, cb1) {
           //needed to avoid: <text><body><pb>...<div etc  </body><pb/></text>. Must be: <text><body><pb>...<div etc  <pb/>...</body></text>
           //aaah.. problem with this. This gives conniptions when there are many pages ahead of us and we
           //try to close an element within the page. so: ONLY put next pb within the innermost tei; leave remainder as siblings of the body
           //as text is added page by page -- we keep bumping the next page within the deepest element
           //dumped this in favour of another strategy dealing with continuing text in multipage documents
           if (insertTeis[0].ancestors.length>0) {
             async.waterfall([
               function (cb6) {
                  TEI.findOne({_id: insertTeis[0].ancestors[0]}, function (err, textEl) {
                    if (!err) cb6(null, textEl);
                    else cb6(err, []);
                  });
               }, //we wrote this one when we were treating page breaks etc rather differently...
               function (textEl, cb6) {
                 //if only one child .. happiness, all is ok. But if there is more than one.. nasty. Check for misplaced pbs which have to be moved to the child
                 if (textEl.children.length>1) {
                    adjustPBstuff(textEl.children, textEl,insertTeis, function (err, result) {
                      cb6(err, result);
                    })
                } else {
                  cb6(null, []);
                }
              }
            ], function (err) {
              cb1(null, []);}
            )
          } else cb1(null, []);
        } */
      ], function (err) {
          callback(null);
        }
       );
    },
    commit: function(data, callback) {
  //    console.log("calling here"); console.log(data);
      var self = this
        , teiRoot = data.tei || {}
        , docRoot = _.defaults(data.doc, self.toObject())
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
          '_id', 'name', 'label', 'image', 'children', 'community', 'ancestors', 'facs', 'image', 'teiHeader'
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
  //      errors.push(`prev page element is not match   ${_el2str(el)} ${_el2str(bound)}`);
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
      //I think we can ignore this now???
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

function filterEntities(docRoot, sourceTeis, updateTeis, community, elInfo, callback) {
  var entities=[];
  var  updateTeiEls=[];
  var updateAncestors=[];
  for (var i=0; i<sourceTeis.length; i++) {
    sourceTeis[i].isEntity=false;
    sourceTeis[i].community=community;  //help with housekeeping -- each tei gets allocated to a community
  }
  // either: we have a text element very early in the piece, or we are starting in media res
  // if in media res: first element will have ancestors.  Extract and populate the path
  var i=0;
  if (sourceTeis[0].ancestors.length) {
    //we are loading a page from transcription interface, not a whole file
    //roll through teis till we hit an entity element...
    while ((i<sourceTeis.length) && !isEntity(sourceTeis[i])) {i++};
    if (i==sourceTeis.length) { //no entities here at all
      callback(entities);
    }
    //use async routine to get ancestor details
    //first need to get the updateTeis
    async.waterfall ([
      function getUpdateTeis (cb1) {
        if (updateTeis.length>0) {
          async.map(updateTeis, getTEIUpdates, function (err, results){
            updateTeiEls=results;
            cb1(err, updateTeiEls);
          })
        } else cb1(null, updateTeiEls);
      },
      function getUpdateAncestors (updateTeiEls, cb1) {
        //we get all ancestorElements not present in updateTeis or in insertTeis
        for (var i = 0; i < sourceTeis.length; i++) {
           for (var j=0; j<sourceTeis[i].ancestors.length; j++) {
             if (!inInsUpsAncs(sourceTeis[i].ancestors[j], sourceTeis, updateTeiEls, updateAncestors)) updateAncestors.push({'_id': sourceTeis[i].ancestors[j]});
           }
        }
        async.map(updateAncestors, getTeiAncestors, function (err, results) {
          updateAncestors=results;
          cb1(err, {'updateTeiEls':updateTeiEls, 'updateAncestors':updateAncestors});
        });
      },
      function processTeis (argument, cb1) {
        updateTeiEls=argument.updateTeiEls;
        updateAncestors=argument.updateAncestors;
        if (i<sourceTeis.length-1) {
          elInfo.curPath.push({"tei_id": sourceTeis[i].ancestors[0], "index":i,  "entName": "text" });
          elInfo.currAncestor=inInsUpsAncs(sourceTeis[i].ancestors[0],sourceTeis, updateTeiEls, updateAncestors);
          for (i; i<sourceTeis.length; i++) {
  //          if (i % 1000 == 0) console.log("processing TEI "+i);
            processTei(elInfo, sourceTeis[i], sourceTeis, updateTeiEls, updateAncestors, i, community);
          }
          cb1(null, updateTeiEls);
        } else {cb1(null, updateTeiEls);}
      }
    ], function (error, updateTeiEls) {
      callback(updateTeiEls);
    });
  } else {  //from file
    for (var i=0; !elInfo.curPath.length; i++) {
      var childEl=sourceTeis[i];
      if (childEl.name=="text") {
        elInfo.curPath.push({"tei_id":childEl._id, "index":i, "entName": "text" });
        childEl.isEntity= true;
        childEl.entityChildren=[];
        for (++i; i<sourceTeis.length; i++) {
//          if (i % 1000 == 0) console.log("processing TEI "+i);
          processTei(elInfo, sourceTeis[i], sourceTeis, [], [], i, community);
        }
        callback(updateTeiEls);
      }
    }
  }
}

function getTEIUpdates (teiID, callback) {
  TEI.findOne({_id:teiID}, function (err, version) {
    //populate with children from updateTeis; rest from stored version
    for (var j=0; j<origUpdateTeis.length; j++) {
      if (String(origUpdateTeis[j]._id)==String(version._id)) {
        version.children=origUpdateTeis[j].children;
      }
    }
    callback(err, version);
  });
}

function inInsUpsAncs(soughtAncestor, sourceTeis, updateTeiEls, otherAncestorTeis) {
  var foundAncestor=null;
  for (var i = sourceTeis.length-1; i >= 0 && !foundAncestor; i--) {
    if (String(soughtAncestor)==String(sourceTeis[i]._id)) foundAncestor=sourceTeis[i];
  }
//  var foundAncestor = sourceTeis.filter(function (obj){return String(obj._id) == String(soughtAncestor);})[0];
  if (foundAncestor) return(foundAncestor);
  foundAncestor = updateTeiEls.filter(function (obj){return String(obj._id) == String(soughtAncestor);})[0];
  if (foundAncestor) return(foundAncestor);
  foundAncestor = otherAncestorTeis.filter(function (obj){return String(obj._id) == String(soughtAncestor);})[0];
  return(foundAncestor);
}

function processTei(elInfo, childEl, sourceTeis, updateTeiEls, updateAncestors, i, community) {
//after all the drama.. let's make this easy
//just look at the ancestors, get them from updateTeiEls, that's all we need to do
  if (isEntity(childEl)) {
    //first ancestor is always the text element
        //if lowest ancestor is currancestor...no need to change
      //walk up through the ancestors. Find the lowest which is an entity
      //by definition: all the ancestors will be in either updateTeiEls or in sourceTeis, up to the text element
    //remake currpath each time..remove all except foundation text ancestor
    //note: this could be the top level entity
    if (String(elInfo.currAncestor._id)==String(childEl.ancestors[childEl.ancestors.length-1])) {
      //could be root..
      childEl.isEntity=true;
      childEl.isTerminal=true;
      childEl.entityName=elInfo.currAncestor.entityName+":"+nameEntity(childEl, community, elInfo.curPath.length+1);
      childEl.entityAncestor=elInfo.currAncestor.entityName;
      childEl.entityAncestors=[];
      elInfo.currAncestor.entityChildren.push(childEl._id);
      elInfo.currAncestor.isTerminal=false;
      childEl.entityChildren=[];
      childEl.entityAncestors=elInfo.entityAncestors;
      return;
    } else {
      var thisAncestor=inInsUpsAncs(childEl.ancestors[0], sourceTeis, updateTeiEls, updateAncestors);
      elInfo.curPath.splice(1,elInfo.curPath.length-1);
      elInfo.entityAncestors=[];
      for (var j = 1; j < childEl.ancestors.length; j++) {
        if (isEntity(inInsUpsAncs(childEl.ancestors[j], sourceTeis, updateTeiEls, updateAncestors))) {
          thisAncestor=inInsUpsAncs(childEl.ancestors[j], sourceTeis, updateTeiEls, updateAncestors);
          elInfo.curPath.push({"tei_id":thisAncestor._id,  "entName": thisAncestor.name, "entity": nameEntity(thisAncestor, community, elInfo.curPath.length+1), "isTerminal":true});
          elInfo.entityAncestors.push(thisAncestor._id);
        }
      }  //entityName and Ancestor might be undefined if this is a new entity. Leave ancestor undefined if this is a new entity
      if (thisAncestor.name!='text') {
        elInfo.currAncestor=thisAncestor;
        elInfo.currAncestor.isTerminal=false;
        childEl.entityAncestor=elInfo.currAncestor.entityName;;
        childEl.entityName=elInfo.currAncestor.entityName+":"+nameEntity(childEl, community, elInfo.curPath.length+1);
        elInfo.currAncestor.entityChildren.push(childEl._id);
        childEl.entityAncestors=elInfo.entityAncestors;
      } else {  //we must have top level entity: this is an entity with an ancestor which is NOT an entity
        //("this is an entity")
        elInfo.currAncestor=thisAncestor;
        elInfo.entityAncestors=[];
        childEl.entityName=community+":entity="+childEl.attrs.n;
        childEl.entityAncestor="";
      }
        //write stuff to this ancestor now, and to the child
      childEl.isEntity=true;
      childEl.isTerminal=true;
      childEl.entityChildren=[];
      return;
    }
    return;
  }
}

function isEntity(thisTei) {
    if (!_.isEmpty(thisTei.attrs) && thisTei.attrs.n && thisTei.children.length && thisTei.name!="pb" && thisTei.name!="cb" && thisTei.name!="lb") {
      return true;
    }
    else {
      return false;
    }
}

function deleteDocChildren(docid, callback) {
  Doc.findOne({_id: docid}, function (err, document){
    if (document) {
      var docChildren=document.children;
      Doc.collection.remove({_id: docid}, function(err, result){
        if (docChildren.length>0) {
          async.map(docChildren, deleteDocChildren, function (err, results) {
            callback(err);
          })
        } else callback(err);
      })
    } else callback(err);
  });
}

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
  var path="", j=curPath.length;
  if (!childEl) j--;
  for (var i=1; i<curPath.length; i++) {
    if (i>1) path=path+":";
    path=path+curPath[i].entity;
  }
  return path;
}

function getTeiAncestors (teiID, callback) {
  TEI.findOne({_id:teiID}, function (err, version) {
    callback(err, version);
  });
}

function filterLiveEntities(insertTeis, liveEntities, community) {
  //give us a list of all entities to be added
  //check if the entity exists
  //check too if not already written to live entities
  var topEntities=[];
  for (var i=0; i<insertTeis.length; i++) {
    if (insertTeis[i].name=="text") continue;
    if (insertTeis[i].isEntity) {
        var isTerminal=false;
        if (insertTeis[i].entityChildren && !insertTeis[i].entityChildren.length) isTerminal=true;
        if (!insertTeis[i].entityAncestor) topEntities.push({"entityName":insertTeis[i].entityName,"isTerminal": isTerminal, "name": insertTeis[i].attrs.n, "tei_id": insertTeis[i]._id, "entityChildren":insertTeis[i].entityChildren});
        liveEntities.push({"entityName":insertTeis[i].entityName ,"ancestorName": insertTeis[i].entityAncestor, "isTerminal": isTerminal, "name": insertTeis[i].attrs.n, "community": community})
      }
  }
  //return list of top level entities in this community''
  return topEntities;
}

function getEntityPaths  (entityTEI, callback) {
    if (!entityTEI.isEntity || entityTEI.ancestorName=="") {
      callback(null, entityTEI);
    } else {
      Entity.findOne({entityName: entityTEI.ancestorName}, function (err, entity) {
        if (entity) {
          entityTEI.entityPath.push(entity.entityName);
          entityTEI.ancestorName=entity.ancestorName;
            //recurse up enti
          getEntityPaths(entityTEI, function (err, result) {
            callback(err, result)
          });
        } else {
          callback("Failed to find ancestor entity. This is impossible", null)
        }
      });
    }
}

function deleteEntityName(thisTei, callback) {
  //calculate what ancestor entity will be..
  //either: we are dealing with base entity, in which case we are looking for the
  //tei for the entity for deletion
  //or: we are looking for ancestors of the entity, in which case find ancestor teis
  var entityAncestor="";
  var isBaseEntity=false;  //ie, at lowest level
  for (var j=0; j<thisTei.entityPath.length; j++) {
    if (thisTei.entityName==thisTei.entityPath[j]) {
      if (j==0) {  isBaseEntity=true;}
      if (j==thisTei.entityPath.length-1) entityAncestor="";
      else entityAncestor=thisTei.entityPath[j+1]
    }
  }
  //first check there are no other teis for this entity name, if we are looking
  if (isBaseEntity) {
    TEI.find({entityName:thisTei.entityName}, function(err, results) {
//      //("finding to delete "+teiel);
      //a bit tricky here. Need to see if entity exists -- might already have been deleted
      //if not deleted: delete. Regardless: go up the entity path checking each level
      if (results.length==0) {
        //delete from entities. Check it is here .. if so, delete and go up tree
        //if not here: just go up the tree
        var isTopEntity;
        if (entityAncestor=="") isTopEntity=true; else isTopEntity=false;
        //delete entity right here .. if it is
        vaporizeEntity(thisTei, isTopEntity, function(){
          if (entityAncestor=="") callback(err, true);
          else {
            thisTei.entityName=entityAncestor;
            deleteEntityName(thisTei, callback, function (err1, result){
              callback(err1, true);
            });
          }
        });
      } else {
        //there is a tei -- then leave it in place
        callback(err, true);
      }
    });
  } else {
    TEI.find({entityAncestor:thisTei.entityName}, function(err, results) {
      //a bit tricky here. Need to see if entity exists -- might already have been deleted
      //if not deleted: delete. Regardless: go up the entity path checking each level
      if (results.length==0) {
        //delete from entities. Check it is here .. if so, delete and go up tree
        //if not here: just go up the tree
        var isTopEntity;
        if (entityAncestor=="") isTopEntity=true; else isTopEntity=false;
        //delete entity right here .. if it is
        vaporizeEntity(thisTei, isTopEntity, function(){
          if (entityAncestor=="") callback(err, true);
          else {
            thisTei.entityName=entityAncestor;
            deleteEntityName(thisTei, callback, function (err1, result){
              callback(err1, true);
            });
          }
        });
      } else {
        //there is a tei -- then leave it in place
        callback(err, true);
      }
    });
  }
}

function adjustPBstuff(textchildren, textEl, sourceTeis, callback) {
  //need to check.. we may have ALREADY inserted a pagebreak in deepest element on page. In that case.. don't insert yet another!
  //check this way: if next pb child of the body element is NOT the page following this.. then it is already inserted. Leave it alone
//  console.log("textchildren"); console.log(textchildren);
  async.waterfall([
    function (cb7) {
      async.map(textchildren, getTeiAncestors, function (err, results){
        cb7(err, results);
      })
    },
    function (textElChildren, cb7) {
       var bodyel, frontel, backel;
       var bodypages=[], frontpages=[], backpages=[], bodypagedocs=[];
       var inbody=false, infront=false, inback=false;
       textElChildren.map(function (page){//tricky! some of these could belong in front or back
         if (page.name=="body") { infront=inback=false; inbody=true; bodyel=page._id;}
         if (page.name=="front") { inbody=inback=false; infront=true; frontel=page._id;}
         if (page.name=="back") { inbody=infront=false; inback=true; backel=page._id; }
         if (page.name=="pb") {
           if (inbody) {bodypages.push(page._id); bodypagedocs.push(page.docs[page.docs.length-1]);}
           if (infront) frontpages.push(page._id);
           if (inback) backpages.push(page._id);
         }
       });
       //now append children to body, or whichever (safe to add, MUST follow)
       //and alter ancestors for each page to point at body or whichever
       //safe to do all these in parallel
       //now, we ONLY bump the first page. So lets just remove all but the first element

       if (bodypages.length>0) {
  //       console.log("bodypages "+bodypages);
         TEI.collection.update({_id:textEl._id},{$pull: {children:  bodypages[0]}}, function (err, result) {
           findDeepestParent(sourceTeis, function(err, deepestElAncestor) {
//             console.log("deepest ancestor after callbacks "); console.log(deepestElAncestor);
             TEI.collection.update({_id: ObjectId(deepestElAncestor)}, {$push: {children: bodypages[0]}}, function (err, result){
                 TEI.findOne({_id: ObjectId(deepestElAncestor)}, function (err, thisDeepest) {
                   var thisPageAncs=thisDeepest.ancestors;
                   var myPageAncs=JSON.parse(JSON.stringify(thisPageAncs));
                   var newPageAncs=myPageAncs.map(function(pageid) {return(ObjectId(pageid))});
                   newPageAncs.push(ObjectId(deepestElAncestor));
                   TEI.collection.update({_id: ObjectId(bodypages[0])}, {$set: {ancestors: newPageAncs}}, function(err) {
                      Revision.collection.remove({doc: ObjectId(bodypagedocs[0])}, function(err){
                        cb7(err);
                      });
                   });
                 });
              });
            });
         })
       } else cb7(null);
     }
   ], callback)
}

function findCurrentDeepest(sourceTeis, callback) {
  //we have a pb as our sourcetei.. tricky, to find the deepest ancestor on this page..
  if (sourceTeis[0].name=="body") callback(null, sourceTeis[0].children[sourceTeis[0].children.length-1]);
  else {
    var deepestEl=null;
    async.waterfall([
      function (cb) {
        async.map(sourceTeis[0].ancestors, getTeiAncestors, function (err, results) {
          cb (err, results.slice(2)); //don't include text and body elements here
        });
      },
      function (ancestors, cb) {
        //inspect each ancestor: find the highest one with a right sibling within sourceTeis. That one will be our deepest ancestor
        //if no right siblings: then we are still in the same ancestor element. that will be our deepest ancestor
//        console.log("ancestors"); console.log(ancestors);
        var rightSibEl=null;
        for (var i = 0; i < ancestors.length; i++) {
          if (ancestors[i].children.length>1) {
            //is the last child our current ancestor? if not: then we probably have a right sibling
            if (i<ancestors.length-1) {
              if (String(ancestors[i].children[ancestors[i].children.length-1]) != String(ancestors[i+1]._id)) {
                //..ho! last child might be rightsibling of a current element, in sourceTeis
                //test if this right sibling is among sourceTeis
                rightSibEl = sourceTeis.filter(function (obj){return String(obj._id) == String(ancestors[i].children[ancestors[i].children.length-1]);})[0];
  //              console.log("right sibling found"); console.log(rightSibEl);
                if (rightSibEl && rightSibEl.children.length) {
  //                console.log("got a deep one"); console.log(rightSibEl);
                  deepestEl=rightSibEl._id;
                  i=ancestors[i].children.length;
                }
              }
            }
          }
        }  //could be just we are still in the same ancestor we started with
        if (!deepestEl) deepestEl= sourceTeis[0].ancestors[sourceTeis[0].ancestors.length-1];
        cb (null, deepestEl);
      }
    ], function (err, deepestEl) {
        callback(err, deepestEl);
        // Node.js and JavaScript Rock!
    });
  }
}


function findDeepestParent(sourceTeis, callback) {
  //problem..right most child is likely a pb element...
  //we need to find the right most child which is a content element....
  //first child of sourceTeis might be body! which is easy. But might be pb.. and that one is tough
//  console.log("sourcetei 0 before callbacks "); console.log(sourceTeis[0]);
  findCurrentDeepest(sourceTeis, function (err, thisChildId){
    if (!err) {
//      console.log("childid returned from current deepest"); //(thisChildId);
      var thisChildEl = sourceTeis.filter(function (obj){return String(obj._id) == String(thisChildId);})[0];
      //if thisChildEl is null: it is the current ancestor which begins BEFORE this page.
      //in the case.. just call back with this one!
      if (!thisChildEl) {
        callback(null, thisChildId)
      }
      else {
//        console.log("childel "+thisChildEl)
        var soughtChildEl=null;
        while (thisChildEl) {
          soughtChildEl=JSON.parse(JSON.stringify(thisChildEl));
          if (thisChildEl.children.length>0) {
            thisChildId=thisChildEl.children[thisChildEl.children.length-1];
            thisChildEl = sourceTeis.filter(function (obj){return String(obj._id) == String(thisChildId);})[0];
          } else {thisChildEl=null};
        }
        callback(err, soughtChildEl.ancestors[soughtChildEl.ancestors.length-1]);
      }
    }
  });
}

function vaporizeEntity (entityEl, isTopEntity, callback) {
  if (isTopEntity) {
    //take out from: the document; the communit
    async.waterfall ([
      function identifyPage (cb1) {
        if (globalDoc.ancestors.length) {
            Doc.findOne({_id: globalDoc.ancestors[0]}, function(err, doc) {
              cb1(err, doc);
            });
        } else {
          cb1(null, globalDoc);
        }
      },
      function removeEntityDoc (myDoc, cb1) {
        Doc.update({'_id': myDoc._id}, { $pull: { entities: { entityName: entityEl.entityName} } }, function(err, doc){
          cb1(err, myDoc);
        });
      },
      function removeEntityCommunity (myDoc, cb1) {
        Community.update({'abbr': globalCommAbbr}, { $pull: { entities: { entityName: entityEl.entityName} } }, function(err, doc){
          cb1(err, doc);
        });
      }
    ])
  }
  Entity.collection.remove({entityName: entityEl.entityName}, function (err, result){
    callback(err, true);
  });
}

const Doc = mongoose.model('Doc', DocSchema);
module.exports = Doc;
