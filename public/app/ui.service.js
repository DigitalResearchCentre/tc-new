var EventEmitter = ng.core.EventEmitter;

var UIService = ng.core.Class({
  constructor: [function(){

    this.loginModel$ = new EventEmitter();
    this.community$ = new EventEmitter();
  }],
});

module.exports = UIService;

