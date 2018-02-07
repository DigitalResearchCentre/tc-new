var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , config = require('./config')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var ChangeRoleComponent = ng.core.Component({
  selector: 'tc-managemodal-change-role',
  templateUrl: '/app/changerole.html',
  inputs : ['member', 'user', 'role', 'community'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, UIService, function(
      communityService, uiService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    $('#manageModal').width("500px");
    $('#manageModal').height("300px");
    this.success="";
    this.communityService=communityService;
    this.uiService = uiService;
    this.community = uiService.community;
    }],
  ngOnInit: function() {
      var self = this;
      this.origrole=this.role;
  },
  choose: function(choice) {
      this.role=choice;
      this.success="";
      $('#manageModal').height("300px");
      this.member.role=choice;
  },
  submit: function(){
    var self=this;
    if (this.role!=this.origrole) {
      $.post(config.BACKEND_URL+'changeRole?'+'id='+this.member._id+'&role='+this.role, function(res) {
        $('#manageModal').height("350px");
        self.success="Role saved";
        self.origrole=self.role;
      });
    };
  },
  closeModalCR: function() {
    this.success="";
    this.member.role=this.origrole;
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});


module.exports = ChangeRoleComponent;
