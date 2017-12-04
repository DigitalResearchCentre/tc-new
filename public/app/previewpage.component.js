var $ = require('jquery')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , RESTService = require('./services/rest')
;

var self;
var uploaded=false;

var PreviewPageComponent = ng.core.Component({
  selector: 'tc-managemodal-preview-page',
  templateUrl: '/app/previewpage.html',
  directives: [
    require('./directives/modaldraggable'),
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
  ngOnChanges: function() {
    //remove the iframe element and replace it
    var prevdiv=$('#previewdiv').clone();
    $('#previewdiv').remove();
    prevdiv.appendTo('#predivparent');
  },
  closeModalPP: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
    //force reload of iframe by removing and restoring it
  }
});

window.uploadDone=function(){
  /* grab css and js file */
  var p4=self.content;
    p4=p4.replace(/<head/g, "<h3");
		p4=p4.replace(/<\/head/g, "</h3");
		p4=p4.replace(/<row/g, "<tr");
		p4=p4.replace(/<\/row/g, "</tr");
		p4=p4.replace(/<cell/g, "<td");
		p4=p4.replace(/<\/cell/g, "</td");
    p4=p4.replace(/ rend=/g, " class=");
  $('#previewdiv').contents().find('body').html(p4);  //should we update this? probably. No need to stay with 1.10 version
  self.restService.http.get('https://code.jquery.com/jquery-1.10.2.min.js').subscribe(function(jqueryfile) {
     $('#previewdiv').contents().find('head').append("<script type='text/javascript'>"+jqueryfile._body+"</script>\r");
     self.restService.http.get('/app/data/default.css').subscribe(function(cssfile) {
        $('#previewdiv').contents().find('head').append("<style>"+cssfile._body+"</style>\r");
        self.restService.http.get('/app/data/default.js').subscribe(function(jsfile) {
             $('#previewdiv').contents().find('body').append("<script type='text/javascript'>"+jsfile._body+"</script>\r");
           });
      });
   });
 }

module.exports = PreviewPageComponent;
