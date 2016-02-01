var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
  , CommunityService = require('./community.service')
  , AuthService = require('./auth.service')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var ManageModalChoiceComponent = ng.core.Component({
  selector: 'tc-managemodal-adddocument',
  templateUrl: '/community/manage/tmpl/add-document.html'
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(communityService, authService, uiService) {
    this._uiService = uiService;
    var self=this;
    this.message="";
    this.success="";
    this._uiService.community$.subscribe(function(id){
      self.community = communityService.get(id);
    });
    /*this for scope variables */
  }],
});

module.exports = ManageModalChoiceComponent;
