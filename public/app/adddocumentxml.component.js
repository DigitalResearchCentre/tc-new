var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
  , config = require('./config')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AddDocumentXMLComponent = ng.core.Component({
  selector: 'tc-managemodal-adddocument-xml',
  templateUrl: '/app/adddocumentxml.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/filereader'),
  ],
}).Class({
  constructor: [
    CommunityService, UIService, DocService, function(
      communityService, uiService, docService
    ) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:""};
    $('#manageModal').width("400px");
    $('#manageModal').height("400px");
    this.message="";
    this.success="";
    this.text="";
    this.uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;

    this.doc = {name:"", text:""};
    /*this for scope variables */
    this.filecontent = '';
    this.state=uiService.state;
  }],
  filechange: function(filecontent) {
    this.filecontent = filecontent;
  },
  submit: function() {
    var self = this
      , docService = this._docService
      , text = this.text || this.filecontent
    ;
    if (this.doc.name === undefined || this.doc.name.trim() === "" ) {
      this.message = 'The document must have a name';
      $('#MMADdiv').css("margin-top", "0px");
      $('#MMADbutton').css("margin-top", "10px");
      return;
    }
    //do we already have a document with this name...?
    if (!text) {
      this.message = 'Either paste text into the text box or choose a file';
      return;
    }
    this.doc.label = 'text';
    //parse first...
    $.post(config.BACKEND_URL+'validate?'+'id='+this.state.community.getId(), {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+text+"</TEI>",
    }, function(res) {
      if (res.error.length>0) {
        self.uiService.manageModal$.emit({
            type: 'parse-xmlload',
            error: res.error,
            docname: self.doc.name,
            lines: text.split("\n")
          });
        return;
      } else {
        self.success="XML document "+self.doc.name+" parsed successfully. Now loading.";
        docService.commit({
          doc: self.doc,
          text: text,
        }, {
          community: self.state.community.getId(),
        }).subscribe(function(res) {
          self.success="XML document "+self.doc.name+" loaded successfully";
    //        self.closeModalADX();
        }, function(err) {
          self.message = err.message;
        });
      }
    })
  },
  closeModalADX: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  }
});

module.exports = AddDocumentXMLComponent;
