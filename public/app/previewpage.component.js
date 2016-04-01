var $ = require('jquery')
  , UIService = require('./ui.service')
  , DocService = require('./services/doc')
;

var PreviewPageComponent = ng.core.Component({
  selector: 'tc-managemodal-preview-page',
  templateUrl: '/app/previewpage.html',
  directives: [
    require('../directives/modaldraggable'),
    require('../directives/newpageprose.component'),
    require('../directives/newpagepoetry.component'),
    require('../directives/newpageplay.component'),
  ],
  inputs: [
    'page',
  ],
}).Class({
  constructor: [UIService, DocService, function(uiService, docService) {
    var self=this;
    this.uiService = uiService;
    this.docService = docService;
    $('#manageModal').width("510px");
    $('#manageModal').height("600px");
    this.message=this.success="";
  }],
  ngOnInit: function() {
    var self=this;
//    this.page=page;
    this.docService.getLinks(this.page).subscribe(function(data) {
      self.prev=data.prev;
    });
  },
  closeModalPP: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  }
});

module.exports = PreviewPageComponent;
