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
    console.log('community view');
    this._uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;
    this.state = uiService.state;
    this.showByPage=true;
    this.versions=[];
  }],
  onResize: function($event) {
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
  selectDoc: function(doc) {
    this._docService.selectDocument(doc);
  },
  selectPage: function(page) {
    this._docService.selectPage(page);
  },
  addFirstPage: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      parent: doc,
    });
  },
  editPageImage: function(page) {
    this._uiService.manageModal$.emit({
      type: 'edit-page',
      page: page,
    });
  },
  addPageAfter: function(page) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      after: page,
    });
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
    $.post(config.BACKEND_URL+'getEntityVersions?'+'id='+entity.entityName, function(res) {
      self.versions=res.foundVersions;
    });
  },
  selectDocEntity: function(doc, docEntity) {
      //choose the right page at this point
      //for root element: if this is the body, etc, could be opened BEFORE there is any page
      //default to first page of document in that case
    page=doc.attrs.children.filter(function (obj){return obj._id==docEntity.page})[0];
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
  extractXML: function($event, doc) {
    var self=this;
    var docService = this._docService;
    self._uiService.manageModal$.emit("extract-xml-doc");
    docService.getTextTree(doc).subscribe(function(teiRoot) {
      console.log(teiRoot);
      self._uiService.sendXMLData$.emit(docService.json2xml(teiRoot));
    });
  }
});

module.exports = ViewComponent;
