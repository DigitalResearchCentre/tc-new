var ElementRef = ng.core.ElementRef
  , CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , $ = require('jquery')
  , OpenSeadragon = require('openseadragon')
  , config = require('../config')
;

var ViewerComponent = ng.core.Component({
  selector: 'tc-viewer',
  templateUrl: '/app/community/viewer.html',
  inputs: [
    'community', 'page', 'image', 'document',
  ],
  directives: [
    require('../directives/codemirror'),
    require('../directives/splitter').SPLITTER_DIRECTIVES,
  ]
}).Class({
  constructor: [DocService, UIService, ElementRef, function(
    docService, uiService, elementRef
  ) {
    var self=this;
    this._docService = docService;
    this._uiService = uiService;
    this._elementRef = elementRef;
    this.revisions = [];
    this.smartIndent = false;
    this.contentText = '';
    this.prevs = [];
    this.prevLink = null;
    this.state=uiService.state;
    this.state.doNotParse=false;
    this.isVerticalSplit=true;
    this._uiService.sendEditorText$.subscribe(function(data) {
      self.contentText = data.text;
      if (data.choice=="save") {self.saveSend(data.text)}
      if (data.choice=="preview") {self.previewSend(data.text)}
      if (data.choice=="commit") {self.commitSend(data.text)}
    });
    this._uiService.sendCommand$.subscribe(function(chosen){
      //this when we are coming after adding a page
      if (chosen==="commitTranscript") {
        self.state.doNotParse=true;
        self.commit();
      };
      if (chosen==="newTranscript") {
        self.state.newTranscript=true;
        self.setContentText(self.contentText);
      }
    });
    this._uiService.changeMessage$.subscribe(function(message){
      console.log(message);
      self._uiService.manageModal$.emit({type: 'info-message', page: message.page,   docname: message.docname, message: message.message});
      if (message.type=="commit") self.commitFailed=true;
    });
  }],
  ngOnInit: function() {
    var self=this;
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+this.document._id+'&pageid='+this.page._id, function(res) {
      self.isText=res.isThisPageText;
    });
    var self = this
      , community = this.community
      , $el = $(this._elementRef.nativeElement)
      , width = $el.width()
      , height = $el.height()
    ;
    var viewer = OpenSeadragon({
      id: 'imageMap',
      prefixUrl: '/images/',
      preserveViewport: true,
      visibilityRatio:    1,
      defaultZoomLevel:   1,
      sequenceMode:       true,
      // TODO:
      // while uploading, we need make:
      // image name as page name, order by name, reorder, rename
    });
    this.viewer = viewer;
    this.onResize();
    this.commitFailed=false;  //reset elsewhere in a very messy piece of programming
    //var $imageMap = $('.image_map');
    //var options = {zoom: 2 , minZoom: 1, maxZoom: 5};
  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate);
    var options = {
    year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
    };
    return date.toLocaleTimeString("en-us", options);
  },
  onImageChange: function() {
    var viewer = this.viewer;
    if (this.image) {
      $.get(config.IIIF_URL + this.image + '/info.json', function(source) {
        if (viewer) viewer.open([source]);
      });
    } else {
      if (viewer) viewer.open([]);
    }
  },
  splitHorizontal: function() {
    $('#viewerSplitter').removeClass("horizontal");
    $('#viewerSplitter').addClass("vertical");
    this.isVerticalSplit=false;
  },
  splitVertical: function() {
    $('#viewerSplitter').removeClass("vertical");
    $('#viewerSplitter').addClass("horizontal");
    this.isVerticalSplit=true;
  },
  onResize: function() {
    if (!this.viewer) return;
    var viewport = this.viewer.viewport
      , x = viewport.containerSize.x
      , y = viewport.containerSize.y
      , w = x / 2334
      , h = y / 1479
    ;
    viewport.minZoomImageRatio = w > h ? h / w : 1;
  },
  ngOnChanges: function() {
    var docService = this._docService
      , page = this.page
      , self = this
    ;
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+this.document._id+'&pageid='+this.page._id, function(res) {
      this.isNoText=res.isThisPageText;
    });
    if (page) {
      this.contentText = '';
      docService.getLinks(page).subscribe(function(links) {
        self.prevs = links.prevs.slice(0, links.prevs.length-1);
        docService.getRevisions(page).subscribe(function(revisions) {
          self.revisions = revisions;
          if (_.isEmpty(revisions)) {
            //here is where we choose.. either make it an empty page i
            self.createDefaultRevisionFromDB();
          } else {
            self.revisionChange({target: {value: _.first(revisions).getId()}});
          }
        });
      });
    }
    this.onImageChange();
  },
  isPrevPage: function(page, document) {
    //could be just created the doc, so no pages yet...
    if (!document.attrs.children) return(false);
    if (document.attrs.children.length==0) return(false);
    if (page._id==document.attrs.children[0]._id) return(false);
    else {
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this.prevPage=document.attrs.children[i-1].attrs.name;
          i=document.attrs.children.length;
        }
      }
      return(true);
    }
  },
  showNext: function(page, document){
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this._uiService.showDocument$.emit({doc: document, page:document.attrs.children[i+1]});
          i=document.attrs.children.length;
        }
      }
  },
  showPrev: function(page, document){
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this._uiService.showDocument$.emit({doc: document, page:document.attrs.children[i-1]});
          i=document.attrs.children.length;
        }
      }
  },
  isNextPage: function(page, document) {
    if (!document.attrs.children) return(false);
    if (document.attrs.children.length==0) return(false);
    if (page._id==document.attrs.children[document.attrs.children.length-1]._id) return(false);
    else {
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this.nextPage=document.attrs.children[i+1].attrs.name;
          i=document.attrs.children.length;
        }
      }
      return(true);
    }
  },
  createDefaultRevisionFromDB: function() {
    var docService = this._docService
      , self = this
      , page = this.page
      , community = this.community
      , meta = _.get(
        page, 'attrs.meta',
        _.get(page.getParent(), 'attrs.meta')
      )
    ;
    if (meta) {
      //update base database version
      docService.getTextTree(page).subscribe(function(teiRoot) {
        var isDefault=false;
        var dbRevision = self.json2xml(prettyTei(teiRoot));
        //edit this to turn it to valid empty texts
        var newtext=dbRevision.replace(/(?:\r\n|\r|\n)/g, '');
        var blankpage='<text><pb n="'+self.page.attrs.name+'"/></text>'
          docService.addRevision({
          doc: page.getId(),
          text: dbRevision,
          user: meta.user,
          community: community,
          committed: meta.committed,
          status: 'COMMITTED',
        }).subscribe(function(revision) {
          self.revisions.unshift(revision);
          if (newtext==blankpage) {
            dbRevision='<text>\r<body>\r<pb n="'+self.page.attrs.name+'"/>\r\t<div>\r\t</div>\r</body></text>'
            docService.addRevision({
              doc: page.getId(),
              text: dbRevision,
              user: meta.user,
              community: community,
              committed: meta.committed,
              status: 'IN_PROGRESS',
            }).subscribe(function(revision) {
              self.revisions.unshift(revision);
              self.setContentText(dbRevision);
              self.revisionChange({
                target: {value: revision.getId()}
              });
            });
          }  else {
            self.setContentText(dbRevision);
            self.revisionChange({
              target: {value: revision.getId()}
            });
          }
        });
      });
    }
  },
  createNewPageTranscript: function() {
    //have we got text in our transcript? or not?
    this._uiService.manageModal$.emit({
      type: 'edit-new-page',
      page: this.page,
      document: this.document,
      context: this,
    });
  },
  setContentText: function(contentText) {
    //shifted test for new pages, etc, over to
    var self=this, docService=this._docService;
    this.contentText = contentText;
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+this.document._id+'&pageid='+this.page._id, function(res) {
      self.isText=res.isThisPageText;
      if (!res.isThisPageText) {
        //ok... if nothing in prevs, just go to make new transcript
        //if there is something from previous page, then choose to continue, or not
        //send a call to the database...is there text in the preceding page?
        //if there is: there will be tei descendants of this pb
        //here is where we handle multipage docs where we want to continue text from the previous page
        //not sure we need this one..
        self.state.newTranscript=false; //returns: res.isPrevPageText and res.isThisPageText
        //I don't think there is any way res.isThisPageText can be true. This is a new page!
        if (!res.isPrevPageText) {
          self._uiService.manageModal$.emit({
            type: 'edit-new-page',
            page: self.page,
            document: self.document,
            context: self,
          });
        } else { //res.isPrevPageText is true -- we have transcribed text on the preceding page
          //we have continuing text on this page
          //here is where we will deceive the system into creating a default transcript continuing from
          //previous page in case of document with multiple pages...we pull the page break out of the text element children
          //and pass that into docService.commit as a new page...
          var myDoc={name: "2r", label: "pb", facs: "2r.jpg", children:[],}
          docService.commit({
            doc: myDoc,
          },{adjust:1}).subscribe(function(page) {
            var bill=1;
          })
    /*      self._uiService.manageModal$.emit({
             type: 'confirm-message',
             page: self.page,
             docname: "",
             header: "Add text to page "+self.page.attrs.name+" in "+self.state.document.attrs.name,
             warning: "Continue text from previous page or add new text",
             document: self.document,
             action: 'addPage',
             context: self,
           }); */
        }
      }
    });
  },
  prevLinkChange: function($event) {
    var id = $event.target.value
      , docService = this._docService
    ;
    try {
      var contentText = docService.relinkPage(
        this.contentText, id, this.prevs);
      if (contentText) {
        this.setContentText(contentText);
      }
    } catch (e) {
    }
  },
  json2xml: function(data) {
    return this._docService.json2xml(data);
  },
  revisionChange: function($event) {
    var id = $event.target.value
      , docService = this._docService
      , revisions = this.revisions
    ;
    var revision = _.find(revisions, function(revision) {
      return revision._id === id;
    });
    var contentText = _.get(revision, 'attrs.text', '');
    this.revision = revision;
    try {
      this.prevLink = docService.checkPagePrevLinks(contentText, this.prevs);
    } catch (e) {
      this.prevLink = null;
    }
    this.setContentText(contentText);
  },
  revisionCompareChange: function($event) {
    var revision = this.revisions[$event.target.value];
    //this.contentText = revision.attrs.text;
  },
  save: function() {
    //get content from codemirror...
    this._uiService.requestEditorText$.emit("save");
  },
  saveSend: function(text) {
    var page = this.page
      , docService = this._docService
      , self = this
      , community = this._uiService.state.community.attrs.abbr;
    ;
    docService.addRevision({
      doc: page.getId(),
      text: text,
      community: community,
      status: 'IN_PROGRESS',
    }).subscribe(function(revision) {
      self.revisions.unshift(revision);
      self.revision = revision;
    });
  },
  preview: function() {
    //get content from codemirror...
    this._uiService.requestEditorText$.emit("preview");
  },
  previewSend: function(text) {
    //parse first!
    var self = this
      , page = this.page
      , contentText = text;
    ;
    $.post(config.BACKEND_URL+'validate?'+'id='+this.state.community.getId(), {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+contentText+"</TEI>",
    }, function(res) {
      self._uiService.manageModal$.emit({
          type: 'preview-page',
          page: page,
          error: res.error,
          content: contentText,
          lines: contentText.split("\n")
        });
    });
  },
  commit: function(text) {
    this._uiService.requestEditorText$.emit("commit");
  },
  commitSend: function(text) {
    var docService = this._docService
      , page = this.page
      , revision = this.revision
      , contentText = text
      , community = this.community
      , state = this.state
    ;
    if (!state.doNotParse && (contentText !== revision.attrs.text)) {
      alert(`You haven't saved this revision yet.`);
      return;
    }
    //parse first!
    var self = this;
    this.commitFailed=false;
    $.post(config.BACKEND_URL+'validate?'+'id='+this.state.community.getId(), {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+contentText+"</TEI>",
    }, function(res) {
      if (res.error.length) {
        self._uiService.manageModal$.emit({
            type: 'preview-page', page: page, error: res.error, content: contentText, lines: contentText.split("\n")
          });
      }
      if (!res.error.length) {
        if (!state.doNotParse) {
         self._uiService.manageModal$.emit({
            type: 'info-message',
            page: page.attrs.name,
            docname: self.state.document.attrs.name,
            message: "Page validated. Now committing"
          });
        }
        docService.commit({
          revision: revision.getId(),
          doc: {
            _id: page.getId(),
            label: page.attrs.label,
            name: page.attrs.name,
            community: self.state.community.attrs.abbr,
          },
          text: self.contentText,
        } ).subscribe(function(res) {
          //go get these from the db
          if (!state.doNotParse) {
            if (!self.commitFail)
              self._uiService.manageModal$.emit({type: 'info-message', page: page.attrs.name,   docname: self.state.document.attrs.name, message: "Page successfully committed"});
          }
          if (!self.commitFailed) revision.set('status', 'COMMITTED');
          self.commitFailed=false;
          //update entity status too..
          $.post(config.BACKEND_URL+'getEntities?'+'community='+state.community.attrs.abbr, function(res) {
            state.community.attrs.entities=res.foundEntities;
          });
          $.post(config.BACKEND_URL+'getDocEntities?'+'document='+state.document.attrs._id, function(res) {
            //locate the doc in the state structure and update it
            var thisDoc=state.community.attrs.documents.filter(function (obj){return obj.attrs.name===state.document.attrs.name;})[0];
            thisDoc.attrs.entities=res.foundDocEntities;
            state.doNotParse=false;
          });
          $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+self.document._id+'&pageid='+self.page._id, function(res) {
            self.isText=res.isThisPageText;
          });
        });
      }
    });
  },
  newText: function() {
    var self=this;
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+self.document._id+'&pageid='+self.page._id, function(res) {
      if (res.isPrevPageText) {
        self._uiService.manageModal$.emit({
           type: 'confirm-message',
           page: self.page,
           docname: "",
           header: "Add text to page "+self.page.attrs.name+" in "+self.state.document.attrs.name,
           warning: "Continue text from previous page or add new text.",
           action: 'addPage',
           document: self.document,
           context: self,
         });
      } else {
        self._uiService.manageModal$.emit({
          type: 'edit-new-page',
          page: self.page,
          document: self.document,
          context: self,
        });
      }
    });
  },
});

function prettyTei(teiRoot) {
  _.dfs([teiRoot], function(el) {
    var children = [];
    _.each(el.children, function(childEl) {
      if (['pb', 'cb', 'lb', 'div','body', '/div'].indexOf(childEl.name) !== -1) {
        children.push({
          name: '#text',
          text: '\n',
        });
      }
      children.push(childEl);
    });
    el.children = children;
  });
  return teiRoot;
}

module.exports = ViewerComponent;
