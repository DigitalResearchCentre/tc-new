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
  }],
  modelClass: function() {
    return User;
  },
  refreshAuthUser: function() {
    var uiService = this._uiService
      , communityService = this._communityService;
    ;
    this.detail(null, {
      search: {
        populate: JSON.stringify('memberships.community'),
      },
    }).subscribe(function(authUser) {
      if (uiService.state.authUser !== authUser) {
        if (authUser) {
          var memberships = _.get(authUser, 'attrs.memberships', []);
          if (memberships.length === 1) {
            communityService.setCommunity(_.get(memberships, '0.community'));
          }
        }
        uiService.setState('authUser', authUser);
      }
    });
  },
  refresh: function() {
    this._refresh.next(null);
  },
  logout: function() {
    var refresh = this._refresh;
    this.http.get('/auth/logout/').subscribe(function() {
      refresh.next(null);
    });
  },
});


module.exports = AuthService;


