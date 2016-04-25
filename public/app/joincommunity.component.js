var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var JoinCommunityComponent = ng.core.Component({
  selector: 'tc-managemodal-join-community',
  templateUrl: '/app/joincommunity.html',
  inputs : ['joiningcommunity', 'communityleader', 'status'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, UIService, function(
      communityService, uiService
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
