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
  ;

  it('import', function(done) {
    let nodesData = TestNode.import({
      name: 'root',
      children: [{
        name: 'c1', 
        children: [{name: 'c11', children: []}]
      }, {
        name: 'c2', 
        children: []
      }]
    }, function(err, result) {
      expect(err).toBe(null);
      expect(result.result).toEqual({ok: 1, n: 4});

      TestNode.find({_id: {$in: result.insertedIds}}, function(err, nodes) {
        let nodesMap = _.fromPairs(_.map(nodes, function(node) {
          return [node.name, node];
        }));
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
        done();
      });
    });
  });

  it('import edge case', function(done) {
    let nodesData = TestNode.import({}, function(err, result) {
      expect(result.result).toEqual({ok: 1, n: 1});
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
  it('getPrev', function() {
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

