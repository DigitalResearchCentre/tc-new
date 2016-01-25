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
  }],
  getPublicCommunities: function() {
    var self = this;
    if (!this._publicCommunities$) {
      var subject = new Rx.Subject();

      this._publicCommunities$ = this.list({
        search: {
          find: JSON.stringify({public: true}),
        },
      }).map(function(res) {
        return res.json();
      }).merge(subject).map(function(res) {
        return _.map(res, function(obj) {
          return self.updateCache(obj);
        });
      }).publishReplay(1).refCount();
    }
    return this._publicCommunities$;
  },
  getMyCommunities: function() {
    var self = this;
    return this._authService.getAuthUser().map(function(res) {
      return _.map(res.memberships, function(membership) {
        return self.updateCache(membership.community);
      });
    }).publishReplay(1).refCount();
  },
  getCommunity: function(id) {
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
        this.detail(community._id).subscribe(function(res) {
          self.updateCache(res);
          obs.next(res);
          obs.complete();
        });
      }
    }).publishReplay(1).refCount();
  },
});

module.exports = CommunityService;
