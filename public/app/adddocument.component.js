var $ = require('jquery');
var URI = require('urijs')
  , Router = ng.router.Router
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
  , TCService = require('./tc')
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AddDocumentComponent = ng.core.Component({
  selector: 'tc-managemodal-adddocument',
  templateUrl: '/app/adddocument.html',
  directives: [
    require('../directives/modaldraggable')
  ],
}).Class({
  constructor: [Router, CommunityService, AuthService, UIService, function(router, communityService, authService, uiService) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:""};
    $('#manageModal').width("350px");
    $('#manageModal').height("188px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this._communityService = communityService;
    this._router = router;
    /*this for scope variables */
  }],
  submit: function() {
    var self = this
      , uiService = this.uiService
    ;
    if (this.doc.name === undefined || this.doc.name.trim() === "" ) {
      this.message = 'The document must have a name';
      $('#MMADdiv').css("margin-top", "0px");
      $('#MMADbutton').css("margin-top", "10px");
    } else {
        this._communityService.addDocument(uiService.community, this.doc)
        .subscribe(function(doc) {
          console.log("loaded the doc");
          self.success="Document "+self.doc.name+" created.";
          $('#MMADdiv').css("margin-top", "0px");
          $('#MMADbutton').css("margin-top", "10px");
          //tell the system we have this document as current
          uiService.setDocument(this.doc)
          self._router.navigate(['Community', {
            id: uiService.community.getId(), route: 'view'
          }]);
  //        self.closeModalAD();
        }, function(err) {
          self.message = err.message;
        });
    }
  },
  closeModalAD: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  }
});

module.exports = AddDocumentComponent;
