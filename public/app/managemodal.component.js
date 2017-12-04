var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , RESTService = require('./services/rest')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var ManageModalComponent = ng.core.Component({
  selector: 'tc-manage-modal',
  templateUrl: '/app/managemodal.html',
  directives: [
    require('./adddocument.component'),
    require('./addpage.component'),
    require('./adddocumentxml.component'),
    require('./editnewpage.component'),
    require('./extractxmldoc.component'),
    require('./joincommunity.component'),
    require('./viewmembers.component'),
    require('./previewpage.component'),
    require('./parsexmlload.component'),
    require('./messagelogin.component'),
    require('./editpage.component'),
    require('./community/uploadfile.component'),
    require('./infomessage.component'),
    require('./confirmmessage.component'),
    require('./adddocumentchoice.component'),
    require('./reorderdocument.component'),
    require('./addbulkimages.component'),
    require('./editcollation.component'),
    require('./addzip.component'),
  ],
}).Class({
  constructor: [CommunityService, UIService, RESTService, function(communityService, uiService, restService) {
    this._uiService = uiService;
    this.restService=restService;
/*    $('#manageModal').resizable(
      { handleSelector: ".win-size-grip",
        onDragStart: function (e, $el, opt) {
        $el.css("cursor", "nwse-resize")}
      }); */
/*
    this.loginFrame = '/auth?url=/index.html#/home';
    this.loginFrameHeight = 233; */
  }],
  ngOnInit: function() {
    var self = this;
    this._uiService.manageModal$.subscribe(function(event) {
      // 'add-document' || 'add-document-page' || 'add-xml-document' || 'edit-new-page' || 'extract-xml-doc'
      self.choice = event || 'add-document';
      if (event.type === 'extract-xml-doc') {
        self.choice = event.type;
        self.document = event.document;
      }
      if (event.type === 'add-document') {
        self.choice = event.type;
      }
      if (event.type === 'add-bulk-images') {
        self.choice = event.type;
        self.document = event.document;
      }
      if (event.type === 'add-document-choice') {
        self.choice = event.type;
      }
      if (event.type === 'add-document-page') {
        self.choice = event.type;
        self.afterPage = event.afterPage;
        self.document = event.document;
        self.page = event.page;
        self.docParent = event.parent;
        self.docAfter = event.after;
        self.multiple = event.multiple;
      } else if (event.type === 'edit-page') {
        self.choice = event.type;
        self.page = event.page;
      } else if (event.type === 'add-zip') {
        self.choice = event.type;
        self.document = event.document;
      }else if (event.type === 'edit-new-page') {
        self.choice = event.type;
        self.page = event.page;
        self.context = event.context;
        self.document = event.document;
      } else if (event.type === 'message-login') {
        self.choice = event.type;
        self.community = event.community;
      } else if (event.type === 'add-xml-document') {
        self.choice = event.type;
        self.community = event.community;
      } else if (event.type === 'message-login') {
        self.choice = event.type;
        self.community = event.community;
      }  else if (event.type === 'uploadfile-community') {
        self.choice = event.type;
        self.community = event.community;
        self.filetype = event.filetype;
        if (event.filetype=="css") {
            if (!event.community.attrs.css || event.community.attrs.css=="") {
              self.restService.http.get('/app/data/default.css').subscribe(function(cssfile) {
                self.text=cssfile._body;});
            } else self.text=event.community.attrs.css;
        }
        if (event.filetype=="js") {
            if (!event.community.attrs.js || event.community.attrs.js=="") {
              self.restService.http.get('/app/data/default.js').subscribe(function(jsfile) {
                self.text=jsfile._body;});
            } else self.text=event.community.attrs.js;
        }
        if (event.filetype=="dtd") {
            if (!event.community.attrs.dtd || event.community.attrs.dtd=="") {
              self.restService.http.get('/app/data/default.dtd').subscribe(function(dtdfile) {
                self.text=dtdfile._body;});
            } else self.text=event.community.attrs.dtd;
        }
        if (event.filetype=="json") {
            if (!event.community.attrs.ceconfig || event.community.attrs.ceconfig=={}) {
              self.restService.http.get('/app/data/CollEditorConfig.json').subscribe(function(ceconfigfile) {
                self.text=ceconfigfile._body;});
            } else self.text=JSON.stringify(event.community.attrs.ceconfig);
        }
        if (event.filetype=="teiHeader") {
            self.text=event.document.attrs.teiHeader;
            self.doc=event.document;
        }
      }  else if (event.type === 'preview-page') {
          self.choice = event.type;
          self.page = event.page;
          self.error = event.error;
          self.content = event.content;
          self.lines = event.lines;
      }  else if (event.type === 'join-community') {
          self.community = event.community;
          self.choice = event.type;
          if (event.status=="alldolead") self.communityleader=null;
          else self.communityleader=event.communityleader;
          self.status=event.status;
      } else if (event.type === 'parse-xmlload') {
          self.choice = event.type;
          self.error = event.error;
          self.lines = event.lines;
          self.docname = event.docname;
      } else if (event.type ==='info-message'){
          self.choice = event.type;
          self.header=event.header;
          self.message=event.message;
          self.source=event.source;
      } else if (event.type ==='reorder-document'){
          self.choice = event.type;
          self.document=event.document;
      } else if (event.type ==='choosebase-community'){
          self.choice = event.type;
          self.community=event.community;
          self.action='chooseBase';
      } else if (event.type ==='choosebase-choosewitnesses'){
          self.choice = 'choosebase-community';  //let's be economical!
          self.community=event.community;
          self.action='chooseWitnesses';
      } else if (event.type ==='confirm-message'){
          self.choice = event.type;
          self.page=event.page;
          self.docname=event.docname;
          self.prevpage=event.prevpage;
          self.header=event.header;
          self.warning=event.warning;
          self.action=event.action;
          self.document=event.document;
          self.context=event.context;
      }
      $('#manageModal').modal('show');
    });
  },
});


module.exports = ManageModalComponent;
