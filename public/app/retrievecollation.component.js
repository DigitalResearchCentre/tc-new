var $ = require('jquery')
  , CommunityService = require('./services/community')
  , config = require('./config')
;

var RetrieveCollationComponent = ng.core.Component({
  selector: 'tc-managemodal-retrievecollation',
  templateUrl: '/app/retrievecollation.html',
  inputs : ['community'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [CommunityService, function(communityService) {
//    var Doc = TCService.Doc, doc = new Doc()
    this._communityService = communityService;
    this.message=this.success=this.header;""
    }],
  closeModalCE: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  ngOnInit: function() {
    this.header="Retrieve Collation for "+this.community.attrs.name;
  },
  ngOnChanges: function() {
//    this.communi
    this.message="";
    this.success="";
    $('#manageModal').width("500px");
    $('#manageModal').height("210px");
  },
  submit: function(){
      var self=this;
      $.get(config.BACKEND_URL+'getCollations/?community='+this.community.attrs.abbr, function(res) {
          var bill=res;
          self.success="Collation for "+res.length+" block(s) found. Now downloading..Check your downloads folder; close this window when it is downloaded"
          download("["+res+"]", self.community.attrs.abbr+"-COLLATION", "application/json")
      });
  }
});

function download(content, filename, contentType)
{
    if(!contentType) contentType = 'application/octet-stream';
    var a = document.createElement('a');
    var blob = new Blob([content], {'type':contentType});
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}


module.exports = RetrieveCollationComponent;
