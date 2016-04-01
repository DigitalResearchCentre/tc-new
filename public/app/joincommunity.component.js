var $ = require('jquery');
var UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
/*  , TCMailer=require('./TCMailer')
  , TCAddresses=require('./TCMailer').addresses; */

;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var JoinCommunityComponent = ng.core.Component({
  selector: 'tc-managemodal-join-community',
  templateUrl: '/app/joincommunity.html',
  inputs : ['joiningcommunity', 'communityleader', 'status'],
  directives: [
    require('../directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, AuthService, UIService, function(
      communityService, authService, uiService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:""};
    $('#manageModal').width("300px");
    $('#manageModal').height("300px");
    this.message="";
    this.success="";
    this.communityService=communityService;
    this.uiService = uiService;
    this.community = uiService.community;
    this.authUser = authService._authUser;
    this.communityleader={email:"peter.robinson@usask.ca", name:"Peter Robinson"}
    }],
  ngOnInit: function() {
      var self = this;
  },
  closeModalJC: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});


module.exports = JoinCommunityComponent;
