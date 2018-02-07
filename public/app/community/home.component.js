var RouteParams = ng.router.RouteParams
  , RESTService = require('../services/rest')
  , CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , joinCommunity = require('../joinCommunity')
;

var CommunityHomeComponent = ng.core.Component({
  selector: 'tc-community-home',
  templateUrl: '/app/community/home.html',
}).Class({
  constructor: [RouteParams, CommunityService, UIService, RESTService, function(
    routeParams, communityService, uiService, restService
  ) {
//    console.log('community home');
    this._communityService = communityService;
    this._uiService = uiService;
    this._restService = restService;
    //if not logged in... nil
    this.state = uiService.state;
  }],
  joinCommunity: function(community) {
    return joinCommunity(
      community, this.state.authUser,
      this._communityService, this._uiService, this._restService
    );
  },
  logInIdiot: function() {
    this.uiService.manageModal$.emit({
      type:'message-login', community: this.state.community
    });
  },
  canJoin: function() {
    var state = this.state;
    return this._communityService.canJoin(state.community, state.authUser);
  },
  isLeader: function() {
    var state = this.state;
    return this._communityService.isLeader(state.community, state.authUser);
  },
  isMember: function() {
    var state = this.state;
    return this._communityService.isMember(state.community, state.authUser);
  },
  isCreator: function() {
    var state = this.state;
    return this._communityService.isCreator(state.community, state.authUser);
  },
});



module.exports = CommunityHomeComponent;
