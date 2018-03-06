var $ = require('jquery');
var URI = require('urijs')
  , Router = ng.router.Router
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
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
  constructor: [Router, DocService, UIService, function(
    router, docService, uiService
  ) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:"", label: 'text'};
    $('#manageModal').width("600px");
    $('#manageModal').height("188px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.state= uiService.state;
    this._docService = docService;
    this._router = router;
    /*this for scope variables */
    this.state = uiService.state;
  }],
  submit: function() {
    var self = this
      , uiService = this.uiService
      , docService = this._docService
      , community = this.state.community
    ;
    if (this.doc.name === undefined || this.doc.name.trim() === "" ) {
      this.message = 'The document must have a name';
      $('#MMADdiv').css("margin-top", "0px");
      $('#MMADbutton').css("margin-top", "10px");
    } else if (self.alreadyDoc(community, self.doc.name.trim())){
        self.message='Document "'+self.doc.name+' "already exists';
        return;
    } else {
        var now = new Date();
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var teiHeader='<teiHeader>\r<fileDesc>\r<titleStmt>\r<title>A transcription of document '+this.doc.name+'\r</title>\r</titleStmt>\r<publicationStmt>\r<p>Prepared within the Textual Communities system</p>\r</publicationStmt>\r<sourceDesc>\r<p>Created as a new document within community '+community.attrs.abbr+'</p>\r</sourceDesc>\r</fileDesc>\r<revisionDesc>\r<change when="'+now+'">Created on '+days[now.getDay()]+' '+now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear()+' by '+state.authUser.attrs.local.name+' ('+state.authUser.attrs.local.email+')</change>\r</revisionDesc>\r</teiHeader>';
        this.doc.teiHeader=teiHeader;
        this.doc.community=community.attrs.abbr;
        this._docService.commit({
          doc: this.doc,
        }, {
          community: community.getId()
        }).subscribe(function(doc) {
          $('#MMADdiv').css("margin-top", "0px");
          $('#MMADbutton').css("margin-top", "10px");
          self.doc = {name:"", label: 'text'};
          //tell the system we have this document as current
          self._router.navigate(['Community', {
            id: community.getId(), route: 'view'
          }]);
    //      $('#manageModal').modal('hide');  //now go and add pages
          self.uiService.manageModal$.emit({type: 'add-document-page', afterPage: false, document: self.state.document, page:null, parent:self.state.document, multiple: false  });
        }, function(err) {
          self.message = "Error writing to database";
        });
    }
  },
  closeModalAD: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    this.doc = {name:"", label: 'text'};
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
  }
});

module.exports = AddDocumentComponent;
