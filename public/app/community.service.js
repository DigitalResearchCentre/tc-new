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
  }],
  getMyCommunities: function() {
    return this._authService.getAuthUserCommunities();
  },
  getPublicCommunities: function() {
    if (!this._publicCommunities$) {
      var subject = new Rx.Subject();

      this._publicCommunities$ = this.list({
        search: {
          find: JSON.stringify({public: true}),
        },
      }).map(function(res) {
        return res.json();
      }).merge(subject).map(function(r) {
        return r;
      }).publishReplay(1).refCount();
    }
    return this._publicCommunities$;
  },
});

module.exports = CommunityService;


