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
    require('./community/uploadfile.component'),
  ],
}).Class({
  constructor: [CommunityService, UIService, RESTService, function(communityService, uiService, restService) {
    this._uiService = uiService;
    this.restService=restService;
/*
    this.loginFrame = '/auth?url=/index.html#/home';
    this.loginFrameHeight = 233; */
  }],
  ngOnInit: function() {
    var self = this;
    this._uiService.manageModal$.subscribe(function(event) {
      // 'add-document' || 'add-document-page' || 'add-xml-document' || 'edit-new-page' || 'extract-xml-doc'
      self.choice = event || 'add-document';
      if (event.type === 'add-document-page') {
        self.choice = event.type;
        self.docParent = event.parent;
        self.docAfter = event.after;
      } else if (event.type === 'edit-new-page') {
        self.choice = event.type;
        self.page = event.page;
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
              self.restService.http.get('/app/directives/default.css').subscribe(function(cssfile) {
                self.text=cssfile._body;});
            } else self.text=event.community.attrs.css;
        }
        if (event.filetype=="js") {
            if (!event.community.attrs.js || event.community.attrs.js=="") {
              self.restService.http.get('/app/directives/default.js').subscribe(function(jsfile) {
                self.text=jsfile._body;});
            } else self.text=event.community.attrs.js;
        }
        if (event.filetype=="dtd") {
            if (!event.community.attrs.dtd || event.community.attrs.dtd=="") {
              self.restService.http.get('/app/directives/default.dtd').subscribe(function(dtdfile) {
                self.text=dtdfile._body;});
            } else self.text=event.community.attrs.dtd;
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
      }
      $('#manageModal').modal('show');
    });
  },
});


module.exports = ManageModalComponent;
