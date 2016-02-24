var _ = require('lodash');

_.mixin({
  inherit: function(base, child, props, statics) {
    child.prototype = _.create(base.prototype, _.assign({
      _super: base.prototype,
      'constructor': child,
    }, props));

    child.statics = statics;
    _.assign(child, base.statics, statics);

    return child;
  },
  /*
   * @param queue - [treeNode]
   * @return queue - queue of unchecked nodes
   * dfs may exit iteration early by explicitly returning false
   */
  dfs: function (queue, fn) {
    var cur;
    while(queue.length > 0) {
      cur = queue.shift();
      fn(cur);
      _.forEachRight(cur.children, _.bind(queue.unshift, queue));
    }
    return queue;
  },
});

module.exports = _;


