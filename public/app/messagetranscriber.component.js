var $ = require('jquery');
var UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , config = require('./config')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var MessageTranscriberComponent = ng.core.Component({
  selector: 'tc-managemodal-message-transcriber',
  templateUrl: '/app/messagetranscriber.html',
  inputs : ['approver', 'community','transcriberEmail', 'transcriberName', 'document', 'page', 'leaders', 'context'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [
    CommunityService, UIService, function(
      communityService, uiService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    $('#manageModal').width("600px");
    $('#manageModal').height("600px");
    this.communityService=communityService;
    this.uiService = uiService;
    this.state=uiService.state;
    this.letter="Your message here";
    this.reassignTranscript=true;
    this.copyToLeaders=false;
    }],
  ngOnInit: function() {
    for (var i=0; i<this.leaders.length; i++) {
      this.leaders[i].sendMail=false;
    }
  },
  submit: function(){
    var self=this;
    var transcriberId;
    if (this.reassignTranscript) {
      for (var i=0; i<this.page.attrs.tasks.length; i++) {
        if (this.page.attrs.tasks[i].status=="SUBMITTED") {
          if (String(this.state.authUser.attrs._id)==String(this.page.attrs.tasks[i].userId)) this.page.attrs.tasks.splice(i,1);
          else {
            this.page.attrs.tasks[i].status="ASSIGNED";
            transcriberId=this.page.attrs.tasks[i].userId;
          }
        }
      }
      this.context.pageStatus.status="IN_PROGRESS";
      $.post(config.BACKEND_URL+'returnTranscript?'+'pageId='+this.page.attrs._id+'&approverId='+this.state.authUser.attrs._id+'&transcriberId='+transcriberId+'&communityId='+this.community.attrs._id+'&docId='+this.document.attrs._id, function (res) {
            if (res.result=="1") {
            }
        });
    }
/*    $.post(config.BACKEND_URL+'returnTranscript?'+'pageId='+page.attrs._id+'&approverId='+this.state.authUser.attrs._id+'&transcriberId='+transcriberId+'&communityId='+this.community.attrs._id+'&docId='+document.attrs._id, function (res) {
      if (res.result=="1") {
      }
    }); */
    //send all the messages..
    $.ajax({
      url: config.BACKEND_URL+'sendTranscriberMessages',
      type: 'POST',
      data:  JSON.stringify({communityId:self.community._id, sendername: self.state.authUser.attrs.local.name, senderemail: self.state.authUser.attrs.local.email, name: self.transcriberName, email:self.transcriberEmail, pageName: self.page.attrs.name, pageId: self.page.attrs._id, docName: self.document.attrs.name, docId: self.document.attrs._id, leaders: self.leaders, letter:self.letter }),
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
    this.closeModalIM();
  },
  closeModalIM: function() {
      $('#manageModal').modal('hide');
  },
});


module.exports = MessageTranscriberComponent;
