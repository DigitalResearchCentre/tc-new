var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
  , TCService = require('./tc')
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var EditNewPageComponent = ng.core.Component({
  selector: 'tc-managemodal-edit-new-page',
  templateUrl: '/app/editnewpage.html',
  directives: [
    require('../directives/modaldraggable')
  ],
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(communityService, authService, uiService) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.entity = {name:""};
    $('#manageModal').width("400px");
    $('#manageModal').height("600px");
    this.message="";
    this.success="";
    this.text="";
    this.uiService = uiService;
    this._communityService = communityService;
  }],
  submit: function() {
    var self = this;
    if (this.doc.name === undefined || this.doc.name.trim() === "" ) {
      this.message = 'The document must have a name';
      $('#MMADdiv').css("margin-top", "0px");
      $('#MMADbutton').css("margin-top", "10px");
      return;
    }
    if (!this.text && !this.filecontent) {
      this.message = 'Either paste text into the text box or choose a file';
      return;
    }
    this.doc.text=this.text || this.filecontent;
    this._communityService.addDocument(this.uiService.community, this.doc)
      .subscribe(function(doc) {
        self.closeModalADX();
      }, function(err) {
        self.message = err.message;
      });
  },
  closeModalNP: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  }
});

module.exports = EditNewPageComponent;
