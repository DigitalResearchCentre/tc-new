var $ = require('jquery')
    , URI = require('urijs')
    , config = require('../config')
;

var punctuation=".,:-/&@¶§;·⸫▽?!'"+'"';

function isCEPunctuation(myChar) {
  for (var i=0; i<punctuation.length; i++) {
    if (punctuation.charAt(i)==myChar) return true;
  }
  return false;
}

var FunctionService = {
  makeCeArray: function (content) {
//    console.log("in CE Array")
//    console.log("content:'"+content+"'");
    var words=[];
    var tags=[];
    var word="";
    var expanword="";
    var origword="";
    var xmlword="";
    var xmlpresent=false;
    var expanpresent=false;
    var prefix="";
    var suffix="";
    var isNewWord=false;
    var punctstr="", punctafter="", punctbefore="";
    //ok, coz we have unicode this is NOT reliable...
    //so rebuild the string
    var myContent=[];
    for (let myChar of content) {
      myContent.push(myChar);
    }
    for (var i=0; i<myContent.length; i++) {
      var endtag=false;
      if (isCEPunctuation(myContent[i])) {
        punctstr+=myContent[i];
          //problem here.. we might have forms "bill, $peter". We need to split this: stop at space, allocate to
          //punctafter and call routine to deal with the world; rest goes to punctbefore
          //but!!! before first word "¶§ //Peter" everything has to go in punctbefore...
        if (words.length==0 && word=="" && punctbefore=="") {
          for (++i; i<myContent.length && (isCEPunctuation(myContent[i]) || myContent[i]==" "); i++) {
            punctstr+=myContent[i];
          }
          punctbefore=punctstr;
  //        console.log("punct before word "+punctbefore)
          punctstr="";
          i--;
        } else {
         //if not before first word: then everything before first space is punct after...
          //are we dealing with punctbefore or after...? if word is empty, it is before. else, it is after
          if (word=="") {
            //could include spaces again, which we skip over until we get to first real leetter
            //situations! in case such as:
            //1 "as /bragot": attach to FOLLOWING word. In this case: next character is not a space
            //2 "as / bragot": we want to attach this to PRECEDING word. In this case: followed by space and check if preceding word punctafter is set
            //3 "as / ,, bragot": attach / to PRECEDING word ,, to following word: precedng word punctafter is set. Everything up next word is punct before
            //4 "bragot ,,, .." where bragot is the last word in the line
            //could be char before is a space..only significant where
            for (++i; i<myContent.length && (isCEPunctuation(myContent[i])); i++) {
              punctstr+=myContent[i];
            }
            if (myContent[i]!=" ") {
              punctbefore=punctstr;  //case 1
            } else {
              //space following punctuation. if punctafter on prev word not yet set. If it is, another game
                    //could also be case 4. after last word with punctafter NOT set on prev words
              if (words[words.length-1].punctafter=="") { //2 "as / bragot"
                //if this is last word...ok, see if rolling through tokens takes us end of content
                //if this is preceded by space then prefix the space
                var origi=i-punctstr.length-1;
                for (i; i<myContent.length && (isCEPunctuation(myContent[i]) || myContent[i]==" "); i++) {
                  punctstr+=myContent[i];
                }
  //              console.log("at i "+i+content.charAt(i)+" at i-1 "+(i-1)+content.charAt(i-1)+" at origi "+origi+content.charAt(origi)+" punct "+punctstr);
                if (myContent[origi]==" ") punctstr=" "+punctstr;
  //              console.log("in last word? "+words[words.length-1].word+" punctstr "+punctstr)
                if (i==myContent.length) words[words.length-1].punctafter+=punctstr; //case 4
                else {
                  words[words.length-1].punctafter=punctstr;  //probs have to json this
              //    i=origi;
                }
              }
              else { //case 3. "as / ,, bragot"
                for (i; i<myContent.length && (isCEPunctuation(myContent[i]) || myContent[i]==" "); i++) {
                  punctstr+=myContent[i];
                }
                //now, if this is the last word, we are at end of string.. add this to punct after on last word
                if (i==myContent.length) {
                  words[words.length-1].punctafter+=punctstr;  //probs have to jsonify this
                } else punctbefore=punctstr;
              }
            }
            punctstr="";
          }
          else {
            //in this case -- we stop at EITHER space or new word. In either case.. trigger word separation
            for (++i; i<myContent.length && (isCEPunctuation(myContent[i])); i++) {
              punctstr+=myContent[i];
            }
            punctafter=punctstr;
            isNewWord=true;  //trigger new word, coz maybe
            punctstr="";
            //if next character is NOT space..back off one character
//            console.log("word is "+word+" character is '"+content.charAt(i)+"' punct is '"+punctafter+"'");
          }
          //note that if last char in punctstr is a space .. roll back so we get the word.
          //in this case: the punctstr is punct after preceding word
          //except if this is the first word, then we roll on to deal with the next word and this punct is punct before
          //if there is NO space between punct token and the following word (ie last char in puncstr is NOT a space)
             // AND the word token is empty: then this is punct before next word
             //but if word token is not empty, and no space before: then we separate the word token into two and add this punctuation to first half of word as punct_after

          i--;
       }
     }
      else if (myContent[i]=="<") {
        var tag="<";
        var tagname="";
        var isEmpty=false;
        xmlpresent=true;
        if (myContent[i+1]=="/") {
          tag+="/";
          endtag=true;
          i++;
        }
        i++;
        while (myContent[i]!=" " && !(myContent[i]=="/" && myContent[i+1]==">") && myContent[i]!=">" ) {
          tag+=myContent[i];
          tagname+=myContent[i++];
        }
        if (myContent[i]==" ") {
          while (!(myContent[i]=="/" && myContent[i+1]==">") && myContent[i]!=">") {
            tag+=myContent[i++];
          }
        }
        if (myContent[i]=="/" && myContent[i+1]==">") {
          isEmpty=true;
          tag+="/>";
          i+=2;
        }
        if (myContent[i]==">") {
          tag+=">";
        }
        //ok, we have the xml tag, we know it is an end tag, or empty
        // do NOT deal here with <am> and <ex> tags. We are going to presume am and ex NEVER span a word
        // interesting case.. should origform in ex cases preserve whole am/ex sequence? I think not?
        var success=1;
        if (!isEmpty) {
          if (!endtag)
            tags.push({tag: tag, tagname: tagname})
          else tags.pop();
          //note that we add am and ex tags to expanword too? -- take those out elsewhere? I think so...
          //we may want to introduce a distinction between forms with/without XML, and expanced/abbrev forms
          if (tagname=="am"||tagname=="ex") {
  //          console.log("we have an expansion")
            expanword+=tag;
            expanpresent=true;
          }
          word+=tag;  //now word and expanword will differ. Note that empty tags are just ignored
                      //hence: " <pb/> " will NOT appear in our array
        }
      } else if (myContent[i]==" " || isNewWord) {
        //right, we have a word..
        if (isNewWord) { //newWord invoked.. might have to go back one char?
  //        console.log("word is "+word+" character is '"+myContent.charAt(i)+"' punct is '"+punctafter+"'");
        }
        isNewWord=false;
        if (word!="" && word!=" ") {
          word=prefix+=word;
          prefix=suffix="";
          if (tags.length!=0) {
            for (var j = 0; j < tags.length; j++) {
              suffix+="</"+tags[j].tagname+">";
            }
          } else suffix="";
          word+=suffix;
          //hmm.. if expanword contains <am>, push it. Note that we might also treat other 'mirror elements' similarly
          //ok, deal with am ex here
          if (expanword.search("<am")!=-1) {
            origword = expanword;
            var re_am2 = /<am(.*?)<\/am>/g;
            var re_ex = /<ex>(.*?)<\/ex>/g;
            var re_ex2= /<ex(.*?)<\/ex>/g;
            var re_am = /<am>(.*?)<\/am>/g;
            expanword=expanword.replace(re_am2, "").replace(re_ex, "$1");
            origword=origword.replace(re_ex2, "").replace(re_am, "$1");
          }
//          if (punctbefore!=""||punctafter!="") console.log("word "+word+" punctbefore "+punctbefore+" punctafter "+punctafter+" character is '"+content.charAt(i)+"'");
          if (myContent[i]!=" ") i--;
          if (expanpresent && xmlpresent) words.push({word:xmlword, expanword:expanword, origword:origword, xmlword:word, punctbefore:punctbefore, punctafter: punctafter});
          else if (expanpresent) {words.push({word:word, expanword:expanword, origword: origword, xmlword:"", punctbefore:punctbefore, punctafter: punctafter})}
          else if (xmlpresent) {words.push({word:xmlword, xmlword:word, expanword:"", origword:"", punctbefore:punctbefore, punctafter: punctafter})}
          else words.push({word:word, expanword:"", xmlword:"", origword:"", punctbefore:punctbefore, punctafter: punctafter});
          xmlpresent=expanpresent=false;
          punctbefore=punctafter="";
          word=expanword=xmlword="";
          if (tags.length!=0) {
            for (var j = 0; j < tags.length; j++) {
              prefix+=tags[j].tag;
            }
          } else prefix="";  //set before we start out with next word
        }
      } else {
        word+=myContent[i];
        expanword+=myContent[i];
        xmlword+=myContent[i];
      }
    }
    //we could have punctuation and xml words..
  /*  if (word!="" && word!=" ") {
      if (word!=expanword) words.push({word:word, expanword:expanword});
      else words.push({word:word, expanword:""});
      word=expanword="";
    } */
  if (word!="") {
    if (expanpresent && xmlpresent) words.push({word:xmlword, expanword:expanword, origword:origword, xmlword:word, punctbefore: punctbefore, punctafter:punctafter});
    else if (expanpresent) {words.push({word:word, expanword:expanword, origword:origword, xmlword:"",punctbefore: punctbefore, punctafter:punctafter})}
    else if (xmlpresent) {
      words.push({word:xmlword, xmlword:word, expanword:"", origword:"", punctbefore: punctbefore, punctafter:punctafter})
    }
    else words.push({word:word, expanword:"", xmlword:"", origword:"", punctbefore: punctbefore, punctafter:punctafter});
  }
//  console.log(words)
  return(words);
},
 getRdgTypes: function(content, witness) {
    //cruise through the apps manufacturing content strings for each distinct app type.. orig, c2, c2 etc
    //we use domParser methods for this. This has a lot of overhead and is likely much slower than a roll-my-own solution
    // but I needed something fast for florence!
    // can't use domParser. Async function.. yeeks
    //ok do it the hard way
    var offset=0;
    var appRdgs=[];
    while (content.indexOf("<app>", offset)>-1) {
      var endApp=content.indexOf("</app>", content.indexOf("<app>", offset+1));
      var startRdg=content.indexOf("<rdg", offset+1);
      while (startRdg>-1 && startRdg<endApp) {
        //got a rdg here
        var isAlready=false;
        offset=startRdg+1;
        var thisRdgType="";
        //get its type
        var startType=content.indexOf("type", offset);
        for (var j=startType+7; content.charAt(j)!='"' && content.charAt(j)!="'" &&j<endApp &&  content.charAt(j)!='\\'; j++) {
          thisRdgType+=content.charAt(j);
        }
//        console.log("got a reading type "+thisRdgType);
        for (var k = 0; k < appRdgs.length; k++) {
          if (appRdgs[k]==thisRdgType) isAlready=true;
        }
        if (!isAlready) { //lets get the reading text while we are at it
            if (thisRdgType!="lit") appRdgs.push(thisRdgType);
        }
        startRdg=content.indexOf("<rdg", offset+1);
      }
    }
//    console.log(appRdgs);
    return(appRdgs);
  },
  createRdgContent: function(content, myRdgTypes, witness) {
//    console.log("in create our app content for witness "+witness+" text: "+content)
//    console.log(myRdgTypes);
    var rdgsContent=[];
    for (var i = 0; i < myRdgTypes.length; i++) {
      //create a new content string for each kind of rdg
//      console.log("looking for "+myRdgTypes[i])
      var rdgContent="";
      var offsetStart=0;
      var offsetEnd=0;
      var appStart=content.indexOf("<app>", offsetStart);
      while (appStart!=-1) {
//        console.log("checking for "+myRdgTypes[i]);
//        console.log("rdg content before adding slice "+rdgContent+" at position "+offsetStart)
        rdgContent+=content.slice(offsetStart, appStart);
//        console.log("rdg content for "+myRd                                                                                                                                                                                                                                                                                                                                                                       gTypes[i]+":"+rdgContent)
        var gotReading=false;
        var thisRdg="";
        var startRdg=content.indexOf("<rdg", appStart+1);
        var origRdg="";
        var endApp=content.indexOf("</app>", appStart+1);
        offsetStart=endApp+6;
        while (startRdg!=-1 && startRdg<endApp) {
          //get the rdg t
//          console.log("looking for rdg at "+startRdg+" end app "+endApp);
          var thisRdgType="";
          var rdgContentStart=startRdg;
          var rdgContentEnd=startRdg;
          var startType=content.indexOf("type", startRdg+1);
          for (var j=startType+7; content.charAt(j)!='"' && content.charAt(j)!="'" &&j<endApp &&  content.charAt(j)!='\\'; j++) {
            thisRdgType+=content.charAt(j);
          }
//          console.log("we have a reading type "+thisRdgType);
          //ok.. if the reading is orig, then we need it for the case where the reading type is not instanced here
          if (thisRdgType=="orig") { //get what is between > and </rdg>. Special case! could be />
      //      console.log("looking for orig now ")
            rdgContentStart=content.indexOf(">",startRdg+1 );
      //      console.log("start of reading at "+rdgContentStart)
            if (content.charAt(rdgContentStart-1)=="/" || content.charAt(rdgContentStart-2)=="/") origRdg="";
            else {
              rdgContentEnd=content.indexOf("</rdg>",rdgContentStart);
      //        console.log("end of reading at "+rdgContentEnd);
              origRdg=content.slice(rdgContentStart+1,rdgContentEnd);
    //          console.log("reading is "+origRdg)
            }
            startRdg=content.indexOf("<rdg", rdgContentEnd);
          } else if (thisRdgType==myRdgTypes[i]) {
            gotReading=true;
    //        console.log("looking for "+thisRdgType+" now ")
            var rdgContentStart=content.indexOf(">",startRdg );
  //          console.log("start of reading at "+rdgContentStart)
            if (content.charAt(rdgContentStart-1)=="/" || content.charAt(rdgContentStart-2)=="/") thisRdg="";
            else {
              var rdgContentEnd=content.indexOf("</rdg>",rdgContentStart);
//              console.log("end of reading at "+rdgContentEnd);
              thisRdg=content.slice(rdgContentStart+1,rdgContentEnd);
//              console.log("reading is "+thisRdg);
            }
            startRdg=content.indexOf("<rdg", startRdg+1);
          } else { //reading type not wanted.. go on to next
            startRdg=content.indexOf("<rdg", startRdg+1);
          }
        }
        if (gotReading) {
          //add this reading to the content
          rdgContent+=thisRdg;
//          console.log("got rdg now "+myRdgTypes[i]+":"+thisRdg+" added to:"+rdgContent+" at app starting "+appStart)
        } else {
          rdgContent+=origRdg;
//          console.log("got rdg now "+myRdgTypes[i]+":"+origRdg+" added to:"+rdgContent+" at app starting "+appStart)
        }
          //get the next reading within this app
        appStart=content.indexOf("<app>", appStart+1);
//        console.log("appstart now "+appStart);
        if (appStart==-1) {
          //add rest of line to rdgContent
          rdgContent+=content.slice(endApp+6);
//          console.log("content after adding end of string:"+rdgContent);
          rdgsContent.push({type:myRdgTypes[i], content:rdgContent})
        }
//        console.log("appstart now is "+appStart);
      }
//      console.log("for type "+myRdgTypes[i]+" content is "+rdgContent);
    }
//console.log("we have readings "); console.log(rdgsContent);
    return(rdgsContent);
      //here we add to the rest of our string...
    //let's see what we have!
  }
}

//used when we need to parse the query string

module.exports = FunctionService;
