var $ = require('jquery')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , config = require('./config')
  , Router = ng.router.Router
;

var ConfirmMessageComponent = ng.core.Component({
  selector: 'tc-managemodal-confirm-message',
  templateUrl: '/app/confirmmessage.html',
  inputs : ['page', 'header', 'warning', 'docname', 'action', 'context', 'document'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [Router, UIService, DocService, function(router, uiService, docService) {
//    var Doc = TCService.Doc, doc = new Doc();
    this.state=uiService.state;
    this.showButtons=true;
    this._uiService=uiService;
    this._docService=docService;
    this._router = router;
    this.community= this._uiService.state.community;
    }],
  ngOnInit: function() {
  },
  ngOnChanges: function(){
    var height="164px";
    var width="350px";
    if (this.action=="addPage") height="124px";
    if (this.action=="continueAddPage")  height="100px";
    if (this.action=="continueAddPages") {height="230px"; width="450px"};
    $('#manageModal').width(width);
    $('#manageModal').height(height);
  },
  closeModalCMLC: function() {
    this.showButtons=true;
    $('#manageModal').modal('hide');
    if (this.reload) {
      this.reload=false;
      location.reload(true);
    }
  },
  newPage: function() {
    this.reload=false;
    this._uiService.manageModal$.emit({
      type: 'edit-new-page',
      page: this.page,
      document: this.document,
      context: this.context,
    });
  },
  transcribeFirstPage: function(document, page, context) {
    this.reload=false;
    this._uiService.showDocument$.emit({doc: document, page:document.attrs.children[0]});
    this._uiService.sendCommand$.emit("newTranscript");
  },
  transcribePage: function(document, page, context) {
    this.reload=false;
    this._uiService.sendCommand$.emit("newTranscript");
  },
  addPage: function(document, page, context) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      page: page,
      document: document,
      afterPage: true,
      after: page,
      context: context,
      multiple: false,
    });
  },
  reorderPages: function(document, page, context) {
    this._uiService.manageModal$.emit({
      type:'reorder-document',
      document:document,
    });
  },
  addPages: function(document, page, context) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      page: page,
      document: document,
      afterPage: true,
      after: page,
      context: context,
      multiple: true,
    });
  },
  continuePrev: function(document, page, context) {
    var origText=context.contentText;
    var meta = _.get(page, 'attrs.meta', _.get(page.getParent(), 'attrs.meta'));
    var self=this;
    origText = origText.replace(/(\r\n|\n|\r)/gm,"");
    var re = /(.*[^<])<pb(.*)\/><(.*)/;
    var newText=origText.replace(re, '$1<pb $2/>\r<lb/>Continuing text. (Select a different element in the "From Previous Page" menu to change what is continuing)\r<$3')
      //include specimen text in page after page break; then commit it
    context.contentText=newText;
    this.closeModalCMLC();
    //need to save the version as a revision too...
    this.revisions=this.context.revisions;
    this._docService.addRevision({
      doc: page.getId(),
      text: newText,
      user: meta.user,
      community: this.community,
      committed: meta.committed,
      status: 'CONTINUEPAGE',
    }).subscribe(function(revision) {
      //propogate on parent page
      self.context.revisions=self.revisions;
      self.context.revisions.unshift(revision);
      self.context.revision=self.revision=revision;
      self._uiService.sendCommand$.emit("commitTranscript");
    });
  },
  confirmDeleteDocument: function() {
    var self=this;
    $.post(config.BACKEND_URL+'deleteDocument?'+'id='+this.docname+'&community='+this.state.community.attrs.abbr, function(res) {
      //write a happy message
      self.warning=" One document removed containing "+res.npages+" pages, "+res.nodocels+" document structural elements (lines, etc.), "+res.nentels+" entity elements, "+res.nallels+" total document elements, and " +res.npagetrans+" page transcripts";
      self.showButtons=false;
      self.reload=true;
    });
  },
  confirmDeleteDocumentText: function() {
    var self=this;
    $.post(config.BACKEND_URL+'deleteDocumentText?'+'id='+this.docname+'&community='+this.state.community.attrs.abbr, function(res) {
      //write a happy message
      self.warning=" Text removed from containing "+res.npages+" pages, "+res.nodocels+" document structural elements (lines, etc.), "+res.nentels+" entity elements, "+res.nallels+" total document elements, and " +res.npagetrans+" page transcripts";
      self.showButtons=false;
      self.reload=true;
    });
  },
  confirmDelete: function() {
    //ok, go get rid of all the documents, etc
    var self=this;
    $.post(config.BACKEND_URL+'deleteAllDocs?'+'id='+this.state.community.getId(), function(res) {
      self.warning=res.ndocs+" documents removed containing "+res.npages+" pages, "+res.ndocels+" document structural elements (lines, etc.), "+res.nentels+" entity elements, "+res.nallels+" total document elements, and " +res.npagetrans+" page transcripts";
      self.showButtons=false;
      self.reload=true;
    })
  },
});


module.exports = ConfirmMessageComponent;
