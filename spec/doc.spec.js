const _ = require('lodash')
  , mongoose = require('mongoose')
  , async = require('async')
  , ObjectId = mongoose.Types.ObjectId
  , Doc = require('../models/doc')
  , TEI = require('../models/tei')
  , libxml = require('libxmljs')
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
        attrs: {testId: 'test-4', n: '1r'},
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
          testId: 'test-10', n: '1v',
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
        attrs: {testId: 'test-19', n: '2r'},
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
}

describe('Doc test', function() {
  const nodesMap = {}
    , textsMap = {}
    , d1 = new Doc({label: 'text', name: 'd1'})
    , docIds = [d1._id, new ObjectId(), new ObjectId(), new ObjectId()]
  ;
  let pb1r, pb1v, pb2r;

  function expectNode(testId, opts) {
    expect(textsMap[testId].name).toBe(opts.name);
    expect(textsMap[testId].attrs).toEqual(opts.attrs);
    expect(textsMap[testId].ancestors).toEqual(opts.ancestors);
  }

  beforeAll(function(done) {
    var tei = _.cloneDeep(TEST_TEI);
    async.waterfall([
      function(cb) {
        d1.save(cb);
      },
      function(doc) {
        const cb = _.last(arguments);
        let i = 0;

        // simulate client behavior, preset doc id for pb elements
        _.dfs([tei], function(node) {
          if (node.name === 'pb') {
            i += 1;
          }
          node.doc = docIds[i];
        });

        doc.commit({
          tei: tei,
          doc: {
            children: [{
              name: '1r',
              label: 'pb',
              _id: docIds[1],
            }, {
              name: '1v',
              label: 'pb',
              _id: docIds[2],
            }, {
              name: '2r',
              label: 'pb',
              _id: docIds[3],
            }],
          },
        }, cb);
      },
    ], function(err) {
      async.parallel([
        function(cb) {
          Doc.findOne({_id: docIds[1]}, cb);
        },
        function(cb) {
          Doc.findOne({_id: docIds[2]}, cb);
        },
        function(cb) {
          Doc.findOne({_id: docIds[3]}, cb);
        },
      ], function(err, results) {
        pb1r = results[0];
        pb1v = results[1];
        pb2r = results[2];
        done();
      })
    });
  });

  it('commit to a new root document', function(done) {
    async.waterfall([
      function(cb) {
        Doc.getTextsLeaves(d1._id, cb);
      },
      function(texts) {
        const cb = _.last(arguments);
        _.each(texts, function(text) {
          textsMap[text.attrs.testId] = text;
        });
        TEI.getAncestorsFromLeaves(texts, cb);
      },
      function(ancestors) {
        const cb = _.last(arguments);
         _.each(ancestors, function(text) {
          textsMap[text.attrs.testId] = text;
        });
        cb(null);
      }
    ], function(err) {
      expect(pb1r.ancestors).toEqual([d1._id]);
      expect(pb1v.ancestors).toEqual([d1._id]);
      expect(pb2r.ancestors).toEqual([d1._id]);
      expect(d1.children).toEqual([pb1r._id, pb1v._id, pb2r._id]);
      expectNode('test-1', {
        name: 'text', attrs: {testId: 'test-1'},
        ancestors: [],
        children: _.map(_.pick(textsMap, ['test-2']), function(text) {
          return text._id;
        }),
      });
      expectNode('test-2', {
        name: 'body', attrs: {testId: 'test-2'},
        ancestors: [textsMap['test-1']._id],
        children: _.map(_.pick(textsMap, ['test-3', 'test-13']), function(text){
          return text._id;
        }),
      });
      expectNode('test-3', {
        name: 'div', attrs: {testId: 'test-3', type: 'G', n: 'GP',},
        ancestors: textsMap['test-2'].ancestors.concat(textsMap['test-2']._id) ,
        children: _.map(_.pick(textsMap, [
          'test-4', 'test-5', 'test-6', 'test-8', 'test-10', 'test-11',
        ]), function(text){
          return text._id;
        }),
      });
      done();
    });
  });

  it('should create a connected tei if tei is empty', function(done) {
    async.waterfall([
      function(cb) {
        pb2r.commit({doc: {}}, cb);
      },
      function() {
        const cb = _.last(arguments);
        Doc.getTextsLeaves(pb2r._id, cb);
      },
      function(leaves) {
        const cb = _.last(arguments);
        expect(leaves.length).toBe(2);
        expect(_.get(leaves[0], 'name')).toBe('pb');
        cb(null);
      }
    ], function() {
      done();
    });
  });

  it('commit to an existing page document', function(done) {
    let lb1 = new Doc();
    pb1v.commit({
      tei: {
        name: 'text',
        children: [{
          name: 'body',
          children: [{
            name: 'div',
            attrs: {n: 'GP'},
            children: [{
              name: 'l',
              attrs: {n: '2'},
              children: [{
                name: 'pb',
                doc: pb1v._id,
                attrs: {
                  n: '1v',
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
            doc: pb1v._id,
            attrs: {n: 'GP1', testId: 'test-13'},
            children: [{
              name: 'lb',
              doc: lb1._id,
              attrs: {testId: 'test-14'},
              children: [],
            }, {
              name: 'l',
              doc: lb1._id,
              attrs: {n: '1', testId: 'test-15'},
              children: [{
                name: '#text',
                attrs: {testId: 'test-16'},
                doc: lb1._id,
                text: 'hello world again',
              }],
            }, {
              name: 'l',
              doc: lb1._id,
              attrs: {n: '2', testId: 'test-17'},
              children: [{
                name: '#text',
                attrs: {testId: 'test-18'},
                doc: lb1._id,
                text: 'foo bar again',
              }],
            }]
          }]
        }]
      },
      doc: {
        children: [{_id: lb1._id, name: '1', label: 'lb'}],
      }
    }, function(err) {
      TEI.find({docs: pb1v._id}).exec(function(err, nodes) {
        expect(nodes.length).toBe(10);
        done();
      });
    });
  });

});
