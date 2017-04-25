var CommunityService = require('../services/community')
  , Viewer = require('./viewer.component')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , config = require('../config')
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
  constructor: [CommunityService, UIService, DocService, function(
    communityService, uiService, docService
  ) {
//    console.log('community view');
    var self=this;
    this._uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;
    this.state = uiService.state;
    this.showByPage=true;
    this.versions=[];
    this._uiService.choosePage$.subscribe(function (doc) {
      self.toggleDoc(doc);
    });
    this._uiService.showDocument$.subscribe(function (docpage) {
      self.selectDocPage(docpage.doc, docpage.page);
    });
    $( window ).resize(function() {
      var tcWidth=$('#tcPaneViewer').width();
      var tcHeight=$('#tcPaneViewer').height();
      $('#CXcontainer').width(tcWidth);
      $('#tcVersions').height(tcHeight);
    });
  }],
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
    }
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
    for (var i = 0; i < document.attrs.children.length; i++) {
      if (!document.attrs.children[i].attrs.image) return(true);
    }
    return(false);
  },
  selectDoc: function(doc) {
    this._docService.selectDocument(doc);
  },
  selectPage: function(page) {
    this._docService.selectPage(page);
  },
  selectDocPage: function(doc, page) {
    this._docService.selectDocument(doc);
    this._docService.selectPage(page);
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
    var self =this;
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
    });
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
       header: "Delete all text from document "+this.state.document.attrs.name+" in community "+this.state.community.attrs.name,
       warning: "Are you sure? This will delete the text of all transcripts for this document,while leaving pages and images. It cannot be undone.",
       action: 'deleteDocumentText'
     });
  },
  extractXML: function($event, doc) {
    var self=this;
    var docService = this._docService;
    self._uiService.manageModal$.emit({type: "extract-xml-doc", document: doc});
    docService.getTextTree(doc).subscribe(function(teiRoot) {
//      console.log(teiRoot);
      self._uiService.sendXMLData$.emit(docService.json2xml(prettyTei(teiRoot)));
    });
  }
});

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
