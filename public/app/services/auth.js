var Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , Inject = ng.core.Inject
  , RESTService = require('./rest')
  , UIService = require('./ui')
  , CommunityService = require('./community')
  , User = require('../models/user')
  , Rx = require('rxjs')
;

var AuthService = ng.core.Class({
  extends: RESTService,
  constructor: [Http, UIService, CommunityService,
    function(http, uiService, communityService){
    var self = this;
    RESTService.call(this, http);
    this.resourceUrl = 'auth';

    this._uiService = uiService;
    this._communityService = communityService;

    uiService.authService$.subscribe(function(event) {
      if (event.type === 'refreshAuthUser') {
        self.refreshAuthUser().subscribe();
      }
    })
  }],
  modelClass: function() {
    return User;
  },
  refreshAuthUser: function() {
    var uiService = this._uiService
      , communityService = this._communityService;
    ;
    return this.detail(null, {
      search: {
        populate: JSON.stringify('memberships.community'),
      },
    }).map(function(authUser) {
      if (uiService.state.authUser !== authUser) {
        if (authUser) {
          var memberships = _.get(authUser, 'attrs.memberships', []);
          if (memberships.length === 1) {
            communityService.selectCommunity(_.get(memberships, '0.community'));
          }
          uiService.setState(
            'myCommunities', 
            _.map(memberships, function(membership) {
              return membership.community;
            })
          );
        }
        uiService.setState('authUser', authUser);
      }
      return authUser;
    });
  },
  refresh: function() {
    this._refresh.next(null);
  },
  logout: function() {
    var self = this;
    this.http.get('/auth/logout/').subscribe(function() {
      self.refreshAuthUser().subscribe();
    });
  },
});


module.exports = AuthService;


