var EventEmitter = ng.core.EventEmitter;

var UIService = ng.core.Class({
  constructor: [function(){

    var self = this;
    this.state = {
      authUser: null,
      community: null,
      document: null,
      page: null,
      publicCommunities: [],
    };
    this.loginModel$ = new EventEmitter();
    this.manageModal$ = new EventEmitter();
    this.newPage$ = new EventEmitter();
    this.sendCommand$ = new EventEmitter();
    this.sendXMLData$ = new EventEmitter();
    this._communitySubject = new EventEmitter();

    this.community = null;
    window.state = this.state;
  }],
  setState: function(key, value) {
    return _.set(this.state, key, value);
  },
  loginRequired: function() {
    if (!this.state.authUser) {
      this.loginModel$.emit('show');
    }
  },
  createCommunity: function(community) {
    this.setState('community', community);
    this.publicCommunities.push(community);
  },
});

module.exports = UIService;


