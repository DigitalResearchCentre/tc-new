var AuthService = require('./auth.service')
    , CommunityService = require('./services/community')
    , UIService = require('./ui.service')
    , URI = require('urijs')
    , AuthService = require('./auth.service')
    , RESTService = require('./rest.service')
    , config = require('./config')
    , base64url = require('base64url')
    , crypto = require('crypto');

function randomStringAsBase64Url(size) {
      return base64url(crypto.randomBytes(size));
    }

var MemberProfileComponent = ng.core.Component({
  selector: 'tc-member-profile',
  templateUrl: '/app/memberprofile.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
  ],
}).Class({
  constructor: [AuthService, CommunityService, UIService, RESTService, function(authService, communityService, uiService, restService) {
    var self=this;
    this.communityService = communityService;
    this.uiService=uiService;
    this.restService=restService;
    this.authUser = authService._authUser;
    this.nmemberships= authService._authUser.attrs.memberships.length;
    this.memberships= authService._authUser.attrs.memberships;
    this.communityleader={email:"peter.robinson@usask.ca", name:"Peter Robinson"}
    this.communityService.allCommunities$.subscribe(function(communities) {
      console.log(communities);
      self.joinableCommunities = _.filter(
        communities, self.showCommunity.bind(self));
    });

  }],
  formatDate: function(rawdate) {
    var date = new Date(rawdate)
    return date.toDateString()
  },
  loadModal: function(which) {
    this.uiService.manageModal$.emit(which);
  },
  joinCommunity: function(community) {
    var self = this;
    self.communityService.getMemberships(community)
      .subscribe(function(memberships) {
        console.log(memberships);
        self.restService.http.get('/app/joinletter.ejs').subscribe(function(result) {
            var tpl=_.template(result._body);
            var messagetext=tpl({username: self.authUser.attrs.local.name, useremail: self.authUser.attrs.local.email, communityname: community.attrs.name, communityowner: self.communityleader.name})
            self.restService.http.post(
              config.BACKEND_URL + 'sendmail',
              JSON.stringify({
                from: self.communityleader.email,
                to: self.authUser.attrs.local.email,
                subject: 'Your application to join Textual Community "' +
                  community.attrs.name+'"',
                html: messagetext,
                text: messagetext.replace(/<[^>]*>/g, '')
              }),
              self.restService.prepareOptions({})
            ).subscribe(function(res) {
              console.log('send mail success');
            });
          }, function(err) {
            console.log(err);
          });
      self.restService.http.post(
        config.BACKEND_URL + 'actions', 
        JSON.stringify({
          type: 'request-membership',
          payload: {
            user: self.authUser.getId(),
            community: community.getId(),
            role: 'MEMBER',
          }
        }),
        self.restService.prepareOptions({})
      ).subscribe();
    });
//    this.uiService.manageModal$.emit({type:'join-community', community: community});
  },
  showCommunity: function(community) {
    if (this.nmemberships) {
      var matchedmem=this.memberships.filter(function (obj){
        return obj.community.attrs._id === community.attrs._id;
      })[0];
      if (matchedmem) return false;
    }
    if (!community.attrs.public) return false;
    if (!community.attrs.accept) return false;
    return true;
  }
});

module.exports = MemberProfileComponent;



