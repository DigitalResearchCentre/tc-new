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
  , $ = require('jquery')


const CheckLinkError = Error.extend('CheckLinkError');
var killTheseEntities =[];

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
      console.log("communityAbbr "+communityAbbr);

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
      var elInfo = {"currAncestor": {}, "currEntity": {}, "curPath": [] };
 //use this to hold mongoDB element for page
      console.log("starting out with");
      console.log(insertTeis);
      filterEntities(docRoot, insertTeis, communityAbbr, elInfo, function(myentities, err) {
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
          //we changed parallel to waterfall: need to have this tasks occur in sequence or wierd things may happen
          async.waterfall([
            function identifyTEIDeleteChildren (cb1) {
                TEI.find({$or: [{ancestors: {$in: deleteTeis}}, {_id: {$in: deleteTeis}},]}, function (err, results) {
  //                console.log("doing delete children "+results)
                  var TEIDeleteChildren=[];
                  for (var i=0; i<results.length; i++) {
                    var entityPath=[];
                    entityPath.push(results[i].entityName);
                    TEIDeleteChildren.push({id:results[i]._id, entityName: results[i].entityName, ancestorName: results[i].entityAncestor, entityPath: entityPath, isEntity:results[i].isEntity});
                  }
//                  console.log("after making delete children "+TEIDeleteChildren);
                  cb1(null, TEIDeleteChildren);
                });
              },
            function saveDocRoot (TEIDeleteChildren, cb1) {
              console.log("delete children "+TEIDeleteChildren);
              console.log(docRoot);
              console.log(insertTeis[0]);
              console.log(self);
          //    console.log(topEntities);
          //now in this case: if we are coming from a file (=a whole doc), docRoot and self are BOTH
          //the whole document. BUT if we are coming from a page within a doc:
          //docRoot and self are BOTH the page, not the doc.
          //we can distinguish: if from file, first insertTeis has no ancestors
          //from file:
            if (!insertTeis[0].ancestors.length) {
              self.entities=topEntities;
              self.children = docRoot.children;
              self.save(function(err) {
                console.log('save done of docroot');
                console.log(self);
                cb1(err, self);
              });
            } else { //from doc
              console.log("docroot "); console.log(self);

              console.log("top entities "); console.log(topEntities);
              //here we find the docRoot and add new entities to this
              console.log("first tei "+insertTeis[0]);  //first insertTei will be body without a doc..
              //doc will be in the docs array; alter it in there and away we go
              console.log("first tei "); console.log(insertTeis[0]);  //first insertTei will be body without a doc..
              console.log("second tei "); console.log(insertTeis[1]);  //first insertTei will be body without a doc..
//              console.log("docs "); console.log(docs);
              Doc.findOne({_id: insertTeis[1].docs[0]}, function(err, doc) {
                if (err) throw err;
                if (doc)  {
                //check it here
                  console.log("got the document"); console.log(doc);
//                  console.log("got the topentities"); console.log(topEntities);
//                  console.log("got the deleteTeis"); console.log(deleteTeis);
                  //right... check if we already have these entity children
                  if (_.isEmpty(doc.entities)) {
                    doc.entities=topEntities;
                  } else {
                    console.log("hunting here");
//                    console.log("entityChildren"+doc.entities[0].entityChildren)
                    for (var i=0; i<doc.entities.length; i++) {
                      console.log("removing "+TEIDeleteChildren+" from entity "+doc.entities[i].entityChildren+" for deleteteis "+deleteTeis)
                      for (var j=0; j<topEntities.length; j++) {
                        if (typeof(topEntities[j].alreadyHere) == "undefined") topEntities[j].alreadyHere=false;
                        if (doc.entities[i].entityName==topEntities[j].entityName) {
                          //top fella here .. check the children
                          //if existing child is to be deleted: take it out of here
                          //update tei_id is_terminal in doc
                          topEntities[j].alreadyHere=true;
                          doc.entities[i].tei_id=topEntities[j].tei_id;
                          doc.entities[i].isTerminal=topEntities[j].isTerminal;
//                          console.log("removing "+TEIDeleteChildren+" from entity "+doc.entities[i].entityChildren+" for deleteteis "+deleteTeis)
                          for (var k=0; k<doc.entities[i].entityChildren.length; k++) {
//                            console.log("checking for "+doc.entities[i].entityChildren[k]);
                            for (var m=0; m<TEIDeleteChildren.length; m++) {
//                              console.log("compare "+TEIDeleteChildren[m].id+" to "+doc.entities[i].entityChildren[k]);
                              if (String(TEIDeleteChildren[m].id)==String(doc.entities[i].entityChildren[k])) {
//                                console.log("remove this one "+TEIDeleteChildren[m]+" working "+doc.entities[i]);
//                                console.log("before splice "+doc.entities[i].entityChildren);
                                doc.entities[i].entityChildren.splice(k, 1);
//                                console.log("after splice "+doc.entities[i].entityChildren);
                                k--;
                              }
                            }
                          }
                          //deletion done. Let's add new children (to do: have to adjust order of children)
                          doc.entities[i].entityChildren.push(topEntities[j].entityChildren);
  //                        console.log("after adding "+doc.entities[i].entityChildren);
                        }
                      }
                    }
                    //top entity not in doc, just add it
                    for (var j=0; j<topEntities.length; j++) {
                      if (!topEntities[j].alreadyHere) doc.entities.push({entityName: topEntities[j].entityName, isTerminal: topEntities[j].isTerminal, name: topEntities[j].name, tei_id: topEntities[j].tei_id, entityChildren: topEntities[j].entityChildren});
                    }
                    //if the top entity is already there.. leave it
                    //check children of top entity, may need to add to top
                    //first -- if current top entity is among those to be deleted
                  }
                  console.log('about to save '+doc)
  //                console.log(doc.entities[0].entityChildren);
                  //for some reason, straight doc.save does not work. This does.
                  Doc.collection.update({_id: doc._id}, {
                    $set: {entities: doc.entities},
                  }, cb1(null, self));
                  //for some reason .. doc save is not actually saving
                  //so: lets use update function instead
            /*      doc.save(function(err, doc1, numberAffected) {
                    console.log("saved "+numberAffected); console.log(doc1);
                    console.log("saved "); console.log(doc1.entities[0]);
                    cb1(null, self);
                  }); */
                } else {
                  cb1(null, self);
                }
                });
              }
            },
            function insertDocsFunct(argument, cb1) {
              for (var i=0; i<docs.length; i++) {docs[i].community=communityAbbr};
              if (docs.length > 0) {
                Doc.collection.insertMany(docs, function(err, result) {
                  console.log('docs done');
//                  console.log(docs);
                  cb1(err, self);
                });
              } else {
                cb1(null, self);
              }
            },
            function deleteStuffFunct(argument, cb1) {
              console.log("delete these"); console.log(deleteTeis);
              //wierd things happening with synchronicity I think.. need to have things happen in order
              //first, remove entity children from master TEIs
              //set up waterfall to do the deletions
              var deleteEntityNames=[];
              if (deleteTeis.length) {
                async.waterfall([
                 function getEntityNames (cbAsync) {
                   //create array of entities we are going to delete
                   TEI.find({ancestors: {$in: deleteTeis}, isEntity: true, entityChildren: { $eq: [] }}, function (err, deleteEntities) {
                     console.log("to delete entities"); console.log(deleteEntities.length);
        /*             for (var i=0; i<deleteEntities.length; i++) {
                        var thisTEI=deleteEntities[i];
                        console.log(thisTEI);
                        deleteEntityNames.push({id:thisTEI._id, entityName: thisTEI.entityName, ancestorName: thisTEI.entityAncestor, entityPath:[], isEntity:true});
                     } */
                     deleteEntities.forEach(function(thisTEI) {
                        console.log(" delete: "); console.log(thisTEI);
                        var entityPath=[];
                        entityPath.push(thisTEI.entityName);
                        deleteEntityNames.push({id:thisTEI._id, entityName: thisTEI.entityName, ancestorName: thisTEI.entityAncestor, entityPath: entityPath, isEntity:true});
                    });
                    cbAsync(null, deleteEntityNames)
                  });
                },
                  function getDeleteEntityPaths (deleteEntityNames, cb1) {
                    //create paths for every tei we are going to delete
                    async.map(deleteEntityNames, getEntityPaths, function (err, results){
                      deleteEntityNames=results;
                      console.log("now in delete paths");
                      console.log(deleteEntityNames);
                      cb1(null, deleteEntityNames);
                    });
                  }, function doDeletion (deleteEntityNames, cbAsync) {
                  //deleteTEIs here
                  if (deleteTeis.length > 0) {
                    TEI.collection.remove({
                      $or: [
                        {ancestors: {$in: deleteTeis}},
                        {_id: {$in: deleteTeis}},
                      ]
                    }, function(err) {
                      //are there any entities in teis for this one?
                      console.log('delete teis done');
                      cbAsync(null, deleteEntityNames);
                    });
                  } else {
                    cbAsync(null, deleteEntityNames);
                  }
                }, function deleteDeadEntities (deleteEntityNames, cbAsync) {
                  console.log("about to keill entities" + deleteEntityNames.length);
                  console.log("here is where we will kill the entities "+deleteEntityNames);
                  //if in insertTeis -- filter from deleteEntityNames
                  //no need to delete if we are just going to put it back in!
                  if (deleteEntityNames.length) {
                    for (var i=0; i<deleteEntityNames.length; i++) {
                      var insertTei=insertTeis.filter(function (obj){return obj.entityName==deleteEntityNames[i].entityName})[0];
                      if (insertTei) {
                        deleteEntityNames.splice(i, 1);
                      }
                    }
                    async.mapSeries(deleteEntityNames, deleteEntityName, function (err, results) {
                      cbAsync(null, []);
                    });
                  } else {cbAsync(null, []);}
                }
               ], function (error, success) {
                  if (error) { console.log('Something is wrong!');
                    cb1(error, self);
                  }
                  console.log('delete teis done in test async');
                  console.log('vaporize these entities '+killTheseEntities);
                  cb1(null, self);
                });
              } else {cb1(null, self);}
            },
            function cleanEntitiesFunct(argument, cb1) {
              console.log("delete entity children");
              //first, remove entity children from ancestor TEIs
              if (deleteTeis.length > 0) {
                async.map(deleteTeis, findEntChildren, function (err, results) {
                  var uniqueEntities = _.uniqBy(results, "entityName");
                  console.log("got the results before removal "+uniqueEntities);
  //                console.log("deleteTEIs"+deleteTeis);
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
    //              console.log("got the results after removal "+uniqueEntities);
                  async.forEachOf(uniqueEntities, function(up) {
                    if (up) {
                      const cb2 = _.last(arguments);
                      TEI.collection.update({_id: up._id}, {
                        $set: {entityChildren: up.entityChildren},
                      }, cb2);
                    }
                  }, function(err) {
                    console.log('update ent children done');
                    cb1(err, self);
                  });
                  //save all our entities now
                  cb1(err, self);
                });
              } else {
                cb1(null, self);
              }
            },
            function upDateTeis(argument, cb1) {
              if (updateTeis.length > 0) {
                async.forEachOf(updateTeis, function(up) {
                  const cb2 = _.last(arguments);
                  TEI.collection.update({_id: up._id}, {
                    $set: {children: up.children},
                  }, cb2);
                }, function(err) {
                  console.log('update teis done');
                  cb1(err, self);
                });
              } else {
                cb1(null, self);
              }
            },
           function insertEntitiesFunct(argument, cb1) {
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
                  cb1(err, self);
                  });
              } else {
                cb1(null, self);
              }
            },
            function insertTopEntitiesFunc(argument, cb1) {
              if (topEntities.length) {
                async.forEachOf(topEntities, function(up) {
                  const cb2 = _.last(arguments);
                  Community.update({'abbr': communityAbbr}, {$addToSet: {"entities": {"entityName":up.entityName, "isTerminal": up.isTerminal, "name": up.name} } },
                    cb2);
                }, function(err) {
                  console.log('insert topentities done');
                  cb1(err, self);
                });
              } else cb1(null, self);
            },
            function insertTeisFunct(argument, cb1) {
              console.log("about to do insert teis");
              //for some reason: we get an error when we are trying to insert only some teis
              //console.log(insertTeis);
              async.forEachOf(insertTeis, function(insert) {
                const cb2 = _.last(arguments);
                TEI.collection.insert(insert, cb2);
              }, function(err) {
                    console.log(err);
                    console.log('insert teis done');
                    cb1(err, self);
                });
          /*          if (insertTeis.length > 0) {

                TEI.collection.insert(insertTeis, function(err) {
                  console.log(err);
                  console.log('insert teis done');
                  cb1(err);
               });
             } else cb1(null, []); */
           },  //this one to definitively remove vaporized entities
      /*      function killDeadEntities (argument, cb1) {
              console.log("entities to go "+killTheseEntities);
              async.map(killTheseEntities, vaporizeEntity, function (err, results) {
                cb1(err, self);
              });
            }, */
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
function filterEntities(docRoot, sourceTeis, community, elInfo, callback) {
  console.log("ancestor doc is "+docRoot);
  var entities=[];
  //very slow doing lots of filter look ups -- ie doing a filter look up on each child. Let's do it another way..
  //go through all array, lookup from child to ancestor caching each child
  for (var i=0; i<sourceTeis.length; i++) {
    sourceTeis[i].isEntity=false;
    sourceTeis[i].community=community;  //help with housekeeping -- each tei gets allocated to a community
  }
  // either: we have a text element very early in the piece, or we are starting in media res
  // if in media res: first element will have ancestors.  Extract and populate the path
  var i=0;
  if (sourceTeis[i].ancestors.length) {
    //roll through teis till we hit an entity element...
    console.log("in load from page "+docRoot+" id "+ sourceTeis[i].docs);
//    console.log(sourceTeis[i]);
    while (!isEntity(sourceTeis[i]) && (i<sourceTeis.length)) {i++};
    if (i==sourceTeis.length) { //no entities here at all
      callback(entities);
      return;
    }
  //  console.log("first element is")
  //  console.log(sourceTeis[i]);
    //use async routine to get ancestor details
    async.map(sourceTeis[i].ancestors, getTEIs, function (err, results) {
      console.log("processing the tei ancestors "+sourceTeis[i].ancestors.length)
      //note: will return nullfor teis not saved -- remove them
      console.log(results);
      for (var a=0; a<results.length; a++) {  if (!results[a]) results.splice(a, 1);}
      console.log(results);
      console.log(results[0]+" length "+results.length);
      elInfo.curPath.push({"tei_id": results[0]._id, "index":i,  "entName": "text" });
      console.log(elInfo.curPath[0])
  //    //("before splice");
  //    console.log(sourceTeis[i]);
      results[0].doNotWrite=true;
      sourceTeis.splice(i,0,results[0]);
//      console.log("after splice");
//      console.log(sourceTeis[i]);
//      console.log(results);
// only one result--must be the text. Text element is now 0;process from 1
      if (results.length==1) {
        console.log("calling pe")
        processEntities(elInfo, sourceTeis, i+1, entities, community, function(){
          callback(entities);
        });
      } else {
        //page is deep within a structure.. this needs to be checked out
        for (var j=1; j<results.length; j++) {
            if (results[j] && isEntity(results[j])) {
              elInfo.curPath.push({"tei_id":results[j]._id, "index":i+elInfo.curPath.length, "entName": results[j].name, "entity": nameEntity(results[j], community, elInfo.curPath.length), "doNotWrite": true});
              results[j].doNotWrite=true;
              sourceTeis.splice(i+elInfo.curPath.length-1,0,results[j]);
              if (elInfo.curPath.length==2) {
                  //0 is text, 1 must be the entity
  //                console.log("making the entity")
                  if (results[j].docs && results[j].docs[1]) var page=results[j].docs[1];
                  else page=null;
                  entities.push({"tei_id":results[j]._id, "name":results[j].attrs.n, "page":page, "entityChildren":[]});
                  elInfo.currEntity=entities[entities.length-1];
              }
          }
          if (j==results.length-1) {
              elInfo.currAncestor=sourceTeis[elInfo.curPath[elInfo.curPath.length-1].index]
    //          console.log("currentAncestor")
    //          console.log(currAncestor);
    //          console.log(curPath);
              processEntities(elInfo, sourceTeis, i+1, entities, community, function(){
      //          console.log("finished processing")
                callback(entities);
              });
          }
        }
      }
    }); //end in media res situation
  } else {
      //deals with load from file, or first saved page
    console.log("in load from file "+docRoot+" page "+ sourceTeis[0].docs);
    for (; !elInfo.curPath.length; i++) {
      var childEl=sourceTeis[i];
      if (childEl.name=="text") {
        elInfo.curPath.push({"tei_id":childEl._id, "index":i, "entName": "text" });
        childEl.isEntity= true;
        childEl.entityChildren=[];
        processEntitiesFile(elInfo, sourceTeis, i+1,  entities, community, function(){
    //      console.log(entities);
    //      console.log(sourceTeis)
          callback(entities);
        });
      }
    }
  }
}

//async function called in page modification
//if we have deleted an entity: check all ancestors too
// we are going to create a list of all entities for definitive deletion here..
// topentities etc MIGHT think an entity is referenced here where actually it has no TEI descendants
// so: create a list of entities for removal; last cleanup takes them out

function deleteEntityName(thisTei, callback) {
  console.log("about to delete entity");
  console.log(thisTei);
  //calculate what ancestor entity will be..
  var entityAncestor="";
  for (var j=0; j<thisTei.entityPath.length; j++) {
    if (thisTei.entityName==thisTei.entityPath[j]) {
      if (j==thisTei.entityPath.length-1) entityAncestor="";
      else entityAncestor=thisTei.entityPath[j+1]
    }
  }
  console.log("entity ancestor: "); console.log(entityAncestor);
  //first check there are no other teis for this entity name
  TEI.findOne({entityName: thisTei.entityName}, function(err, teiel) {
    console.log("finding to delete "+teiel);
    //a bit tricky here. Need to see if entity exists -- might already have been deleted
    //if not deleted: delete. Regardless: go up the entity path checking each level
    if (!teiel) { /*
      //delete from entities. Check it is here .. if so, delete and go up tree
      //if not here: just go up the tree
      console.log("ok, no teis. delete "); console.log(thisTei.entityName);
      var isTopEntity;
      if (entityAncestor=="") isTopEntity=true else isTopEntity=false;
      killTheseEntities.push({entityName: thisTei.entityName, isTopEntity: isTopEntity});
      Entity.findOne({'entityName':thisTei.entityName}, function (err1, entityEl){
        //create an array of ancestor names going all the way to the root
        console.log("entity el to delete"); console.log(entityEl);
        if (entityEl) {
          Entity.collection.remove({'entityName':thisTei.entityName}, function (err2, result){
            console.log("deletion done of "+thisTei.entityName);
            if (entityAncestor=="") { //at the top!
              callback(err2, true);
            } else {
              thisTei.entityName=entityAncestor;
              deleteEntityName(thisTei, callback, function (err3, result) {
                callback(err3, true);
              });
            }
          });
        } else {
          if (entityAncestor=="") callback(err1, true);
          else {
            thisTei.entityName=entityAncestor;
            deleteEntityName(thisTei, callback, function (err3, result) {
              callback(err3, true);
            });
          }
        }
      }); */
    } else {
      //there is a tei -- then leave it in place
      callback(err, true);
    }
  });
}


function isEntity(thisTei) {
    console.log(thisTei.attrs+!_.isEmpty(thisTei.attrs));
    if (!_.isEmpty(thisTei.attrs) && thisTei.attrs.n && thisTei.children.length && thisTei.name!="pb" && thisTei.name!="cb" && thisTei.name!="lb") {
      console.log("is entity");
      return true;
    }
    else {
      console.log("is not entity");
      return false;
    }
}

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

function processEntitiesFile (elInfo, sourceTeis, i, entities, community, callback) {
  //in this case -- we DONT need to handle async calls at all. So we can just loop through whole
  //souceTeis and send back what we have
    for (i; i<sourceTeis.length; i++) {
      processEntity(elInfo, sourceTeis[i], sourceTeis, i, entities, community, true, null);
    }
    console.log('file load ended');
    callback();
}

//processes either synchronously when fromFile or asysnchronously when submitting page
//reason: when submitting page, have to do asynch db searches while processing in strict order
function processEntity(elInfo, childEl, sourceTeis, i, entities, community, fromFile, callback) {
  console.log("replication "+i);
  console.log(elInfo);
  console.log("childEl "); console.log(childEl);
  if (isEntity(childEl)) {
    var j=childEl.ancestors.length-1, found=false;
    for (var j=childEl.ancestors.length-1; j>=0 && !found; j--) {
        for (var k=elInfo.curPath.length-1; k>=0 && !found; k--) {
        if (String(elInfo.curPath[k].tei_id)==String(childEl.ancestors[j])) {
            found=true;
//              console.log("we have an entity in the currpath "); console.log();
            elInfo.currAncestor=sourceTeis[elInfo.curPath[k].index];
            if (k<elInfo.curPath.length-1) { //remove in current path where match is up the tree
              elInfo.curPath.splice(k+1, elInfo.curPath.length-k)
            }
          }
        }
      }
    childEl.isEntity= true;
    childEl.entityChildren=[];
    if (elInfo.curPath.length>1) childEl.entityAncestor=elInfo.currAncestor.entityName;
    else childEl.entityAncestor="";
    elInfo.curPath.push({"tei_id":childEl._id, "index":i, "entName": childEl.name, "entity": nameEntity(childEl, community, elInfo.curPath.length)});
    childEl.entityName=createPath(elInfo.curPath, childEl);
    if (elInfo.currAncestor.doNotWrite) {
      console.log("about to add here 4");
      TEI.findOne({_id: elInfo.currAncestor._id}, function(err, teiel) {
//                console.log("about to add here 5 "+teiel);
        if (teiel) {
          teiel.entityChildren.push(childEl._id);
//          console.log("after adding "+teiel);
          teiel.save(function(err) {
              if (err) throw err;
              callback();
          });
        } else {
          console.log("can't find the ancestor")
          callback();
      }
      });
    }
    else {
      elInfo.currAncestor.entityChildren.push(childEl._id);
      if (elInfo.curPath.length!=3 && elInfo.currAncestor.name!="text") {
        if  (fromFile) return; else callback();
      }
    }
    if (elInfo.currAncestor.name=="text") {
      console.log("in the text element");
      if (childEl.docs && childEl.docs[0]) var thisdoc=childEl.docs[0];
      else var thisdoc=null;
      if (childEl.docs && childEl.docs[1]) page=childEl.docs[1];
      else var page=null;
  //    console.log("my page now is "+page+" in document "+thisdoc);
      //if this is a top level entity: locate document element among hierarchy and add this as child to
      //page element (necessary so we can find this entity in this document)
  //    console.log("my entity is "+childEl._id+" name "+childEl.entityName);
      entities.push({"tei_id":childEl._id, "name":childEl.attrs.n, "page":page, "entityChildren":[]});
      elInfo.currEntity=entities[entities.length-1];
      //locate parent document and add to parent, if not already there
      //note..our childEl may have changed, add him to function
      var thisEl=childEl;
      if (fromFile) return; else callback();
  //      i=sourceTeis.length;
      //if we have already written this page element...
//      console.log("looking for page 1 "+childEl.docs)
// had stuff in here to find the page -- taken out, we deal with this only when adding topentities at end
     }
     //now: if this is a child of an entity, we need to be sure we have
     //next should catch all cases where we need to write to ancestor
       if (elInfo.curPath.length==3) {
         //ie, we must be dealing with children of the top level entities
         //note: child of top level entities must also be added to the master doc element among entity children
         //let us see what we are dealing with
          console.log("Entity child to add to: "+elInfo.currAncestor.attrs.n);
           //    i=sourceTeis.length; //we are going to recurse from her
          if (elInfo.currEntity.doNotWrite) {
            var thisEl=childEl;
             TEI.findOne({_id: elInfo.currEntity._id}, function(err, teiel) {
               if (teiel) {
                 teiel.entityChildren.push(thisEl._id);
                 teiel.save(function(err) {
                   if (err) throw err;
                   callback();
                 });
               }
             });
          } else {
            console.log("doNotWrite is false or undefined for "+childEl+" childdocs "+childEl.docs)
             //here we add the child entity to the page if it is not already there
             elInfo.currEntity.entityChildren.push(childEl._id);
             if (fromFile) return; else callback();
             //next bit removed as could not get page lookup etc to work; now done in top entities
       }
     }
    } else {
//      console.log("not an entity");
      if (fromFile) return; else callback();
  }
}

//ensures entities with no teis are removed; also removes from community and doucments so not referenced
function vaporizeEntity (entityEl, callback) {

}
//gets the entity path for each tei element

function getEntityPaths  (entityTEI, callback) {
//    console.log("in getting entity");
//    console.log(entityTEI);
    if (!entityTEI.isEntity || entityTEI.ancestorName=="") {
      callback(null, entityTEI);
    } else {
      Entity.findOne({entityName: entityTEI.ancestorName}, function (err, entity) {
        if (entity) {
  //        console.log("found entity"+entity)
          entityTEI.entityPath.push(entity.entityName);
          entityTEI.ancestorName=entity.ancestorName;
            //recurse up enti
          getEntityPaths(entityTEI, function (err, result) {
            callback(err, result)
          });
        } else {
          console.log("can't find ancestor")
          callback("Failed to find ancestor entity. This is impossible", null)
        }
      });
    }
}

//tnis one is now recursive and asynchronous; cna only be used on shortish stretches of text maybe
function processEntities (elInfo, sourceTeis, i, entities, community, callback) {
  var jk=i;
  console.log("about to do pe at "+jk);
  asyncLoop(sourceTeis.length-i, function(loop) {
    processEntity(elInfo, sourceTeis[jk], sourceTeis, jk, entities, community, false, function(result) {
        // log the iteration
//        console.log("sf "+loop.iteration());
        jk++;
        loop.next();
    })},
    function(){console.log('cycle 1 ended')
    callback()}
  );
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
//    console.log("element "+i)
//    console.log(arr[i]);
    if (arr[i].doNotWrite) {
      //("got one to remove")
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
