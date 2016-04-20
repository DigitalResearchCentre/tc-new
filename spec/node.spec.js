const _ = require('lodash')
  , mongoose = require('mongoose')
  , async = require('async')
  , ObjectId = mongoose.Types.ObjectId
  , extendNodeSchema = require('../models/extend-node-schema')
;

describe('base node schema test', function() {
  const ModelName = 'TestNode'
    , TestNodeSchema = extendNodeSchema(ModelName, {
      name: String,
    })
    , TestNode = mongoose.model(ModelName, TestNodeSchema)
    , nodesMap = {}
  ;

  beforeAll(function(done) {
    async.waterfall([
      function(cb) {
        TestNode.import({
          name: 'root',
          children: [{
            name: 'c1', 
            children: [{name: 'c11', children: []}]
          }, {
            name: 'c2', 
            children: [{name: 'c21', children: []}]
          }]
        }, cb);       
      },
      function(result) {
        let cb = _.last(arguments);
        TestNode.find({_id: {$in: result.insertedIds}}, cb);
      },
      function(nodes) {
        let cb = _.last(arguments);
        _.each(nodes, function(node) {
          nodesMap[node.name] = node;
        });
        cb(null, nodes);
      }
    ], function(err) {
      if (err) {
        console.log(err);
      }
      done();
    });
  });

  it('import', function() {
    let root = nodesMap.root
      , c1 = nodesMap.c1
      , c11 = nodesMap.c11
      , c2 = nodesMap.c2
    ;
    expect(root.ancestors).toEqual([]);
    expect(root.children).toEqual([c1._id, c2._id]);
    expect(c1.ancestors).toEqual([root._id]);
    expect(c1.children).toEqual([c11._id]);
    expect(c11.ancestors).toEqual([root._id, c1._id]);
    expect(c2.ancestors).toEqual([root._id]);
  });

  it('import edge case', function(done) {
    let nodesData = TestNode.import({}, function(err, result) {
      expect(result.result).toEqual({ok: 1, n: 1});
      done();
    });
  });

  it('getPrev', function(done) {
    let root = nodesMap.root
      , c1 = nodesMap.c1
      , c2 = nodesMap.c2
    ;
    async.parallel([
      function(cb) {
        TestNode.getPrev(root._id, function(err, node) {
          expect(node).toBe(null);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getPrev(c1._id, function(err, node) {
          expect(node).toBe(null);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getPrev(c2._id, function(err, node) {
          expect(node._id).toEqual(c1._id);
          cb(null);
        });
      },
    ], function() {
      done();
    });
  });

  it('getNext', function(done) {
    let root = nodesMap.root
      , c1 = nodesMap.c1
      , c2 = nodesMap.c2
    ;
    async.parallel([
      function(cb) {
        TestNode.getNext(root._id, function(err, node) {
          expect(node).toBe(null);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getNext(c1._id, function(err, node) {
          expect(node._id).toEqual(c2._id);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getNext(c2._id, function(err, node) {
          expect(node).toEqual(null);
          cb(null);
        });
      },
    ], function() {
      done();
    });
  });

  it('getDeepNextLeaf', function(done) {
    let root = nodesMap.root
      , c1 = nodesMap.c1
      , c11 = nodesMap.c11
      , c2 = nodesMap.c2
      , c21 = nodesMap.c21
    ;
    async.parallel([
      function(cb) {
        TestNode.getDeepNextLeaf(root._id, function(err, node) {
          expect(node).toEqual(null);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getDeepNextLeaf(c1._id, function(err, node) {
          expect(node._id).toEqual(c21._id);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getDeepNextLeaf(c2._id, function(err, node) {
          expect(node).toEqual(null);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getDeepNextLeaf(c11._id, function(err, node) {
          expect(node._id).toEqual(c21._id);
          cb(null);
        });
      },
    ], function() {
      done();
    });
  });

  it('getDeepPrevLeaf', function(done) {
    let root = nodesMap.root
      , c1 = nodesMap.c1
      , c11 = nodesMap.c11
      , c2 = nodesMap.c2
      , c21 = nodesMap.c21
    ;
    async.parallel([
      function(cb) {
        TestNode.getDeepPrevLeaf(root._id, function(err, node) {
          expect(node).toEqual(null);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getDeepPrevLeaf(c1._id, function(err, node) {
          expect(node).toEqual(null);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getDeepPrevLeaf(c2._id, function(err, node) {
          expect(node._id).toEqual(c11._id);
          cb(null);
        });
      },
      function(cb) {
        TestNode.getDeepPrevLeaf(c21._id, function(err, node) {
          expect(node._id).toEqual(c11._id);
          cb(null);
        });
      },
    ], function() {
      done();
    });
  });

  it('orderLeaves', function(done) {
    let root = nodesMap.root
      , c1 = nodesMap.c1
      , c11 = nodesMap.c11
      , c2 = nodesMap.c2
      , c21 = nodesMap.c21
    ;
    async.parallel([
      function(cb) {
        TestNode.orderLeaves([c21, c11], function(err, ordered) {
          expect(ordered[0]._id).toEqual(c11._id);
          expect(ordered[1]._id).toEqual(c21._id);
          cb(null);
        });
      },
      function(cb) {
        TestNode.orderLeaves([c11, c21], function(err, ordered) {
          expect(ordered[0]._id).toEqual(c11._id);
          expect(ordered[1]._id).toEqual(c21._id);
          cb(null);
        });
      },
      function(cb) {
        TestNode.orderLeaves([c21, c21, c1, c11], function(err, ordered) {
          expect(ordered[0]._id).toEqual(c11._id);
          expect(ordered[1]._id).toEqual(c21._id);
          expect(ordered.length).toEqual(2);
          cb(null);
        });
      }
    ], function(err) {
      done();
    });
  });


  it('getTreeFromLeaves', function() {
    // {_id: {$in: ancestors}}
    expect(true).toBe(true);
  });

  it('replaceNodesBetween', function() {
    expect(true).toBe(true);
  });
  it('getNodesBetween', function() {
    expect(true).toBe(true);
  });
  it('getOutterBound', function() {
    expect(true).toBe(true);
  });
  it('getFirstLeaf', function() {
    expect(true).toBe(true);
  });
});

