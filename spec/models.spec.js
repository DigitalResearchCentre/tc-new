const _ = require('lodash')
  , async = require('async')
  , bson = require('bson')
  , ObjectId = bson.ObjectId
  , models = require('../models')
  , TEI = models.TEI
  , Doc = models.Doc
  , Community = models.Community
;

const TEST_TEI = {
  name: 'text',
  attrs: {
    testId: 'test-1',
  },
  children: [{
    name: 'body',
    attrs: {testId: 'test-2'},
    children: [{
      name: 'div',
      attrs: {
        type: 'G', n: 'GP',
        testId: 'test-3',
      },
      children: [{
        name: 'pb',
        attrs: {testId: 'test-4'},
        children: [],
      }, {
        name: 'lb',
        attrs: {testId: 'test-5'},
        children: [],
      }, {
        name: 'l',
        attrs: {
          n: '1', testId: 'test-6',
        },
        children: [{
          name: '#text',
          attrs: {
            testId: 'test-7',
          },
          text: 'hello world',
        }],
      }, {
        name: 'l',
        attrs: {
          n: '2', testId: 'test-8',
        },
        children: [{
          name: '#text',
          text: 'foo bar',
          attrs: {
            n: '2', testId: 'test-9',
          },
        }],
      }, {
        name: 'pb',
        attrs: {
          testId: 'test-10',
        },
        children: [],
      }, {
        name: 'l',
        attrs: {n: '3', testId: 'test-11'},
        children: [{
          name: '#text',
          attrs: {testId: 'test-12'},
          text: 'third line',
        }],
      }],
    }, {
      name: 'div',
      attrs: {n: 'GP1', testId: 'test-13'},
      children: [{
        name: 'lb',
        attrs: {testId: 'test-14'},
        children: [],
      }, {
        name: 'l',
        attrs: {n: '1', testId: 'test-15'},
        children: [{
          name: '#text',
          attrs: {testId: 'test-16'},
          text: 'hello world',
        }],
      }, {
        name: 'l',
        attrs: {n: '2', testId: 'test-17'},
        children: [{
          name: '#text',
          attrs: {testId: 'test-18'},
          text: 'foo bar',
        }],
      }, {
        name: 'pb',
        attrs: {testId: 'test-19'},
        children: [],
      }, {
        name: 'l',
        attrs: {n: '3', testId: 'test-20'},
        children: [{
          name: '#text',
          attrs: {testId: 'test-21'},
          text: 'third line',
        }],
      }],
    }]
  }]
};

