var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
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
  directives: [
    require('../directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, AuthService, UIService, function(
      communityService, authService, uiService
    ) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:""};
    $('#manageModal').width("400px");
    $('#manageModal').height("400px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.authUser = authService._authUser;

  }],
  closeModalJC: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  }
});

module.exports = JoinCommunityComponent;
