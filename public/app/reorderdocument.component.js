var $ = require('jquery');
var URI = require('urijs')
  , Router = ng.router.Router
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , config = require('./config')
;

var ReorderDocumentComponent = ng.core.Component({
  selector: 'tc-managemodal-reorder-document',
  templateUrl: '/app/reorderdocument.html',
  inputs: ['document'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [Router, DocService, UIService, function(
    router, docService, uiService
  ) {
    var self=this, origpages=[], origchildren=[];
//    var Doc = TCService.Doc, doc = new Doc();
    this.doc = {name:"", label: 'text'};
    $('#manageModal').width("541px");
    $('#manageModal').height("600px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.state= uiService.state;
    this._docService = docService;
    this._router = router;
    /*this for scope variables */
    this.state = uiService.state;
//    this.pages = [{'name':'1r', 'id': 'xxx', 'facs':'yyy'},{'name':'2v', 'id':'xxx2'},{'name':'1v', 'id':'xxx3', 'facs':'aa1'},{'name':'2r', 'id':'aaax'},{'name':'2v', 'id':'xxx2'},{'name':'1v', 'id':'xxx3', 'facs':'aa1'},{'name':'2r', 'id':'aaax'},{'name':'2v', 'id':'xxx2'},{'name':'1v', 'id':'xxx3', 'facs':'aa1'},{'name':'12r', 'id':'aaax'},{'name':'12v', 'id':'xxx2'},{'name':'11v', 'id':'xxx3', 'facs':'aa1'},{'name':'22r', 'id':'aaax'},{'name':'22v', 'id':'aaax'}, {'name':'26r', 'id':'aaax'}];
  }],
  ngOnInit: function(){
    this.origpagesids=this.document.attrs.children.map(function(page) {return(page.attrs._id)});
  },
  nullSuccess: function(){
    if (this.success=="Changes saved") this.success="(Changes not saved)"
    else this.success="";
  },
  ngOnChanges: function() {
    $("#TCreorderpages" ).sortable({});
//    $( "#TCreorderpages" ).sortable({});
    var self=this;
    //issue: this.document may NOT be in sync with state.document. IN that case, have to call up the pages from the database
    //in that case: document children will not be updated
    $.post(config.BACKEND_URL+'isDocTranscript?'+'docid='+this.document._id, function(res) {
      self.isDocText=res.isDocText;
      if (!res.isDocText) {
        self.message="";
        $("li").css("cursor", "-webkit-grab");
        $("#TCreorderpages" ).sortable("enable");
      } else {
        self.message="Transcription present in document. Pages cannot be reordered.";
        $("li").css("cursor", "default");
        $("#TCreorderpages" ).sortable( "disable" );
      }
    });
    if (!this.state.document || (this.document.attrs.name!=this.state.document.attrs.name)) {
      $.post(config.BACKEND_URL+'getDocPages?'+'document='+this.document._id, function(res) {
        origchildren=res.children;
        var pages=res.children.map(function(pageid) {
            var thismatch=res.pages.filter(function (obj){return obj._id==pageid})[0];
            return ({'name': thismatch.name, 'id':pageid, 'facs': thismatch.facs || ""});
        })
        origpages = JSON.parse(JSON.stringify(pages));
        self.pages=pages;
      });
    } else {
      origchildren=this.state.document.attrs.children;
      var pages=origchildren.map(function(page){return({'name':page.attrs.name, 'id':page._id, 'facs':page.attrs.facs || ""})});
      origpages=JSON.parse(JSON.stringify(pages));
      self.pages=pages;
    }
  },
  closeModalRP: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    this.doc = {name:"", label: 'text'};
    $('#manageModal').modal('hide');
  //     location.reload(true); //don't reload whole window. That's ugly
  },
  submit: function() {
    var self=this, reordered=[];
    var names=self.pages.map((page)=>{return (page.name)});
    var rows=$('#TCreorderpages').children();
    this.message="";
    rows.each(function(){
      reordered.push(this.id);
    })
    //ok ... any duplicate names here? lovely code from stackOverflow..thx
    var uniq = names
      .map((name) => {return {count: 1, name: name}})
      .reduce((a, b) => { a[b.name] = (a[b.name] || 0) + b.count; return a}, {})
    var duplicates = Object.keys(uniq).filter((a) => uniq[a] > 1)
    if (duplicates.length>0) {
      var duplicatesStr="";
      duplicates.map(function (name){duplicatesStr+=name+" "});
      if (duplicates.length==1) this.message="Page "+duplicatesStr+"appears more than once";
      if (duplicates.length>1) this.message="Pages "+duplicatesStr+"appear more than once";
      return;
    } else {
      //rightoh. if there are no changes no need to do anything at all. So compare this.pages with reordered...
      var differences=self.pages.map(function(page, index) {
        if (origpages[index].id!=page.id || origpages[index].name != page.name || origpages[index].facs != page.facs )
        return(page);
        else return "";
      });
      //so: we have differences in elements in differences array, and reordered page order in reordered. Send them to the database
      for (var i = 0; i < differences.length; i++) {
        if (differences[i]=="") differences.splice(i--, 1);
      }
      if (differences.length>0 || JSON.stringify(reordered)!=JSON.stringify(this.origpagesids)) {
          if (JSON.stringify(reordered)==JSON.stringify(this.origpagesids)) reordered=[];
        //post this off to save to server. standard jquery post does not work with json data in string
          $.ajax({
          url: config.BACKEND_URL+'saveDocPages?'+'document='+self.document._id,
          type: 'POST',
          data:  JSON.stringify({replace:differences,order:reordered,origorder:this.origpagesids}),
          accepts: 'application/json',
          contentType: 'application/json; charset=utf-8',
          dataType: 'json'
        })
         .done(function( data ) {
           self.success="Changes saved";
           self.uiService.docService$.emit({
             type: 'refreshDocument',
             payload: self.document,
           });
           self.origpagesids=reordered;
          })
         .fail(function( jqXHR, textStatus, errorThrown) {
          alert( "error" + errorThrown );
        });
      }
    }
//    console.log(duplicates) // [ 'Nancy' ]
  }
});

module.exports = ReorderDocumentComponent;
