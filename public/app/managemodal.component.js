var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
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
    require('./extractxmldoc.component')
  ],
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(communityService, authService, uiService) {
    this._uiService = uiService;
/*
    this.loginFrame = '/auth?url=/index.html#/home';
    this.loginFrameHeight = 233; */

    this.init();
  }],
  init: function() {
    var self = this;
    this._uiService.manageModal$.subscribe(function(event) {
      self.choice = event || 'add-document' || 'add-document-page' || 'add-xml-document' || 'edit-new-page' || 'extract-xml-doc';
      $('#manageModal').modal('show');
    });
  },
});


module.exports = ManageModalComponent;
