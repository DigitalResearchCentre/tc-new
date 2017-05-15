var $ = require('jquery')
    , URI = require('urijs')
    , config = require('../config')
;

var FunctionService = {
  makeCeArray: function (content) {
    console.log(content);
    var words=[];
    var tags=[];
    var word="";
    var expanword="";
    var prefix="";
    var suffix="";
    for (var i=0; i<content.length; i++) {
      var endtag=false;
      if (content[i]=="<") {
        var tag="<";
        var tagname="";
        var isEmpty=false;
        if (content[i+1]=="/") {
          tag+="/";
          endtag=true;
          i++;
        }
        i++;
        while (content[i]!=" " && !(content[i]=="/" && content[i+1]==">") && content[i]!=">" ) {
          tag+=content[i];
          tagname+=content[i++];
        }
        if (content[i]==" ") {
          while (!(content[i]=="/" && content[i+1]==">") && content[i]!=">") {
            tag+=content[i++];
          }
        }
        if (content[i]=="/" && content[i+1]==">") {
          isEmpty=true;
          tag+="/>";
          i+=2;
        }
        if (content[i]==">") {
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
          if (tagname=="am"||tagname=="ex") expanword+=tag;
          word+=tag;  //now word and expanword will differ. Note that empty tags are just ignored
                      //hence: " <pb/> " will NOT appear in our array
        }
      } else if (content[i]==" ") {
        //right, we have a word..
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
            var re_am2 = /<am(.*?)<\/am>/g;
            var re_ex = /<ex>(.*?)<\/ex>/g;
            expanword=expanword.replace(re_am2, "").replace(re_ex, "$1");
          }
          if (word!=expanword) words.push({word:word, expanword:expanword});
          else words.push({word:word, expanword:""});
          word=expanword="";
          if (tags.length!=0) {
            for (var j = 0; j < tags.length; j++) {
              prefix+=tags[j].tag;
            }
          } else prefix="";  //set before we start out with next word
        }
      } else {
        word+=content[i];
        expanword+=content[i];
      }
    }
    if (word!="" && word!=" ") {
      if (word!=expanword) words.push({word:word, expanword:expanword});
      else words.push({word:word, expanword:""});
      word=expanword="";
    }
    return(words);
  }
}

module.exports = FunctionService;
