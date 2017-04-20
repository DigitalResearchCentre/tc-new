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
    $('#manageModal').width("420px");
    $('#manageModal').height("180px");
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
  alreadyDoc: function(community, docname) {
    if (community.attrs.documents.length>0) {
      var matcheddoc=community.attrs.documents.filter(function (obj){return obj.attrs.name === docname;})[0];
      if (matcheddoc) return true;
      else return false;
    } else {
      return false;
    }
  },
  submit: function() {
    var self = this
      , docService = this._docService
      , text = this.text || this.filecontent
      , community = this.state.community
    ;
    this.message="";
    this.success="";
    if (this.doc.name === undefined || this.doc.name.trim() === "" ) {
      this.message = 'The document must have a name';
      $('#MMADdiv').css("margin-top", "0px");
      $('#MMADbutton').css("margin-top", "10px");
      $('#manageModal').height("225px");
      return;
    } else if (this.alreadyDoc(community, this.doc.name.trim())){
        this.message='Document "'+this.doc.name+'" already exists';
        $('#manageModal').height("225px");
        return;
    }
    //do we already have a document with this name...?
    if (!text) {
      this.message = 'Choose a file';
      return;
    }
    this.doc.label = 'text';
    //parse first...
    self.message="";
    self.success="Parsing XML document "+self.doc.name+".";
    $('#manageModal').height("225px");
    $.post(config.BACKEND_URL+'validate?'+'id='+this.state.community.getId(), {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+text+"</TEI>",
    }, function(res) {
      if (res.error.length>0) {
        //check that error line exists
          self.uiService.manageModal$.emit({
            type: 'parse-xmlload',
            error: res.error,
            docname: self.doc.name,
            lines: text.split("\n")
          });
        return;
      } else {
        self.success="XML document "+self.doc.name+" parsed successfully. Now loading.";
        self.doc.community=self.state.community.attrs.abbr;
        docService.commit({
          doc: self.doc,
          res: res,
          text: text,
        }, {
          community: self.state.community.getId(),
        }).subscribe(function(res) {
          self.success="XML document "+self.doc.name+" loaded successfully";
          self.text="";
          $('#FRinput').val("");
          self.doc = {name:"", text:""};
          self.filecontent = '';
          //load this one into the viewer
          mydoc=self.state.document;
          mypage=self.state.page;
          setTimeout(function(){self.uiService.showDocument$.emit({doc: mydoc, page:mypage})}, 1000);
  //        self.closeModalADX();
        }, function(err) {
          var errbody=JSON.parse(err._body)
          self.message = errbody.message;
        });
      }
    })
  },
  closeModalADX: function() {
    this.message=this.success=this.doc.name=this.text="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
    $('#manageModal').height("180px");
    this.filecontent = '';
    this.state=this.uiService.state;
    this.doc = {name:"", text:""};
    $('#FRinput').val("");
  }
});

module.exports = AddDocumentXMLComponent;
