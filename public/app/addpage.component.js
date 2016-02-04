var $ = require('jquery')
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AddPageComponent = ng.core.Component({
  selector: 'tc-managemodal-addpage',
  templateUrl: '/community/manage/tmpl/add-document-page.html',
  directives: [
    require('../directives/modaldraggable')
  ],
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(communityService, authService, uiService) {
    var self=this;
    this._uiService = uiService;
    this.message="";
    this.success="";
    $('#manageModal').width("430px");
    $('#manageModal').height("355px");
    this.oneormany="OnePage";
    this.pageName="";
  }],
  submit: function() {
  },
});

module.exports = AddPageComponent;
