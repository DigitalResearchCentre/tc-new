var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
  , RESTService = require('./rest.service')
  , config = require('./config')
/*  , TCMailer=require('./TCMailer')
  , TCAddresses=require('./TCMailer').addresses; */

;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');
function example(communityService, community, user) {
  communityService.addMember(community, user, 'MEMBER')
    .subscribe(function(updatedUser){
      console.log(updatedUser);
    });
}

var JoinCommunityComponent = ng.core.Component({
  selector: 'tc-managemodal-join-community',
  templateUrl: '/app/joincommunity.html',
  directives: [
    require('../directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, AuthService, UIService, RESTService, function(
      communityService, authService, uiService, restService
    ) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:""};
    $('#manageModal').width("400px");
    $('#manageModal').height("400px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.community = uiService.community
    this.authUser = authService._authUser;
    this.communityleader={email:"peter.robinson@usask.ca"}

    communityService.getMemberships(this.community)
      .subscribe(function(memberships) {
        console.log(memberships);
      });

    restService.http.get('/app/joinletter.ejs').subscribe(function(result) {
        var tpl=_.template(result._body);
        var messagetext=tpl({username: self.authUser.attrs.local.name, useremail: self.authUser.attrs.local.name, communityname: self.community.attrs.name})
        restService.http.post(config.BACKEND_URL + 'sendmail', {
          from: self.communityleader.email,
          to: self.authUser.attrs.local.email,
          subject: 'Your application to join Textual Community "'+self.community.attrs.name+'"',
          html: messagetext,
          text: messagetext.replace(/<[^>]*>/g, '')
        }).subscribe(function(res) {
          console.log('send mail success');
        });
      }, function(err) {
        console.log(err);
      });
    }],
  closeModalJC: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});

module.exports = JoinCommunityComponent;
