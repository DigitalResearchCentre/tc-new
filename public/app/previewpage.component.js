var $ = require('jquery')
  , UIService = require('./ui.service')
  , DocService = require('./services/doc')
  , RESTService = require('./services/rest')
;

var self;
var uploaded=false;

var PreviewPageComponent = ng.core.Component({
  selector: 'tc-managemodal-preview-page',
  templateUrl: '/app/previewpage.html',
  directives: [
    require('../directives/modaldraggable'),
  ],
  inputs: [
    'page', 'error', 'lines', 'content',
  ],
}).Class({
  constructor: [UIService, DocService, RESTService, function(uiService, docService, restService) {
    self=this;
    this.uiService = uiService;
    this.docService = docService;
    this.restService = restService;
    $('#manageModal').width("510px");
    $('#manageModal').height("600px");
    this.message=this.success="";
  }],
  ngOnInit: function() {
    pageContent=this.content;
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

window.uploadDone=function(){
  /* grab css and js file */
  $('#previewdiv').contents().find('body').html(self.content);
  $('#previewdiv').contents().find('body').attr("id", "previewBody");
  self.restService.http.get('http://code.jquery.com/jquery-1.10.2.min.js').subscribe(function(jqueryfile) {
     $('#previewdiv').contents().find('head').append("<script type='text/javascript'>"+jqueryfile._body+"</script>\r");
     self.restService.http.get('/directives/default.css').subscribe(function(cssfile) {
        $('#previewdiv').contents().find('head').append("<style>"+cssfile._body+"</style>\r");
        self.restService.http.get('/directives/default.js').subscribe(function(jsfile) {
             $('#previewdiv').contents().find('body').append("<script type='text/javascript'>"+jsfile._body+"</script>\r");
           });
      });
   });
 }

module.exports = PreviewPageComponent;
