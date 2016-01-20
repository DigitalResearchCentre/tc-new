var S1 = ng.core.Class({
  constructor: function() {
    this.hello = 'foo';
  },
});


var TCService = ng.core.Injectable({
  providers: [S1],
}).Class({
  providers: [S1],
  constructor: [S1, function(s1) {
    this.foo = 'bar';
    window.c = ng.core;
  }],
});

module.exports = TCService;


