var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
  , CommunityService = require('./community.service')
  , AuthService = require('./auth.service')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var ManageModalComponent = ng.core.Component({
  selector: 'tc-manage-modal',
  templateUrl: '/app/managemodal.html',
  directives: [
    require('./managemodalchoice.component'),
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
    this._uiService.manageModel$.subscribe(function(event) {
      self.choice = event.choice || 'add-document';
      $('#manageModal').modal('show');
    });
  },
});


module.exports = ManageModalComponent;
