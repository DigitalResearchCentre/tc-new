var CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , RESTService = require('./services/rest')
  , config = require('./config')
  , Mongoose = require('mongoose')
  , ObjectId = mongoose.Types.ObjectId
;


var EditCommunityComponent = ng.core.Component({
  selector: 'tc-edit-community',
  templateUrl: '/app/editcommunity.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [CommunityService, UIService, RESTService, function(
    communityService, uiService, restService
  ) {
    var self=this;
    this._communityService = communityService;
    this._uiService = uiService;
    this._restService=restService;
    this.picFile={
      chosen:false, maxSize:100*1024,
      maxHeight:35, maxWidth:300, valid:false, file:""
    };
    this._uiService.sendCommand$.subscribe(function(chosen) {
      if (chosen==="createCommunity") self.submit();
    });
  }],
  ngOnInit: function() {
    var self=this;
    this.message = '';
    this.initEdit(this.community);
  },
  ngOnChanges: function() {
    this.initEdit(this.community);
  },
  initEdit: function(community) {
    this._uiService.sendCommand$.emit("createChosen");
    if (community) {
      this.edit = _.clone(community.toJSON());
      this.community = community;
      this.edit.entities=community.attrs.entities;
      this.origname=community.attrs.name;
      var myPreview=$("#PreviewImg")[0];
      if (community.attrs.haspicture && !myPreview) {
        this.picFile.valid=true;
        var image  = document.createElement("IMG");
        image.setAttribute("id", "PreviewImg");
        image.setAttribute("src", community.attrs.image);
        var elPreview = document.getElementById("ECImage");
        elPreview.appendChild(image);
      }
    } else {
      var self=this;
      this.edit = {
        public: false,
        name: "",
        abbr: "",
        longName: "",
        description: "",
        accept: false,
        autoaccept: false,
        alldolead: false,
        members: [this._uiService.state.authUser._id],
        alltranscribeall: false,
        haspicture: false,
        image: "",
      };
      //load ceconfig. We don't do this now.
    /*   this._restService.http.get('/app/data/CollEditorConfig.json').subscribe(function(colledfile) {
         var dummy="";
         dummy=colledfile._body;
         self.edit.ceconfig=JSON.parse(dummy);  //also kind of hacky
       }); */
    }
  },
  fileTooBig: function(){
    if (this.picFile.chosen) {
      if (this.picFile.size>this.picFile.maxSize) return true;
      else return false;
    }
    else return false;
  },
  fileTooHigh: function(){
    if (this.picFile.chosen) {
      if (this.picFile.height>this.picFile.maxHeight) return true;
      else return false;
    }
    else return false;
  },
  fileTooWide: function(){
    if (this.picFile.chosen) {
      if (this.picFile.width>this.picFile.maxWidth) return true;
      else return false;
    }
    else return false;
  },
  isImageOK: function(){
    //ok.. if we don't have a community
    if (this.community) {if (this.picFile.valid) return true;}
    else if (this.picFile.chosen && this.picFile.valid) return true;
    else return false;
  },
  selectImage: function(event) {
    var self=this;
    var file=event.target.files[0]
    self.picFile.file=file;
    window.URL    = window.URL || window.webkitURL;
    var  useBlob   = false && window.URL;
    var reader = new FileReader();
    reader.addEventListener("load", function () {
    if ($('#PreviewImg')) $('#PreviewImg').remove();
    var image  = new Image();
    image.id="PreviewImg";
    image.addEventListener("load", function (evt) {
      self.picFile.chosen=true;
      self.picFile.size=file.size;
      self.picFile.height=image.height;
      self.picFile.width=image.width;
      self.picFile.name=file.name;
      if (self.picFile.size<=self.picFile.maxSize && self.picFile.height<=self.picFile.maxHeight && self.picFile.width<=self.picFile.maxWidth ) {
        self.picFile.valid=true;
        var elPreview = document.getElementById("ECImage");
        elPreview.appendChild(this);
        self.upload(file);
      } else {
        self.picFile.valid=false;
      }
    });
    image.src = useBlob ? window.URL.createObjectURL(file) : reader.result;
    if (useBlob) {
      window.URL.revokeObjectURL(file);
    }
  });
  reader.readAsDataURL(file);
  },
  submit: function() {
    //is there a community with this name? check before we do any more validation!
    var communityService = this._communityService
      , self=this
    ;
    var format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    this.message=this.success="";
    var message=[];
    //verify
    if (!this.edit.name) {
      message.push("Community name cannot be blank");
    } else if (this.edit.name.length>19) {
      message.push(
        "Community name "+this.edit.name+" must be less than 20 characters");
    }
    if (!this.edit.abbr) {
      message.push("Community abbreviation cannot be blank");
    } else if (this.edit.abbr.length>4)  {
      message.push(
        "Community abbreviation "+this.edit.abbr+" must be less than 5 characters");
    } else if (format.test(this.edit.abbr)) {
      message.push("Community abbreviation "+this.edit.abbr+" cannot contain the characters !!@#$%^&*()_+=[]{};':\"|,.<>/?");
    }
    if (this.edit.longName && this.edit.longName.length>80) {
      message.push(
        "Community long name "+this.edit.longName+" must be less than 80 characters");
    }
    if (message.length > 0) {
      for (var i=0; i<message.length; i++) {
        if (i>0) this.message+=", ";
        this.message+=message[i];
      }
      document.getElementById("ECMessage").scrollIntoView(true);
      return;
    }

    //is it a new community? or update to existing community?
    //if editing existing: state community will be identical to this one. else it will be new
    if (this.community && (this.community._id==this._uiService.state.community._id)) {
      var bill=1;
      communityService.createCommunity(this.edit).subscribe(function(community) {
        self.success='Community "'+self.edit.name+'" saved';
//        if ($('#PreviewImg')) $('#PreviewImg').remove();
//        self.initEdit(community);
        document.getElementById("ECSuccess").scrollIntoView(true);
      });
    }
    else $.post(config.BACKEND_URL+'isAlreadyCommunity?'+'abbr='+this.edit.abbr+'&name='+this.edit.name, function(res) {
      if (res.success=="1")   {
          communityService.createCommunity(self.edit).subscribe(function(community) {
            self.success='Community "'+self.edit.name+'" saved';
            if ($('#PreviewImg')) $('#PreviewImg').remove();
            self.initEdit(community);
            document.getElementById("ECSuccess").scrollIntoView(true);
            //change to view this Community
            window.location="/app/community/?id="+community._id+"&route=view"
            //switch to view community
          }, function(err) {
            self.message = err.json().message;
            document.getElementById("ECMessage").scrollIntoView(true);
          });
      } else {
        self.message = res.message;
        document.getElementById("ECMessage").scrollIntoView(true);
      }
    });
  },
  upload: function (file) {
     var self=this;
     var fileReader = new FileReader();
     fileReader.onload = function(evt) {
      self.edit.image = evt.target.result;
      self.edit.haspicture=true;
    };
    fileReader.readAsDataURL(file);
  },
  nullImage: function () {
    this.edit.image ="";
    this.edit.haspicture=false;
    this.picFile={chosen:false, maxSize:100*1024, maxHeight:35, maxWidth:300, valid:false, file:""};
    if ($('#PreviewImg')) $('#PreviewImg').remove();
    document.getElementById('EDIB').value = "";
  },
});

module.exports = EditCommunityComponent;
