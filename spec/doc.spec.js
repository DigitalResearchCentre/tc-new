const _ = require('lodash')
  , mongoose = require('mongoose')
  , async = require('async')
  , ObjectId = mongoose.Types.ObjectId
  , Doc = require('../models/doc')
  , TEI = require('../models/tei')
;

const TEST_TEI = {
  name: 'text',
  attrs: {
    testId: 'test-1',
    n: 'd1',
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
}

describe('Doc test', function() {
  const nodesMap = {};
  let d1;

  beforeAll(function(done) {
    var tei = _.cloneDeep(TEST_TEI);
    async.waterfall([
      function(cb) {
        d1 = new Doc({label: 'text', name: 'd1'});
        d1.save(cb);
      },
      function(doc) {
        const cb = _.last(arguments)
          , docIds = [doc._id, new ObjectId(), new ObjectId(), new ObjectId()]
        ;
        let i = 0;

        // simulate client behavior, preset doc id for pb elements
        _.dfs([tei], function(node) {
          node.doc = docIds[i];
          if (node.name === 'pb') {
            i += 1;
          }
        });

        doc.commit({
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
        }, cb);
      },
    ], function(err) {
      if (err) {
        console.log(err);
      }
      done();
    });
  });

  it('test', function(done) {
    const textsMap = {};
    function expectNode(testId, opts) {
      console.log(testId);
      expect(textsMap[testId].name).toBe(opts.name);
      expect(textsMap[testId].attrs).toEqual(opts.attrs);
      expect(textsMap[testId].ancestors).toEqual(opts.ancestors);
    }
    async.waterfall([
      function(cb) {
        Doc.getTexts(d1._id, cb);
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
      expectNode('test-1', {
        name: 'text', attrs: {testId: 'test-1', n: 'd1'},
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
});


