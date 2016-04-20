var $ = require('jquery');
var URI = require('urijs')
  , Router = ng.router.Router
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , AuthService = require('./services/auth')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AddDocumentComponent = ng.core.Component({
  selector: 'tc-managemodal-adddocument',
  templateUrl: '/app/adddocument.html',
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [Router, DocService, AuthService, UIService, function(
    router, docService, authService, uiService
  ) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:"", label: 'text'};
    $('#manageModal').width("350px");
    $('#manageModal').height("188px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this._docService = docService;
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
    } else if (self.alreadyDoc(uiService.community, self.doc.name.trim())){
        self.message='Document "'+self.doc.name+' "already exists';
        return;
    } else {
        this._docService.commit({
          doc: this.doc,
        }, {
          community: uiService.community.getId(),
        }).subscribe(function(doc) {
          $('#MMADdiv').css("margin-top", "0px");
          $('#MMADbutton').css("margin-top", "10px");
          //tell the system we have this document as current
          uiService.setDocument(doc);
          self._router.navigate(['Community', {
            id: uiService.community.getId(), route: 'view'
          }]);
          self.closeModalAD();
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
  },
  alreadyDoc: function(community, docname) {
    if (community.attrs.documents.length>0) {
      var matcheddoc=community.attrs.documents.filter(function (obj){return obj.attrs.name === docname;})[0];
      if (matcheddoc) return true;
      else return false;
    } else {
      return false;
    }
    var bill="1"
  }
});

module.exports = AddDocumentComponent;
