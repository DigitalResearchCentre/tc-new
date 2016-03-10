var Observable = Rx.Observable
  , Http = ng.http.Http
  , Inject = ng.core.Inject
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('../rest.service')
  , AuthService = require('../auth.service')
  , Community = require('../models/community')
  , Doc = require('../models/doc')
;

var CommunityService = ng.core.Injectable().Class({
  extends: RESTService,
  constructor: [
    Http, AuthService, function(http, authService){
    var self = this;
    RESTService.call(this, http);

    this._authService = authService;
    this.resourceUrl = 'communities';

    this.initEventEmitters();
  }],
  modelClass: function() {
    return Community;
  },
  initEventEmitters: function() {
    var self = this;
    this.publicCommunities$ = this
      .list({
        search: {
          find: JSON.stringify({public: true}),
        },
      })
      .publishReplay(1).refCount();
      this.allCommunities$ = this
        .list({})
        .publishReplay(1).refCount();
      this._authService.authUser$.subscribe(function(authUser) {
      self.authUser = authUser;
    });
  },
  get: function(id) {
    return new Community({_id: id});
  },
  getMemberships: function(community) {
    var self = this;
    return this.http.get(
      this.url({
        id: community.getId(),
        func: 'memberships',
      }), this.prepareOptions({})
    ).map(function(res) {
      return res.json();
    });
  },
  addDocument: function(community, doc) {
    var self = this;
    return this.http.put(
      this.url({
        id: community.getId(),
        func: 'add-document',
      }), JSON.stringify(doc), this.prepareOptions({})
    ).map(function(res) {
      self.fetch(community.getId(), {
        populate: JSON.stringify('documents entities')
      }).subscribe();
      return new Doc(res.json());
    });
  },
  create: function(data, options) {
    var authUser = this.authUser
      , authService = this._authService
    ;
    if (!authUser) {
      return Rx.Observable.throw(new Error('login required'));
    }
    data.user = authUser.getId();
    return RESTService.prototype.create.call(this, data, options)
      .do(function() {
        authService.refresh();
      });
  },
});

module.exports = CommunityService;
