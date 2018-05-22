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
          var hasPrevContent=false;
          var docpart="";
          var previouselements=[];
          async.mapSeries(mypages.objects, function(mypage, callback) {
            self.success+=mypage.name+" ";
            if (mypage.name=="1000") {
              callback(null, [])
            } else {
              $.get("http://textualcommunities.usask.ca/api/docs/"+mypage.id+"/xml/", function (myxml, status) {
                var result=transformTC1Transcript(myxml[0], mypage, self, docpart, previouselements, hasPrevContent);
                if (result.error=="error") {
                  xmldb+='<pb n="'+mypage.name+'"';
                  if (mypage.facs) xmldb+=' facs="'+mypage.facs+'"';
                  xmldb+='/>\r';
                  callback(null, [])
                }
                else {
                  xmldb+=result.xml;
                  docpart=result.docpart;
                  previouselements=result.previouselements;
                  hasPrevContent=result.hasPrevContent;
                  pagecount++;
                  /* if (pagecount==20) callback("error", [])  //force end
                  else */ callback(null,[]);
                }
              });
            }
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

function getRightSibling(element) {
  if (!element.dom) {
    return {element: element.element, before:"", currAttributes: element.currAttributes, isEntity: element.isEntity, dom: null, writopen: element.writopen, lastel: element.lastel, nVal:element.nVal};
  }
  var next=element.dom.nextSibling;
  var before="";
  var isEntity=false;
  var isPrev=false;
  var nVal="-1";
  var currAttributes=[];
  while (next && (next.nodeName=="#text"||next.nodeName=="lb"||next.nodeName=="cb")) {
    if (next.nodeName==="#text") before+=next.nodeValue;
    if (next.nodeName=="lb"||next.nodeName=="cb") before+="<"+next.nodeName+getAttributes(next)+"/>";
    next=next.nextSibling;
  }   //keep record of element to use in next page
  if (!next) return({element: element.element, before:"", currAttributes: element.currAttributes, isEntity: element.isEntity, dom: null, writopen: element.writopen,  lastel:"", nVal:element.nVal});
  if (next.attributes.length>0) {
    for (var i=0; i<next.attributes.length; i++) {
      currAttributes.push({attr:next.attributes[i].nodeName, value:next.attributes[i].nodeValue})
      if (next.attributes[i].nodeName=="n") {isEntity=true; nVal=next.attributes[i].nodeValue}
      if (next.attributes[i].nodeName=="prev") isPrev=true;
    }
  }
  if (next.innerHTML.trim()=="") { //nothing here!
    return({element: element.element, before:"", currAttributes: element.currAttributes, isEntity: element.isEntity, dom: null, writopen: element.writopen, lastel: element.lastel, nVal:element.nVal});
  }
  else {
      var fred={element:next.localName, before:before, currAttributes: currAttributes, isEntity: isEntity, dom: next, writopen: false, lastel: "", isPrev:isPrev, nVal:nVal};
      return(fred);
  }
}

function getChild(parent) {
  var child=parent.firstChild;
  var before="";
  var isEntity=false;
  var isPrev=false;
  var nVal="-1";
  var currAttributes=[];
  while (child && (child.nodeName=="#text"||child.nodeName=="lb"||child.nodeName=="cb") && !child.firstChild && child.nextSibling) {
    if (child.nodeName==="#text") before+=child.nodeValue;
    if (child.nodeName=="lb"||child.nodeName=="cb") before+="<"+child.nodeName+getAttributes(child)+"/>";
    child=child.nextSibling;
  }
  if (!child || !child.attributes) return {element:null, before:"", currAttributes: [], isEntity: false, isPrev: false, nVal:""}
  if (child.attributes.length>0) {
    for (var i=0; i<child.attributes.length; i++) {
      currAttributes.push({attr:child.attributes[i].nodeName, value:child.attributes[i].nodeValue})
      if (child.attributes[i].nodeName=="n") {isEntity=true; nVal=child.attributes[i].nodeValue;}
      if (child.attributes[i].nodeName=="prev") isPrev=true;
    }
  }
  return {element:child, before:before, currAttributes: currAttributes, isEntity: isEntity, dom: child, isPrev: isPrev, nVal:nVal};
}


function transformTC1Transcript(source, mypage, context, docpart, previousElements, hasPrevContent) {
  //ut it in a xml dom
  var myXMLDOM = new DOMParser().parseFromString(source, "text/xml");
  var thispage="";
  var currentelements=[];
  var thispb="";
  var hasContent=false;
  //walk our way down doctree till we get what we need
  var root=getChild(myXMLDOM).element
  if (mypage.name=="80") {
    var bill=1;

  }
  if (root.nodeName!="text") {
      context.success+="ERROR!!! text element not found in page "+mypage.n;
      return {error:"error"};
  }
  //have we got body, front, back?
  var thisdocpart=getChild(root).element;
  if (!thisdocpart||(thisdocpart.nodeName!="front"&&thisdocpart.nodeName!="body"&&thisdocpart.nodeName!="back")) {
      context.success+="ERROR!!! front, body, or back element not found in page "+mypage.name;
      return {error:"error"};
  }
  if (thisdocpart.nodeName!=docpart) {
    if (docpart!="") thispage+="</"+thisdocpart.nodeName+">\r"
  }
  //ok..what have we got..check out first children
  //keep descending till we hit a non-entity child
  var entity=getChild(thisdocpart);
  //maybe no child!
  if (!entity.element) {
    if (hasPrevContent) thispb+="\r"
    thispb+='<pb n="'+mypage.name+'"';
    if (mypage.facs) thispb+=' facs="'+mypage.facs+'"';
    thispb+='/>\r'
    return {xml:thispb, error:"", docpart:thisdocpart.localName, previouselements:[], hasPrevContent:hasContent}
  }
  //maybe not entity
  if (!entity.isEntity) {
    if (hasPrevContent) thispb+="\r"
    thispb+='<pb n="'+mypage.name+'"';
    if (mypage.facs) thispb+=' facs="'+mypage.facs+'"';
    thispb+='/>\r'
    thispb+=entity.dom.outerHTML;
    return {xml:thispb, error:"", docpart:thisdocpart.localName, previouselements:[], hasPrevContent:hasContent}
  }
  while (entity.element && entity.isEntity) {
    currentelements.push({element:entity.element.localName, isEntity:entity.isEntity, currAttributes:entity.currAttributes, before:entity.before, dom:entity.element, writopen: false, lastel:"", isPrev:entity.isPrev, nVal:entity.nVal});
    entity=getChild(entity.element);
  }
  if (hasPrevContent) thispb+="\r"
  thispb+='<pb n="'+mypage.name+'"';
  if (mypage.facs) thispb+=' facs="'+mypage.facs+'"';
  thispb+='/>\r'
  if (currentelements.length==0) {
    //top element is a just a <p> or similar, or indeed might be empty.
    //if empty: write nothing back
    //close all open elements
    for (var i=0; i<previousElements.length; i++) {
      thispage+="</"+previousElements[i].element+">\r";
    }  //get the right sibling too...
    if (thisdocpart.localName!=docpart) thispage+="<"+thisdocpart.localName+">\r";
    if (entity.element.innerHTML.trim()=="") {
      return {xml:thispage+thispb, error:"", docpart:thisdocpart.localName, previouselements:[], hasPrevContent:hasContent};
    } else {
      var bill=2;
    }
  } else {
    //write end elements, if that is what we have...
    for (var i=currentelements.length-1; i>=0; i--) {  //assume same div typen
      if (previousElements[i]&&previousElements[i].nVal!=currentelements[i].nVal) thispage+="\r</"+previousElements[i].element+">\r";
    }
    if (thisdocpart.localName!=docpart) thispage+="<"+thisdocpart.localName+">\r";
    thispage+=thispb;
  }
  var pageFinished=false;
  while (!pageFinished) {
    if (currentelements.length>0) {
      for (var i=0; i<currentelements.length; i++) {
        if (i==0 && currentelements.length>1 && !currentelements[1].dom) {
          var bill=0;
          currentelements[0]=getRightSibling(currentelements[0]);
          if (!currentelements[0].dom) {
            pageFinished=true; i=currentelements.length; continue;
          }
          //this is a hack .. odd things happening here..in entity at top level which is a sibling of first top
          context.success+="warning -- processing right sibling of top entity for page "+mypage.name+". Context is "+source;
          for (var j=currentelements.length-1; j>=0; j--) {  //assume same div typen
            thispage+="\r</"+currentelements[j].element+">\r";
          }
          thispage+=currentelements[0].dom.outerHTML;
          pageFinished=true;
          i=currentelements.length;
          continue;
        }
        if (currentelements[i].lastel!="") thispage+="</"+currentelements[i].lastel+">";
        if (!currentelements[i].writopen && (!currentelements[i].isPrev ||  (currentelements[i].isPrev && (!previousElements[i] || previousElements[i].nVal!=currentelements[i].nVal)))) { thispage+=makeElement(currentelements[i]);
            currentelements[i].writopen=true; }
        if (i==currentelements.length-1) {
          //now, could be that while the first child is NOT an entity element, it may have a right sibiling (perhpas, bunches of them) with are entity elements
          //so need to test. if it has a right sibling which is an entity, then we need to work differently
          if (currentelements[i].dom) thispage+=currentelements[i].dom.innerHTML;
          hasContent=true;
          var lastel=currentelements[i].element;
          currentelements[i]=getRightSibling(currentelements[i]);
          //if this one is an entity... down we go! else, if element, keep writing siblings. If no element: up a level and next sib
          if (currentelements[i].dom) {
              thispage+="</"+lastel+">\r";}
          if (!currentelements[i].dom) { //at end of this level
            //move level above up...and remove this level (add back if ancester rightsibling has descendants)
            if (i>0) {
              currentelements[i-1]=getRightSibling(currentelements[i-1]);
              hasContent=true;
              if (currentelements[i-1].dom) { //we have one.. does it have children???
                //close descendants, and this element
                thispage+="</"+currentelements[i].element+">\r";
                thispage+="</"+currentelements[i-1].element+">\r";
                thispage+=makeElement(currentelements[i-1]);
                currentelements[i-1].writopen=true;
                entity=getChild(currentelements[i-1].dom); //do we have children...? in that case
                while (entity.element && entity.isEntity) {
                  currentelements.splice(i); //get rid of last one, and replace
                  currentelements.push({element:entity.element.localName, currAttributes:entity.currAttributes, before:entity.before, dom:entity.element, writopen: false, lastel:"", isPrev:entity.isPrev, nVal:entity.nVal});
                  entity=getChild(entity.element);
                }
              } else { //there is no right sibling! up we go again....get rid of last element..
                if (i>1) {
                  currentelements[i-2]=getRightSibling(currentelements[i-2]);
        //          currentelements.splice(-1);
                  hasContent=true;
                  if (currentelements[i-2].dom) { //we have one.. does it have children???
                    //close descendants, and this element
                    thispage+="</"+currentelements[i].element+">\r";
                    thispage+="</"+currentelements[i-1].element+">\r";
                    thispage+="</"+currentelements[i-2].element+">\r";
                    thispage+=makeElement(currentelements[i-2]);
                    currentelements[i-2].writopen=true;
                    entity=getChild(currentelements[i-2].dom); //do we have children...? in that case
                    while (entity.element && entity.isEntity) {
                      currentelements[i-1]={element:entity.element.localName, currAttributes:entity.currAttributes, before:entity.before, dom:entity.element, writopen: false, lastel:"", isPrev:entity.isPrev, nVal:entity.nVal};
                      i++;
                      entity=getChild(entity.element);
                    }
                  } else {
                    if (i>2) {
                      currentelements[i-3]=getRightSibling(currentelements[i-3]);
            //          currentelements.splice(-1);
                      hasContent=true;
                      if (currentelements[i-3].dom) { //we have one.. does it have children???
                        //close descendants, and this element
                        if (currentelements[i-3].lastel!="") thispage+="</"+currentelements[i-3].lastel+">";
                        thispage+=makeElement(currentelements[i-3]);
                        currentelements[i-3].writopen=true;
                        entity=getChild(currentelements[i-3].dom); //do we have children...? in that case
                        while (entity.element && entity.isEntity) {
                          currentelements[i-2]={element:entity.element.localName, currAttributes:entity.currAttributes, before:entity.before, dom:entity.element, writopen: false, lastel:"", isPrev:entity.isPrev, nVal:entity.nVal};
                          i++;
                          entity=getChild(entity.element);
                        }
                      } else {
                        var bill=0;
                      }
                    }
                  }
                } else {
                  pageFinished=true;
                }
              }
            } else {
              pageFinished=true;
            }
          }
        }
      }
    }
  }
  return {xml:thispage, error:"", docpart:thisdocpart.localName, previouselements:currentelements, hasPrevContent: hasContent};
}

function makeElement(element) {
  var mypage="";
  mypage+=element.before;
  mypage+="<"+element.element;
  if (element.currAttributes.length>0) {
    for (var i=0; i<element.currAttributes.length; i++) {
      if (element.currAttributes[i].attr!="prev")  mypage+=" "+element.currAttributes[i].attr+'="'+element.currAttributes[i].value+'"';
    }
  }
  mypage+=">";
  return mypage;
}

function getAttributes(element) {
  var attrs=""
  if (element.attributes.length==0) return attrs;
  else {
    for (var i=0; i<element.attributes.length; i++) {
      attrs+=' '+element.attributes[i].nodeName+'="'+element.attributes[i].nodeValue+'"';
    }
  }
  return attrs;
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
