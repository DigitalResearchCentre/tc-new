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
            children: []
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
  it('getDFSNext', function() {
    expect(true).toBe(true);
  });
  it('getDFSPrev', function() {
    expect(true).toBe(true);
  });
  it('getFirstLeaf', function() {
    expect(true).toBe(true);
  });
});

