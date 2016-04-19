const _ = require('lodash');

describe('lodash mixin test', function() {

  it('dfs should iterate base deep first search order', function() {
    let result = ''
    function concat(s) {
      result += s;
    }

    _.dfs(['a', 'b', 'c'], concat);
    expect(result).toBe('abc');

    result = '';
    _.dfs([{
      name: 'a',
      children: [
        {name: 'a1', children: [{name: 'a11'}]},
        {name: 'a2'},
        {name: 'a3', children: [{name: 'a31'}, {name: 'a32', children: []}]},
      ]
    }], function(node) {
      concat(node.name);
    });
    expect(result).toBe('aa1a11a2a3a31a32');
  });

  it('dfs should stop when fn return false', function() {
    let result = ''
    function concat(s) {
      if (s === '!') {
        return false;
      }
      result += s;
    }

    _.dfs(['a', 'b', '!', 'c'], concat);
    expect(result).toBe('ab');
  });

  it('dfs should skip null/undefined/false node', function() {
    let result = ''
    function concat(s) {
      result += s || '';
    }

    _.dfs([null, 'a', 'b'], concat);
    expect(result).toBe('ab');
  });

});

