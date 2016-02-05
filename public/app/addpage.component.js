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
    this._docService = docService;
    this.uiService = uiService;
    this.message="";
    this.success="";
    $('#manageModal').width("430px");
    $('#manageModal').height("355px");
    this.oneormany="OnePage";
    this.pageName="";
    this.page={http:""};
  }],
  showSingle: function() {
    $("#MMADPsingle").show();
    $("#MMADPmultiple").hide();
  },
  showMany: function(){
    $("#MMADPsingle").hide();
    $("#MMADPmultiple").show();
  },
  fromFile: function() {
    $("#MMAPPSingleFile").show();
    $("#MMAPPSingleWeb").hide();
  },
  fromWeb: function(){
    $("#MMAPPSingleWeb").show();
    $("#MMAPPSingleFile").hide();
  },
  fromZip: function() {
    $("#MMAPPMFF").show();
    $("#MMAPPMFDD").hide();
  },
  fromDD: function(){
    $("#MMAPPMFDD").show();
    $("#MMAPPMFF").hide();
  },
  submit: function() {
    this._docService.addPage({
      parent: '56b3c5ddaa381b543ead3592',
      name: '1r',
    }).subscribe(function(page) {
      console.log(page);
    })

    if (this.oneormany=="OnePage") {
      if (this.pageName=="") {
        this.message="You must supply a name for the page";
        return;
      } else {
        this.message="";
        this.success="Page added"
      }
    }
   },
   closeModalAP: function() {
     this.message=this.success=this.pageName="";
     $('#manageModal').modal('hide');
   }
});

module.exports = AddPageComponent;
