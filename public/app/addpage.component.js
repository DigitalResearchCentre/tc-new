var $ = require('jquery')
  , UIService = require('./ui.service')
  , CommunityService = require('./community.service')
  , AuthService = require('./auth.service')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AddPageComponent = ng.core.Component({
  selector: 'tc-managemodal-addpage',
  templateUrl: '/app/addpage.html',
  directives: [
    require('../directives/modaldraggable')
  ],
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(communityService, authService, uiService) {
    var self=this;

    this._uiService = uiService;
  }],
  submit: function() {
  },
});

module.exports = AddPageComponent;
