var $ = require('jquery')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , config = require('./config')
  , Router = ng.router.Router
;

var ConfirmMessageComponent = ng.core.Component({
  selector: 'tc-managemodal-confirm-message',
  templateUrl: '/app/confirmmessage.html',
  inputs : ['page', 'header', 'warning', 'docname', 'action', 'context', 'document', 'prevpage'],
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
    var width="450px";
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
  submitTranscript: function() {
    this._uiService.sendCommand$.emit("submitTranscript");
  },
  transcribeFirstPage: function(document, page, context) {
    this.reload=false;
    this._uiService.showDocument$.emit({doc: document, page:document.attrs.children[0]});
    this._uiService.sendCommand$.emit("newTranscript");
  },
  transcribePage: function(document, page, context) {
    var self=this;
    //could already be text on this page, coz we have continued previous page. In that case, just close the window, it's all there for us already
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+page.attrs.ancestors[0]+'&pageid='+page._id, function(res) {
      if (res.isThisPageText) self.closeModalCMLC();
      else {
        self.reload=false;
        self._uiService.sendCommand$.emit("newTranscript");
      }
    });
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
  continuePrev: function(myDocument, page, prevpage, context) {
      //this can only be called after clicking on new text button from viewer...
      //requires some subtle gymnastics: ie remove this page and then add it back in using docService
      var self=this;
      var docService=this._docService;
      //either: we are adding in a multipage document, in which case we need to delete the page and add it back
      //or.. not
      if (!page) {
        //summons rewrite and save of continuing text
        //we are not changing page?
        this._uiService.sendCommand$.emit("ContinuingTranscript");
        self.closeModalCMLC();
      } else {
        if (page.attrs.facs && page.attrs.image) {
          var myDoc={name: page.attrs.name, label: "pb", image: page.attrs.image, facs: page.attrs.facs, children:[],}
        } else if (page.attrs.facs) {
          var myDoc={name: page.attrs.name, label: "pb", facs: page.attrs.facs, children:[],}
        } else if (page.attrs.image) {
          var myDoc={name: page.attrs.name, label: "pb", image: page.attrs.image, children:[],}
        } else {
        var myDoc={name: page.attrs.name, label: "pb", children:[],}
        }
        var afterPage=myDocument.attrs.children.filter(function (obj){return String(obj.attrs.name) == String(prevpage);})[0]
        var options = {after: afterPage}
        //ok, got to eliminate this page from db then add it right back again
        //need to update id of this page with new page! else nasty things happen
        $.post(config.BACKEND_URL+'deletePage?'+'docid='+myDocument._id+'&pageid='+page._id, function(res) {
          docService.commit({
            doc: myDoc,
          }, options).subscribe(function(page) {
            context.state.isNewContinuingText=true;
            //get document children in sync with replaced pages
              self.closeModalCMLC();
            //call new page id here...
          })
        });
      }
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
      self.warning=" Text removed from document containing "+res.npages+" pages, "+res.nodocels+" document structural elements (lines, etc.), "+res.nentels+" entity elements, "+res.nallels+" total document elements, and " +res.npagetrans+" page transcripts";
      self.showButtons=false;
    });
  },
  confirmDeleteCommunity: function() {
    var self=this;
    var community_name=this.state.community.attrs.name;
    var community_ndocs=this.state.community.attrs.documents.length;
    $.post(config.BACKEND_URL+'deleteAllDocs?'+'id='+this.state.community.getId()+'&deleteComm=true', function(res) {
      //write a happy message
      self.warning="Community '"+community_name+"' has been deleted. This community contained "+community_ndocs+" documents with "+res.ndocels+" document structural elements (pages, lines, etc.), "+res.nentels+" entity elements, "+res.ncollels+" collation elements, " +res.npagetrans+" page transcripts and "+res.nTEIels+" text elements.";
      self.showButtons=false;
    });
  },
  confirmDelete: function() {
    //ok, go get rid of all the documents, etc
    var self=this;
    $.post(config.BACKEND_URL+'deleteAllDocs?'+'id='+this.state.community.getId()+'&deleteComm=false', function(res) {
      self.warning=res.ndocs+" documents removed containing "+res.ndocels+" document structural elements (lines, etc.), "+res.nentels+" entity elements, "+res.nTEIels+" total TEI elements, "+res.ncollels+" collation elements, and " +res.npagetrans+" page transcripts";
      self.showButtons=false;
      self.reload=true;
    })
  },
});


module.exports = ConfirmMessageComponent;
