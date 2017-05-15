var $ = require('jquery')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , config = require('./config')
;

var EditNewPageComponent = ng.core.Component({
  selector: 'tc-managemodal-edit-new-page',
  templateUrl: '/app/editnewpage.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/newpageprose.component'),
    require('./directives/newpagepoetry.component'),
    require('./directives/newpageplay.component'),
    require('./directives/newpageletter.component'),
    require('./directives/newpageplain.component'),
    require('./directives/newpageempty.component'),
    require('./directives/newpagectp.component'),
  ],
  inputs: [
    'context', 'page', 'document',
  ],
}).Class({
  constructor: [UIService, DocService, function(uiService, docService) {
    var self=this;
    this.uiService = uiService;
    this.docService = docService;
    this.entity = {name:"Moby Dick", sample:'"Moby Dick", "Oliver Twist"'};
    $('#manageModal').width("510px");
    $('#manageModal').height("600px");
    this.message=this.success="";
    this.community= uiService.state.community;
    this.choice="Prose";
//    this.revisions = [];
    this.state = uiService.state;
  }],
  submit: function() {
    //save the page as a revision, and commit it also
    var newPage=$("#NewDoc").text(), page = this.page, docService = this.docService,
      meta = _.get( page, 'attrs.meta',_.get(page.getParent(), 'attrs.meta')), self=this;
    this.context.contentText = newPage;
    this.closeModalNP();
    this.revisions=this.context.revisions;
    docService.addRevision({
      doc: page.getId(),
      text: newPage,
      user: meta.user,
      community: this.community,
      committed: meta.committed,
      status: 'NEWPAGETEMPLATE',
    }).subscribe(function(revision) {
      //propogate on parent page
      self.context.revisions=self.revisions;
      self.context.revisions.unshift(revision);
      self.context.revision=self.revision=revision;
      //if this is first page..we should remove temporary divs etc placed OUTSIDE pbs so they do not mess
      //up this new commit (temp divs there only to get skeleton pbs etc to parse)
      //now commit it also. Do this by sending a message to the viewer
      $.post(config.BACKEND_URL+'zeroDocument?'+'id='+self.document._id, function(res) {
        self.uiService.sendCommand$.emit("commitTranscript");
      });
    });
  },
  choose: function(choice) {
    switch (choice) {
      case "Prose":
          this.entity = {name:"Moby Dick", sample:'"Moby Dick", "Oliver Twist"'};
          break;
      case "Poetry":
          this.entity = {name:"Commedia", sample:'"Commedia", "The Prelude"'};
          break;
      case "Play":
          this.entity = {name:"Hamlet", sample:'"Hamlet", "The Doll House"'};
          break;
      case "CTP":
              this.entity = {name:"CT", sample:'The Canterbury Tales project'};
              break;
      case "Letter":
          this.entity = {name:"Letters", sample:'"His Letters", "Her Letters"'};
          break;
      case "Plain":
          this.entity = {name:"Plain text", sample:'""'};
          break;
      case "Empty":
          this.entity = {name:"Empty page", sample:'""'};
          break;
    }
    this.choice=choice;
  },
  closeModalNP: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  }
});

module.exports = EditNewPageComponent;
