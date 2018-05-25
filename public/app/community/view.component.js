var CommunityService = require('../services/community')
  , Viewer = require('./viewer.component')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , RestService = require('../services/rest')
  , UpdateDbService = require('../services/updatedb')
  , config = require('../config')
  , async = require('async')
  , $ = require('jquery')
;

var ViewComponent = ng.core.Component({
  selector: 'tc-community-view',
  templateUrl: '/app/community/view.html',
  styleUrls: ['/app/community/view.css'],
  directives: [
  /*  require('../directives/tabs').TAB_DIRECTIVES, */
    require('../directives/splitter').SPLITTER_DIRECTIVES,
    Viewer,
  ],
/*  queries: {
    viewer: new ng.core.ViewChild(Viewer),
  }, */
}).Class({
  constructor: [CommunityService, UIService, DocService, RestService, function(
    communityService, uiService, docService, restService
  ) {
//    console.log('community view');
    var self=this;
    this._uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;
    this._restService = restService
    this.state = uiService.state;
    this.state.showSide=true;
    this.showByPage=true;
    this.versions=[];
    this._uiService.choosePage$.subscribe(function (doc) {
      self.toggleDoc(doc);
    });
    this._uiService.showDocument$.subscribe(function (docpage) {
      self.selectDocPage(docpage.doc, docpage.page);
    });
    this.collationEditor=false;
    this.callCollationEditor='';
   $.get(config.BACKEND_URL+'getDocNames/?community='+this.state.community._id, function(res) {
      self.docnames=res;
      for (var i=0; i<self.state.community.attrs.documents.length; i++) {
        self.state.community.attrs.documents[i].attrs.name=res[i].name;
        if (self.state.community.attrs.documents[i].attrs.children.length==0 && res[i].npages!=0)
          self.state.community.attrs.documents[i].attrs.children[0]={attrs:"dummy"}  //idea is to force not to show add page if we have pages */
      }
    });
    $( window ).resize(function() {
      var tcWidth=$('#tcPaneViewer').width();
      var tcHeight=$('#tcPaneViewer').height();
      $('#CXcontainer').width(tcWidth);
      $('#tcVersions').height(tcHeight);
    });
  }],
  ngOnInit: function() {
    if (this.state.authUser._id) {
      for (var i=0; i<this.state.authUser.attrs.memberships.length; i++) {
        if (this.state.authUser.attrs.memberships[i].community.attrs._id==this.state.community.attrs._id)
          this.role=this.state.authUser.attrs.memberships[i].role;
      }
    } else this.role="NONE";
    if (this.state.authUser.attrs.local && this.state.authUser.attrs.local.email=="peter.robinson@usask.ca") this.role="LEADER";
  },
  ngOnChanges: function() {
    var docEl=document.getElementsByClassName("selected")[0];
    if (docEl) docEl.scrollIntoView(true);
  },
  onResize: function($event) {
    var tcWidth=$('#tcPaneViewer').width();
    var tcHeight=$('#tcPaneViewer').height();
    $('#CXcontainer').width(tcWidth);
    $('#tcVersions').height(tcHeight);
    if (this.viewer) {
      this.viewer.onResize();
    }
  },
  toggleDoc: function(doc) {
    doc.expand = !doc.expand;
    if (doc.expand) {
     this._docService.selectDocument(doc);
  //refresh the document...
    }
/*    if (doc.expand) {
      removeAllSelected(this, this.state.document.attrs.children[0]);
      this._docService.selectDocument(doc);
//      this._docService.selectPage(doc.attrs.children[0]);
      this.state.document.attrs.children[0].attrs.selected=true;
    } */
  },
  showAddFirstPage: function(doc) {
    return doc &&  _.isEmpty(_.get(doc, 'attrs.children'));
  },
  showAddPage: function(page, doc) {
    return (page._id==doc.attrs.children[doc.attrs.children.length-1]._id)
  },
  pageHasImage: function(page) {
    if (page.attrs.image) return true;
    else return false;
  },
  docLacksImages: function(document) {
    if (document.attrs.children.length==0) return(true);
    for (var i = 0; i < document.attrs.children.length; i++) {
      if (!document.attrs.children[i].attrs.image) return(true);
    }
    return(false);
  },
  selectDoc: function(doc) {
    removeAllSelected(this, this.state.document.attrs.children[0]);
    this._docService.selectDocument(doc);
    this.state.document.attrs.children[0].attrs.selected=true;
  },
  selectPage: function(page) {
    removeAllSelected(this, page);
    page.attrs.selected=true;
    this._docService.selectPage(page);
  },
  selectDocPage: function(doc, page) {
    this._docService.selectDocument(doc);
    this._docService.selectPage(page);
    removeAllSelected(this, page);
    page.attrs.selected=true;
  },
  addIIIFImages: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-iiif',
      document: doc,
    });
  },
  addZipImages: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-zip',
      document: doc,
    });
  },
  addFirstPage: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      document: doc,
      page: null,
      afterPage: false,
      parent: doc,
      multiple: false
    });
  },
  editPageImage: function(page) {
    this._uiService.manageModal$.emit({
      type: 'edit-page',
      page: page,
    });
  },
  addBulkImages: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-bulk-images',
      document: doc,
    });
  },
  addPageAfter: function(page, doc) {
    var self=this
    , docService = this._docService;
    this._uiService.manageModal$.emit({
     type: 'add-document-page',
     page: page,
     document: doc,
     afterPage: true,
     after: page,
     multiple: false
   });
  },
  addDocument: function() {
    this._uiService.manageModal$.emit("add-document-choice");
  },
  toggleEntities: function(entity) {
    entity.expand = !entity.expand;
    if (entity.expand) {
      if (entity.attrs) var entName=entity.attrs.entityName;
      else var entName=entity.entityName;
      $.post(config.BACKEND_URL+'getSubEntities?'+'ancestor='+entName, function(res) {
        entity.entities=res.foundEntities;
      });
    }
  },
  toggleDocEntities: function(docEntity) {
    docEntity.expand = !docEntity.expand;
    if (docEntity.expand) {
      $.post(config.BACKEND_URL+'getSubDocEntities?'+'id='+docEntity.tei_id, function(res) {
        docEntity.entities=res.foundTEIS;
      });
    }
  },
  selectEntity: function(entity) {
    //go get the different versions; collate them; yoho!
    //we just supply the url for the collation editor and it does the rest. hooray.
    //we will add some choices to the community menu: to choose default collation tool (collateX..collation editor..multiple text viewer)
    var self=this;
    this.collationEditor=true;
    var pages=this.state.community.attrs.documents.map(function(page){return(page.attrs.name)});
    if (!this.state.community.attrs.ceconfig.base_text)  {
      this._uiService.manageModal$.emit({type: 'info-message', message: "You have not chosen a base text for collation in community \""+this.state.community.attrs.abbr+"\". Choose a base text from the Manage>Collation menu.", header:"Base text not chosen in collation", source: "CollationBase"});
      return;
    }
    var isBaseDoc=this.state.community.attrs.documents.filter(function (obj){return obj.attrs.name==this.state.community.attrs.ceconfig.base_text})[0];
    if (!isBaseDoc) {
      this._uiService.manageModal$.emit({type: 'info-message', message: "The chosen base text \""+this.state.community.attrs.ceconfig.base_text+"\" in community \""+this.state.community.attrs.abbr+"\" is not a document in this community. Either supply this document or choose a different base text from the Manage>Collation menu.", header:"Base text error in collation", source: "CollationBase"});
      return;
    }
    //do the next as a waterfall...
    //is our base in this list, or is it missing text?
    async.waterfall([
      function (cb) {
        $.post(config.BACKEND_URL+'baseHasEntity?'+'docid='+isBaseDoc.attrs._id+'&entityName='+entity.entityName, function(res) {
          if (res.success=="0") {
            self._uiService.manageModal$.emit({type: 'info-message', message: "The chosen base text \""+self.state.community.attrs.ceconfig.base_text+"\" in community \""+self.state.community.attrs.abbr+"\" has no text for \""+entity.entityName+"\". Either supply a text of this section in this document or choose a different base text from the Manage>Collation menu.", header:"Base text error in collation", source: "CollationBase"});
            return;
          } else cb(null, []);
        });
      } /*
       function (argument, cb) {
         //load witnesses into ceconfig and save
    //     self.state.community.attrs.ceconfig.witnesses=pages;
        //we want to change just one field
        var jsoncall='[{"abbr":"'+self.state.community.attrs.abbr+'"},{"$set":{"ceconfig.witnesses":['+pages+']}}]';
        UpdateDbService("Community", jsoncall, function(result){
           console.log(result);
           cb(null, []);
         });
         self._communityService.update(self.state.community.getId(), self.state.community).subscribe(function(community) {
           cb(null, []);
         });
       } */
     ], function (err) {
       if (!err) {
         self.collationEditor=true;
         var src=config.COLLATE_URL+"/collation/?dbUrl="+config.BACKEND_URL+"&entity="+entity.entityName+"&community="+this.state.community.attrs.abbr;
         $('#ce_iframe').attr('src', src);
        }
       }
    );
  /*  var self =this;
    self.state.community.entityName=entity.entityName;
    var tcWidth=$('#tcPaneViewer').width();
    var tcHeight=$('#tcPaneViewer').height();
    $('#CXcontainer').width(tcWidth);
    $('#tcVersions').height(tcHeight);
    var testCollateX = {"witnesses":[{"id":"W1","content":"This next morning the cat observed little birds in the trees."},{"id":"W2","content":"The cat was observing birds in the little trees this morning, it observed birds for two hours."}],"algorithm":"dekker","tokenComparator":{"type":"equality"},"joined":true,"transpositions":true}
    $.post(config.BACKEND_URL+'getEntityVersions?'+'id='+entity.entityName, function(res) {
      self.versions=res.foundVersions;
      if (self.versions.length>1) {
        var sendCollateX = '{"witnesses":[';
        for (i=0; i<self.versions.length; i++) {
          sendCollateX+='{"id":"'+self.versions[i].sigil+'","content":"'+self.versions[i].version.replace(/(\r\n|\n|\r)/gm,"")+'"}'
          if (i<self.versions.length-1) sendCollateX+=','
        }
        sendCollateX+='],"algorithm":"dekker","tokenComparator":{"type":"equality"},"joined":true,"transpositions":true}';
  //      sendCollateX=JSON.stringify(sendCollateX);
        //format the file to send to collateX
        $.ajax({
          url: 'https://collatex.net/demo/collate',
          type: 'POST',
          data: sendCollateX,
          accepts: {
                     svg: "image/svg+xml"
              },
                  converters: {
                     "text svg": jQuery.parseXML
          },
          contentType: 'application/json; charset=utf-8',
          dataType: 'svg'
        })
         .done(function( data ) {
            $("#CXcontainer").html(data.documentElement.outerHTML);
            $('#CXcontainer').width(tcWidth);
            $('#tcVersions').height(tcHeight);
        })
         .fail(function( jqXHR, textStatus, errorThrown) {
          alert( "error" + errorThrown );
        });
      }
    }); */
  },
  selectDocEntity: function(doc, docEntity) {
      //choose the right page at this point
      //for root element: if this is the body, etc, could be opened BEFORE there is any page
      //default to first page of document in that case
    var page=doc.attrs.children.filter(function (obj){return obj._id==docEntity.page})[0];
    this._docService.selectPage(page);
  },
  active: function(tab) {
    if (tab=="Documents") {
      $('#collationView').hide();$('#docTab').show();
      $('tc-viewer').show(); $('#tcCollation').hide();
      $('#docTabHead').addClass('active'); $('#collationTabHead').removeClass('active')
      if (this.showByPage) {$('#pageTab').show(); $('#itemTab').hide();
      } else {$('#pageTab').hide(); $('#itemTab').show() }
    }
    if (tab=="Collation") {
      $('#collationView').show(); $('#pageTab').hide(); $('#itemTab').hide(); $('#docTab').hide();
      $('tc-viewer').hide(); $('#tcCollation').show();
      $('#docTabHead').removeClass('active'); $('#collationTabHead').addClass('active')

    }
    if (tab=="Pages") {
      $('#pageTab').show();$('#itemTab').hide();
      $('#pageTabHead').addClass('active');$('#itemTabHead').removeClass('active');
    this.showByPage=true;
    }
    if (tab=="Items") {
      $('#pageTab').hide();$('#itemTab').show();
      $('#pageTabHead').removeClass('active');$('#itemTabHead').addClass('active');
      this.showByPage=false;
    }
  },
  entityHasCollation: function(entity) {
    return(true);
  },
  reorderDocument: function(doc) {
    this._uiService.manageModal$.emit({
      type:'reorder-document',
      document:doc,
    });
  },
  deleteDocument: function(doc) {
    this._uiService.manageModal$.emit({
       type: 'confirm-message',
       page: "",
       document: doc,
       docname: doc._id,
       header: "Delete document "+doc.attrs.name+" from community "+this.state.community.attrs.name,
       warning: "Are you sure? This will delete all transcripts, encodings, and images for this document. It cannot be undone.",
       action: 'deleteDocument'
     });
  },
  removeDocumentText: function(doc) {
    this._uiService.manageModal$.emit({
       type: 'confirm-message',
       page: "",
       docname: doc._id,
       document: doc,
       header: "Delete all text from document "+doc.attrs.name+" in community "+this.state.community.attrs.name,
       warning: "Are you sure? This will delete the text of all transcripts for this document,while leaving pages and images. It cannot be undone.",
       action: 'deleteDocumentText'
     });
  },
  editTEIHeader: function(doc) {
    this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.state.community, document: doc, filetype:"teiHeader"});
  },
  getDocInf: function(doc) {
    this._uiService.manageModal$.emit({type: "getdocinf", community: this.state.community, document: doc});
  },
  extractXML: function($event, doc) {
    var self=this;
    var docService = this._docService;
    self._uiService.manageModal$.emit({type: "extract-xml-doc", document: doc});
    docService.getTextTree(doc).subscribe(function(teiRoot) {
//      console.log(teiRoot);
      var teiText=docService.json2xml(prettyTei(teiRoot));
      teiText="<TEI>\r"+doc.attrs.teiHeader+"\r"+teiText+"\r</TEI>";
      self._uiService.sendXMLData$.emit(teiText);
    });
  }
});

function removeAllSelected(self, page) {
  if (this.state.pageSelected) this.state.pageSelected.attrs.selected=false;
  this.state.pageSelected=page;
}

function prettyTei(teiRoot) {
  _.dfs([teiRoot], function(el) {
    var children = [];
    _.each(el.children, function(childEl) {
      if (['pb', 'cb', 'lb', 'div','body','/div'].indexOf(childEl.name) !== -1) {
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

module.exports = ViewComponent;
