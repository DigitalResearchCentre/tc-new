const _ = require('lodash')
  , mongoose = require('mongoose')
  , async = require('async')
  , ObjectId = mongoose.Types.ObjectId
//  , extendNodeSchema = require('../models/extend-node-schema')
;

describe('base node schema test', function() {
  const ModelName = 'TestNode'
//    , TestNodeSchema = extendNodeSchema(ModelName)
//    , TestNode = mongoose.model(ModelName, TestNodeSchema)
  ;


  it('import', function() {
    expect(true).toBe(false);
  });

  it('import', function() {
    expect(true).toBe(true);
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

