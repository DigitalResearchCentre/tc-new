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
  dfs: function (node, fn) {
    var queue = []
      , cur
    ;
    queue.push(node);
    while(queue.length > 0) {
      cur = queue.pop();
      fn(cur);
      _.forEachRight(cur.children, _.bind(queue.push, queue));
    }
  },
});

module.exports = _;

