var $ = require('jquery');
var UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , Router = ng.router.Router
  , async = require('async')
;

var ExportTC1DBVersionComponent = ng.core.Component({
  selector: 'tc-managemodal-export-tc1dbversion',
  templateUrl: '/app/exporttc1dbversion.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/filereader')
  ],
}).Class({
  constructor: [
    Router, CommunityService, UIService, DocService, function(
      router, communityService, uiService, docService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    this._router = router;
    this.doc = {name:""};
    $('#manageModal').width("400px");
    $('#manageModal').height("600px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.docService = docService;
    this.users=[];
    this.cAbbrev="";
    this.docName="";
    }],
  ngOnInit: function() {
    var self = this;
  },
  exportDBVersion: function(){
    var self=this;
    if (this.docName==""||this.cAbbrev=="") {
      this.message="You must specify a document and community";
      return;
    }
    if (this.uiService.state.community.attrs.abbr!=this.cAbbrev) {
      this.message="You must select community "+this.cAbbrev;
      return;
    }
    //need to get full tei info for page breaks
    $.get("http://textualcommunities.usask.ca/api/communities/?format=json", function (communities, status) {
      var myCommunity=communities.filter(function (obj){return (obj.abbr== self.cAbbrev);})[0];
      if (!myCommunity) {
        self.message="Can't find community "+self.cAbbrev;
        return;
      }
      self.success="Found the community "+self.cAbbrev;
      $.get("http://textualcommunities.usask.ca/api/communities/"+myCommunity.id+"/docs/?format=json", function (documents, status) {
        var myDocument=documents.filter(function (obj){return (obj.name== self.docName);})[0];
        if (!myDocument) {
          self.message="Can't find document "+self.docName+" in community "+self.cAbbrev;
          return;
        }
        self.success+=" Found the document "+self.docName+" ";
        $.get("http://textualcommunities.usask.ca/api/v1/doc/?parent="+myDocument.id+"&fields=facs&limit=0&format=json", function (mypages, status) {
          self.success+=mypages.objects.length+" pages found in "+self.docName+". <br/>Now retrieving page information and xml for each page: ";
          var now = new Date();
          var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          var xmldb= '<?xml version="1.0" ?>\r<TEI><teiHeader>\r<fileDesc>\r<titleStmt>\r<title>John Donne Digital Prose document '+self.doc.name+'\r</title>\r</titleStmt>\r<publicationStmt>\r<p>Prepared for the Textual Communities system</p>\r</publicationStmt>\r<sourceDesc>\r<p>Exported from version 1 of Textual Communities</p>\r</sourceDesc>\r</fileDesc>\r<revisionDesc>\r<change when="'+now+'">Created on '+days[now.getDay()]+' '+now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear()+' by '+state.authUser.attrs.local.name+' ('+state.authUser.attrs.local.email+')</change>\r</revisionDesc>\r</teiHeader>\r<text>';
          var pagecount=0;
          var docpart="";
          async.mapSeries(mypages.objects, function(mypage, callback) {
            $.get("http://textualcommunities.usask.ca/api/docs/"+mypage.id+"/xml/", function (myxml, status) {
              self.success+=mypage.name+" ";
              var result=transformTC1Transcript(myxml[0], mypage, self, docpart);
              if (result.error=="error") callback("error", [])
              else {
                xmldb+=result.xml;
                docpart=result.docpart;
                pagecount++;
                if (pagecount==10) callback("error", [])  //force end
                else callback(null,[]);
              }
            });
          }, function (err, result) {
              self.success+="\rAll pages processed. Writing xml to file "+self.doc.name+".xml";
              download(xmldb, self.docName, 'text/xml')
          });
          //actually could be additional pages in TC2 community. So only need to check that EVERY page label in TC1 has a counterpart in TC2r
          //move _id from TC2 into array while we do it
          //ok, need all the memberships and the users to find out who is doing What
        });
      });
    });
  },
  closeModalVM: function() {
    this.message=this.success=this.cAbbrev="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});

function getChild(parent) {
  var child=parent.firstChild;
  var before="";
  while (child && (child.nodeName=="#text"||child.nodeName=="lb"||child.nodeName=="cb") || !child.firstChild && child.nextSibling) {
    if (child.nodeName==="#text") before+=child.nodeValue;
    if (child.nodeName=="lb"||child.nodeName=="cb") before+=child;
    child=child.nextSibling;
  }
  return({element:child, before:before});
}

function transformTC1Transcript(source, mypage, context, docpart) {
  //put it in a xml dom
  var myXMLDOM = new DOMParser().parseFromString(source, "text/xml");
  var thispage="";
  var currentelements=[];
  //walk our way down doctree till we get what we need
  var root=getChild(myXMLDOM).child;
  if (root.nodeName!="text") {
      context.success+="ERROR!!! text element not found in page "+mypage.n;
      return({error:"error"});
  }
  //have we got body, front, back?
  var thisdocpart=getChild(root).child;
  if (thisdocpart.nodeName!="front"&&thisdocpart.nodeName!="body"&&thisdocpart.nodeName!="back") {
      context.success+="ERROR!!! front, body, or back element not found in page "+mypage.n;
      return({error:"error"});
  }
  if (thisdocpart.nodeName!=docpart) {
    if (docpart!="") thispage+="</"+thisdocpart.nodeName+">\r"
  }
  //ok..what have we got..check out first children
  //keep descending till we hit a non-entity child
  var entity=getChild(thisdocpart);
    var isEntity=true;
  while (entity.element && isEntity) {
    var currAttributes=[];
    isEntity=false;
    if (entity.element.attributes.length>0) {
      for (var i=0; i<entity.element.attributes.length; i++) {
        currAttributes.push({attr:entity.element.attributes[i].nodeName, value:entity.element.attributes[i].nodeValue})
        if (entity.element.attributes[i].nodeName=="n") isEntity=true;
      }
    }
    currentelements.push({element:entity.element.localName, attributes:currAttributes, before:entity.element.before});
    if (isEntity) entity=getChild(entity);
  }
  thispage+='\r<pb n="'+mypage.name+'"';
  if (mypage.facs) thispage+=' facs="'+mypage.facs+'"';
  thispage+='/>\r'
  if (thisdocpart.localName!=docpart) thispage+="<"+thisdocpart.localName+">\r"
  return({xml:thispage, error:"", docpart:thisdocpart.localName})
}

function download(content, filename, contentType)
{
    if(!contentType) contentType = 'application/octet-stream';
        var a = document.createElement('a');
        var blob = new Blob([content], {'type':contentType});
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.click();
}

module.exports = ExportTC1DBVersionComponent;