describe('models test', function() {
  var doc1, com1;

  beforeEach(function(done) {
    async.parallel([
      function(cb) {
        TEI.remove(cb);
      },
      function(cb) {
        Doc.remove(cb);
      },
    ], function(err) {
      async.waterfall([
        function(cb) {
          com1 = new Community({name: 'com1'});
          com1.save(function(err, obj) {
            cb(err, obj);
          });
        },
        function(com1, cb) {
          doc1 = new Doc({name: 'd1'});
          doc1.save(function(err, obj) {
            cb(err, obj);
          });
        },
        function(doc1, cb) {
          com1.documents.push(doc1._id);
          com1.save(function(err, obj) {
            cb(err, obj);
          });
        }
      ], function(err) {
        done();
      });

    });
  });

  describe('Doc specs', function() {

    it('commit should import tei to new doc', function(done) {
      var tei = _.cloneDeep(TEST_TEI)
        , queue = [tei]
        , docIds = [doc1._id, new ObjectId(), new ObjectId(), new ObjectId()]
        , i = 0
        , docId = docIds[i]
        , cur
      ;
      while (queue.length > 0) {
        cur = queue.shift();
        if (cur.name === 'pb') {
          i += 1;
        }
        cur.doc = docIds[i];
        _.forEachRight(cur.children, function(child) {
          queue.unshift(child);
        });
      }

      doc1.commit({
        tei: tei,
        doc: {
          children: [{
            name: '1r',
            _id: docIds[1],
          }, {
            name: '1v',
            _id: docIds[2],
          }, {
            name: '2r',
            _id: docIds[3],
          }],
        },
      }, function(err) {
        async.parallel([
          function(cb) {
            Doc.getOutterBoundTexts(docIds[2], cb);
          },
          function(cb) {
            Doc.findOne({_id: docIds[2]}, cb);
          },
          function(cb) {
            TEI.find({docs: doc1._id}, function(err, nodes) {
              expect(nodes.length).toBe(21);
              cb(err);
            });
          },
          function(cb) {
            TEI.find({docs: docIds[1]}, function(err, nodes) {
              expect(nodes.length).toBe(6);
              cb(err);
            });
          },
          function(cb) {
            TEI.find({docs: docIds[2]}, function(err, nodes) {
              expect(nodes.length).toBe(9);
              cb(err);
            });
          },
          function(cb) {
            TEI.find({docs: docIds[3]}, function(err, nodes) {
              expect(nodes.length).toBe(3);
              cb(err);
            });
          },
        ], function(err, results) {
          var bounds = results[0]
            , pb1v = results[1]
            , text = bounds[0][0]
            , body = bounds[0][1]
            , gp = bounds[0][2]
            , l2 = bounds[0][3]
            , gp1 = bounds[1][2]
          ;
          pb1v.commit({
            tei: {
              name: 'text',
              prev: text._id,
              next: text._id,
              children: [{
                name: 'body',
                prev: body._id,
                next: body._id,
                children: [{
                  name: 'div',
                  prev: gp._id,
                  children: [{
                    name: 'l',
                    prev: l2._id,
                    children: [{
                      name: 'pb',
                      doc: pb1v._id,
                      attrs: {
                        testId: 'test-10',
                      },
                      children: [],
                    }, {
                      name: '#text', 
                      doc: pb1v._id,
                      attrs: {testId: 'test-1-9'},
                      text: 'continue text'
                    }]
                  }, {
                    name: 'l',
                    doc: pb1v._id,
                    attrs: {n: '3', testId: 'test-11'},
                    children: [{
                      name: '#text',
                      doc: pb1v._id,
                      attrs: {testId: 'test-12'},
                      text: 'third line again',
                    }],
                  }],
                }, {
                  name: 'div',
                  next: gp1._id,
                  doc: pb1v._id,
                  attrs: {n: 'GP1', testId: 'test-13'},
                  children: [{
                    name: 'lb',
                    doc: pb1v._id,
                    attrs: {testId: 'test-14'},
                    children: [],
                  }, {
                    name: 'l',
                    doc: pb1v._id,
                    attrs: {n: '1', testId: 'test-15'},
                    children: [{
                      name: '#text',
                      attrs: {testId: 'test-16'},
                      doc: pb1v._id,
                      text: 'hello world again',
                    }],
                  }, {
                    name: 'l',
                    doc: pb1v._id,
                    attrs: {n: '2', testId: 'test-17'},
                    children: [{
                      name: '#text',
                      attrs: {testId: 'test-18'},
                      doc: pb1v._id,
                      text: 'foo bar again',
                    }],
                  }]
                }]
              }]
            },
            doc: {
              children: [],
            }
          }, function(err) {
            TEI.find({docs: pb1v._id}).exec(function(err, nodes) {
              expect(nodes.length).toBe(10);
              done();
            });
          });
        })
      });
    });
  });

  describe('tree operation specs', function() {
    var nodeIds = []
      , prevText, nextText
    ;

    beforeEach(function(done) {
      TEI.import(_.cloneDeep(TEST_TEI), function(err, result) {
        nodeIds = result.insertedIds;

        async.parallel([
          function(cb) {
            TEI.find({_id: {$in: nodeIds}}, cb);
          },
          function(cb) {
            TEI.collection.findOne({'attrs.testId': 'test-10'}, cb);
          },
          function(cb) {
            TEI.collection.findOne({'attrs.testId': 'test-18'}, cb);
          },
        ], function(err, results) {
          var nodes = results[0];
          prevText = results[1];
          nextText = results[2];
          done();
        });
      });
    });
    
    afterEach(function(done) {
      TEI.remove(function() {
        done();
      });
    });

    it('import should parse input tree and create children', function() {
      expect(nodeIds.length).toBe(21);
    });

    it('getNodesBetween should return tree between two nodes', function(done) {
      var prevAncestors = prevText.ancestors.concat(prevText._id)
        , nextAncestors = nextText.ancestors.concat(nextText._id)
      ;
      TEI.getNodesBetween(prevAncestors, nextAncestors, function(err, nodes) {
        expect(nodes.length).toBe(12);
        _.each([1, 2, 3].concat(_.range(10, 19)), function(i) {
          var found = _.find(nodes, function(node) {
            return node.attrs.testId === 'test-' + i;
          });
          expect(!!found).toBe(true);
        });

        done();
      });

    });
  });
});
