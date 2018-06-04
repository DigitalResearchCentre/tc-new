var $ = require('jquery');
var UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , Router = ng.router.Router
  , async = require('async')
;

var ExportTC1TranscriptsComponent = ng.core.Component({
  selector: 'tc-managemodal-export-tc1transcripts',
  templateUrl: '/app/exporttc1transcripts.html',
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
  moveTranscripts: function(){
    var self=this;
    if (this.docName==""||this.cAbbrev=="") {
      this.message="You must specify a document and community";
      return;
    }
    if (this.uiService.state.community.attrs.abbr!=this.cAbbrev) {
      this.message="You must select community "+this.cAbbrev;
      return;
    }
    var myTC2Document=this.uiService.state.community.attrs.documents.filter(function (obj){return (obj.attrs.name== self.docName);})[0];
    if (!myTC2Document) {
      this.message="Document "+self.docName+" is not in community "+self.cAbbrev;
      return;
    }
    //need to get full tei info for page breaks
    $.post(config.BACKEND_URL+'getPbTEIs?docid='+myTC2Document._id, function(teis) {
      var teiPages=teis;
      self.docService.refreshDocument(myTC2Document).subscribe(function(doc) {  //update so we know all the pages
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
              self.success+=" Found the document "+self.docName;
              $.get("http://textualcommunities.usask.ca/api/docs/"+myDocument.id+"/has_parts/?format=json", function (mypages, status) {
                //ok, now we need to match each page label
                if (mypages.length!=myTC2Document.attrs.children.length) {
                  self.message=mypages.length+" pages found in TC1 community, "+myTC2Document.attrs.children.length+" pages in TC2 community. Careful!"
                }
                //actually could be additional pages in TC2 community. So only need to check that EVERY page label in TC1 has a counterpart in TC2r
                //move _id from TC2 into array while we do it
                var unmatched="";
                for (var i=0; i<mypages.length; i++) {
                  var matchpage=myTC2Document.attrs.children.filter(function (obj){return (obj.attrs.name== mypages[i].name);})[0];
                  if (!matchpage) unmatched+=mypages[i].name+" ";
                  else {
                    mypages[i].tc2_id=matchpage._id;
                  }
                  //match against teiPages\
                  if (matchpage) {
                    var teipage=teiPages.filter(function (obj){return (obj.name== mypages[i].name);})[0];
                    if (teipage) mypages[i].attrs=teipage.attrs;
                    else {
                      var bill=1;
                      mypages[i].attrs={n:"ERROR"};
                    }
                  }
                }
                if (unmatched!="") self.message+=" Unmatched pages in TC1, not in TC2: "+unmatched;
                else self.success+=" Found and matched "+mypages.length+" pages"
                //ok, need all the memberships and the users to find out who is doing What
                $.get("http://www.textualcommunities.usask.ca/api/memberships/?format=json", function(myMemberships, status) {
                    self.success+=" TC1 memberships loaded"
                    $.get("http://www.textualcommunities.usask.ca/api/users/?format=json", function(myUsers, status) {
                      self.success+=" TC1 users loaded. Building page level information. Reading.."
                      //ok, now we adjust the pages info. Do this async.
                      var counter=0;
                      async.mapSeries(mypages, function (mypage, callback){
                        counter++;
                        if (counter%5==0) self.success+=counter+" ";
                        //get the tasks for this page
                        $.get("http://www.textualcommunities.usask.ca/api/tasks/?doc="+mypage.id+"&format=json", function(mytasks, status){
                          var tasks=[];
                          for (var k=0; k<mytasks.length; k++) {
                            //identify the user from the membership
                            var thisMembership=myMemberships.filter(function (obj){return (obj.id== mytasks[k].membership);})[0]
                            if (thisMembership) {
                              var thisUser=myUsers.filter(function (obj){return (obj.id== thisMembership.user);})[0];
                              var mystatus="";
                              if (mytasks[k].status==0) {mystatus="ASSIGNED"} else if (mytasks[k].status==1) {mystatus="IN_PROGRESS"} else if (mytasks[k].status==2) {mystatus="SUBMITTED"} else {mystatus="ASSIGNED"}
                              if (thisMembership&&thisUser) { //create the tasks for this page
                                tasks.push({name:thisUser.first_name+" "+thisUser.last_name, email:thisUser.email, witname: self.docName, status: mystatus})
                              } else {
                                tasks.push({name:"Peter Robinson", email:"peter.robinson@usask.ca", witname: self.docName, status: mytasks[k].status})
                              }
                            }
                          }
                          mypage.tasks=tasks;
                          //now get the revisions for this page and then callback
                          $.get("http://www.textualcommunities.usask.ca/api/docs/"+mypage.id+"/has_revisions/?format=json", function(myrevisions, status) {
                              var revisions=[];
                              for (var k=0; k<myrevisions.length; k++) {
                                var thisUser=myUsers.filter(function (obj){return (obj.id==myrevisions[k].user);})[0];
                                var mystatus="";
                                //reform the revision here
                                myrevisions[k].text=transformTC1Transcript(myrevisions[k].text, mypage);
                                if (myrevisions[k].status==0) {mystatus="ASSIGNED"} else if (myrevisions[k].status==1) {mystatus="IN_PROGRESS"} else if (myrevisions[k].status==2) {mystatus="SUBMITTED"} else {mystatus="ASSIGNED"}
                                revisions.push({doc:mypage.tc2_id, text: myrevisions[k].text, community: self.uiService.state.community._id, status: mystatus, email:thisUser.email, created: myrevisions[k].create_date, committed:  myrevisions[k].commit_date})
                              }
                              mypage.revisions=revisions;
                              callback(null);
                          })
                        });
                      }, function(err){
                        //we have all the pages -- now we send them to the database
                        //make a new array, removing surplus
                        var writepages=[];
                        for (var i=0; i<mypages.length; i++) {
                          writepages.push({doc: mypages[i].tc2_id, tasks: mypages[i].tasks, revisions: mypages[i].revisions, name:mypages[i].name })
                        }
                        self.success+=" All pages processed. Writing to the database now. "
        //              download(JSON.stringify(writepages), self.docName+".json", "application/json");  //write a record
                        $.ajax({
                          url:config.BACKEND_URL+'moveTC1Transcripts?community='+self.cAbbrev+"&communityid="+self.uiService.state.community._id,
                          type: 'POST',
                          data: JSON.stringify(writepages),
                          accepts: 'application/json',
                          contentType: 'application/json; charset=utf-8',
                          dataType: 'json'
                        })
                        .done(function(data){
                          self.success+=data.npages+' pgages written to community "'+self.cAbbrev+'". Processing finished.';
                        })
                        .fail(function( jqXHR, textStatus, errorThrown) {
                         alert( "error" + errorThrown );
                        });
                      });
                    });
                });
              });
          });
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

function transformTC1Transcript(source, mypage) {
  //put it in a xml dom
  var myXMLDOM = new DOMParser().parseFromString(source, "text/xml");
  var firstDiv = myXMLDOM.getElementsByTagName('div')[0];  //not here guessing that body or text etc will have n, must be div of similar
  if (!firstDiv) { //empty page, no div
    var firstParent=myXMLDOM.getElementsByTagName('body')[0]
    if (!firstParent) {
      console.log("missing...")
    }
  } else {
    var firstParent = firstDiv.parentElement;
    while (firstDiv && firstDiv.getAttribute("prev")) {
      //remove the prev attribute.. get the next childElement with a n attribute. In this architecture
      firstDiv.removeAttribute("prev")
      firstParent=firstDiv;
      firstDiv=firstDiv.firstElementChild;
    }
  }
  //no prev attribute on firstDiv .. stick the page break in before it and carry on
  //adjust this.. child element may actually follow some textContent. So we have to make the text content the next element, or whatever follows IMMEDIATELY
  var newPb = myXMLDOM.createElement("pb");
  var newPbn = myXMLDOM.createAttribute("n");
  newPbn.nodeValue=mypage.name;
  newPb.setAttributeNode(newPbn);
  if (mypage.attrs.facs) {
    var newFacs=myXMLDOM.createAttribute("facs");
    newFacs.nodeValue=mypage.attrs.facs;
    newPb.setAttributeNode(newFacs);
  }
  if (mypage.attrs.rend) {
    var newRend=myXMLDOM.createAttribute("rend");
    newRend.nodeValue=mypage.attrs.rend;
    newPb.setAttributeNode(newRend);
  }
  if (!firstParent) {
    console.log("missing...")
    return(source);
  }
  firstParent.insertBefore(newPb, firstParent.childNodes[0]);
  var newString=(new XMLSerializer()).serializeToString(myXMLDOM)
  return (newString);
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

module.exports = ExportTC1TranscriptsComponent;
