var Observable = Rx.Observable
  , Http = ng.http.Http
  , Inject = ng.core.Inject
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('./rest.service')
  , AuthService = require('./auth.service')
;

var CommunityService = ng.core.Injectable().Class({
  extends: RESTService,
  constructor: [Http, AuthService, function(http, authService){
    var self = this;
    RESTService.call(this, http);

    this._authService = authService;

    this.resourceUrl = 'communities';

    this.initEventEmitters();
  }],
  initEventEmitters: function() {
    var self = this;
    this.publicCommunities$ = this
      .list({
        search: {
          find: JSON.stringify({public: true}),
        },
      })
      .map(function(res) {
        return _.map(res.json(), function(obj) {
          return self.updateCache(obj);
        });
      })
      .publishReplay(1).refCount();

    this.myCommunities$ = this._authService.authUser$
      .map(function(res) {
        return _.map((res || {}).memberships, function(membership) {
          return self.updateCache(membership.community);
        });
      })
      .publishReplay(1).refCount();
  },
  getCommunity$: function(id) {
    var self = this;
    if (_.isObject(id)) {
      id = id._id;
    }
    return Observable.create(function(obs) {
      var community = self.getCache(id);
      if (community) {
        obs.next(community);
        obs.complete();
      } else {
        self.detail(id).subscribe(function(res) {
          self.updateCache(res);
          obs.next(res);
          obs.complete();
        });
      }
    }).publishReplay(1).refCount();
  },
});

module.exports = CommunityService;
