var Observable = Rx.Observable
  , Http = ng.http.Http
  , Inject = ng.core.Inject
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , RESTService = require('./rest.service')
  , AuthService = require('./auth.service')
  , Community = require('./models/community')
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
  },
  get: function(id) {
    return new Community({_id: id});
  },
  create: function(attrs) {
    return new Community(attrs);
  },
});


module.exports = CommunityService;

