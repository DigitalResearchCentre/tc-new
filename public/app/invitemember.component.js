var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , config = require('./config')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var InviteMemberComponent = ng.core.Component({
  selector: 'tc-managemodal-invite-member',
  templateUrl: '/app/invitemember.html',
  inputs : ['inviter', 'community'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, UIService, function(
      communityService, uiService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    $('#manageModal').width("700px");
    $('#manageModal').height("750px");
    this.success="";
    this.communityService=communityService;
    this.uiService = uiService;
    this.invitee={name:"Jane Doe", email:"jane.doe@someuniversity.edu"};
    this.preview="";
    }],
  ngOnInit: function() {
      this.letter = "I am writing to invite you to join the '"+this.community.attrs.name+"' textual community. You have been set up with a user account, linked to our community:</p>"
      this.letter += "<ul><li>Follow the link to <a href='"+config.host_url+"'>"+config.host_url+"</a></li><li>Click the <button style='color:white; background-color: #F19136'>Start</button> button</li><li>Choose 'Log in by email/password', and then log in with: "
      this.letter += "<br/>&nbsp;&nbsp;&nbsp;<i>log in</i>: your email address (as above)<br/>&nbsp;&nbsp;&nbsp;<i>password</i>: default</li></ul><p style='margin-left:15px'>You should change this password after logging in."
  },
  submit: function(){
    var self=this;
    var letterText=$('#InviteText').html();
    $.ajax({
      url: config.BACKEND_URL+'sendInvitation?'+'community='+self.community.attrs._id,
      type: 'POST',
      data:  JSON.stringify({name:self.invitee.name,email:self.invitee.email, letter: letterText, communityName: self.community.attrs.name, leaderEmail: self.inviter.attrs.local.email, leaderName: self.inviter.attrs.local.name}),
      accepts: 'application/json',
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    })
     .done(function( data ) {
       self.success=data.result;
      })
     .fail(function( jqXHR, textStatus, errorThrown) {
      alert( "error" + errorThrown );
    });
  },
  closeModalIM: function() {
    this.success="";
    $('#manageModal').modal('hide');
  },
});


module.exports = InviteMemberComponent;
