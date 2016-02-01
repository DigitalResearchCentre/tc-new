var EventEmitter = ng.core.EventEmitter;

var UIService = ng.core.Class({
  constructor: [function(){

    this.loginModel$ = new EventEmitter();
    this.manageModel$ = new EventEmitter();
    this.communitySubject = new EventEmitter();
    this.community$ = this.communitySubject.publishReplay(1).refCount();
  }],
});

module.exports = UIService;
