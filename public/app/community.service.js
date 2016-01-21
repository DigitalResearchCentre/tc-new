var Observable = Rx.Observable
  , Http = ng.http.Http
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('./rest.service')
  , AuthService = require('./auth.service')
;

var CommunityService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, AuthService, function(http, authService){
    var self = this;
    RESTService.call(this, http);

    this.resourceUrl = 'communities';

    this._authService = authService;
    this._publicCommunitiesSource = new EventEmitter();
  }],
  getMyCommunities: function() {
    return this._authService.getAuthUserCommunities();
  },
  getPublicCommunities: function() {
    var subject = new Rx.Subject();
    window.store = {
      up: function(x) {
        subject.next(x);
      }
    };

    return window.ll = this.list({
      search: {
        find: JSON.stringify({public: true}),
      },
    }).map(function(res) {
      return res.json();
    }).publishReplay(1).refCount;
  },
});

module.exports = CommunityService;


