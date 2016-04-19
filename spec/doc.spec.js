const _ = require('lodash')
  , mongoose = require('mongoose')
  , async = require('async')
  , ObjectId = mongoose.Types.ObjectId
  , Doc = require('../models/doc')
;

describe('Doc test', function() {
  const nodesMap = {};

  beforeAll(function(done) {
    async.waterfall([
      function(cb) {
        let doc = new Doc({label: 'text', name: 'd1'});
        doc.save(cb);
      },
      function(doc) {
        const cb = _.last(arguments);
        doc.commit({
          tei: {},
          doc: {},
        }, cb);
      },
    ], function(err) {
      if (err) {
        console.log(err);
      }
      done();
    });
  });

  it('test', function() {
    
  });

});

