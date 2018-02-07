var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , config = require('./config')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AssignApproverComponent = ng.core.Component({
  selector: 'tc-managemodal-assign-approver',
  templateUrl: '/app/assignapprover.html',
  inputs : ['member', 'user'],
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
    this.community = uiService.state.community;
    this.approvers = [];
    }],
  ngOnInit: function() {
      this.origapprovername=this.member.approvername;
      this.origapprovermail=this.member.approvermail;
      var self = this;
        $.post(config.BACKEND_URL+'getApprovers?'+'community='+this.community.attrs._id, function(res) {
        var approvers=[];
        for (i=0; i<res.length; i++) {
          for (j=0; j<res[i].memberships.length; j++) {
            if (res[i].memberships[j].community==self.community.attrs._id) {
              approvers.push({name: res[i].local.name, userid: res[i]._id, email: res[i].local.email, role: res[i].memberships[j].role, id:res[i].memberships[j]._id});
            }
          }
        }
        self.approvers=approvers;
      });
  },
  choose: function(approver) {
      this.success="";
      this.member.approvername=approver.name;
      this.member.approvermail=approver.email;
      this.member.approverid=approver.userid;
  },
  submit: function(){
    var self=this;
    if (this.member.approvername!=this.origapprovername) {
      $.post(config.BACKEND_URL+'changeApprover?'+'memberId='+this.member._id+'&userId='+this.member.approverid, function(res) {
        $('#manageModal').height("350px");
        self.success="Approver saved";
        self.origapprovername=self.member.approvername;
        self.origapprovermail=self.member.approvermail;
    });
    };
  },
  closeModalCR: function() {
    this.success="";
    this.member.approvername=this.origapprovername;
    this.member.approvermail=this.origapprovermail;
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});


module.exports = AssignApproverComponent;
