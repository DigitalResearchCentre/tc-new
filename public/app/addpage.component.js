var $ = require('jquery')
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
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
  constructor: [
    CommunityService, AuthService, UIService, DocService,
  function(
    communityService, authService, uiService, docService
  ) {

    var self=this;
    this._uiService = uiService;
    this._docService = docService;
    this.message="";
    this.success="";
    $('#manageModal').width("430px");
    $('#manageModal').height("355px");
    this.oneormany="OnePage";
    this.pageName="";
    console.log("addpage");
  }],
  submit: function() {
    this._docService.addPage({
      parent: '56b3c5ddaa381b543ead3592',
      name: '1r',
    }).subscribe(function(page) {
      console.log(page);
      
    })
  },
});

module.exports = AddPageComponent;
