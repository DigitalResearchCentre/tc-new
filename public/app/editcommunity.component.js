var CommunityService = require('./services/community')
  , UIService = require('./services/ui')
;


var EditCommunityComponent = ng.core.Component({
  selector: 'tc-edit-community',
  templateUrl: '/app/editcommunity.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [
    CommunityService, UIService, function(
      communityService, uiService) {
    var self=this;
    this._communityService = communityService;
    this._uiService = uiService;
    this.picFile={chosen:false, maxSize:100*1024, maxHeight:35, maxWidth:300, valid:false, file:""};
    this._communityService.allCommunities$.subscribe(function(communities) {
      self._allCommunities = communities;
    });
  }],
  ngOnInit: function() {
    var self=this;
    this.initEdit(this.community);
    this.message = '';
    this._uiService.sendCommand$.subscribe(function(chosen) {
      if (chosen==="createCommunity") self.submit();
    });
  },
  initEdit: function(community) {
    this._uiService.sendCommand$.emit("createChosen");
    if (community) {
      this.edit = _.clone(community.toJSON());
      this.community = community;
      this.origname=community.attrs.name;
      if (community.attrs.haspicture) {
        this.picFile.valid=true;
        var image  = document.createElement("IMG");
        image.setAttribute("id", "PreviewImg");
        image.setAttribute("src", community.attrs.image);
        var elPreview = document.getElementById("ECImage");
        elPreview.appendChild(image);
      }
    } else {
      this.edit = {
        public: false,
        name: "",
        abbr: "",
        longName: "",
        description: "",
        accept: false,
        autoaccept: false,
        alldolead: false,
        alltranscribeall: false,
        haspicture: false,
        image: "",
      };
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
    //is there a community with this name?
    this.message=this.success="";
    var self=this;
    if (self._allCommunities.length>0) {
      if (!this.community) {
        var matchedcom=self._allCommunities.filter(function (obj){return obj.attrs.abbr === self.edit.abbr;})[0];
        if (matchedcom) {
          self.message='There is already a community with the abbreviation "'+self.edit.abbr+'"';
          document.getElementById("ECMessage").scrollIntoView(true);
          return;
        }
      }
      var matchedname=self._allCommunities.filter(function (obj){return obj.attrs.name === self.edit.name;})[0];
      if (!this.community) {
        if (matchedname) {
          self.message='There is already a community with the name "'+self.edit.name+'"';
          document.getElementById("ECMessage").scrollIntoView(true);
          return;
        }
      } else {
        //if name has not changed, ignore...
        if (matchedname) {
          if (self.edit.name!=self.origname) {
            self.message='There is already a community with the name "'+self.edit.name+'"';
            document.getElementById("ECMessage").scrollIntoView(true);
            return;
          }
        }
      }
    }
    this._communityService.save(this.edit).subscribe(function(community) {
      self.success='Community "'+self.edit.name+'" saved';
      if ($('#PreviewImg')) $('#PreviewImg').remove();
      self.initEdit(community);
      self._uiService.setCommunity(community);
      document.getElementById("ECSuccess").scrollIntoView(true);
    }, function(err) {
      self.message = err.message;
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
