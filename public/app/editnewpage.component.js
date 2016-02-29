var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')

var EditNewPageComponent = ng.core.Component({
  selector: 'tc-managemodal-edit-new-page',
  templateUrl: '/app/editnewpage.html',
  directives: [
    require('../directives/modaldraggable'),
    require('../directives/newpageprose.component'),
    require('../directives/newpagepoetry.component'),
    require('../directives/newpageplay.component'),
  ],
}).Class({
  constructor: [UIService, function(uiService) {
    var self=this;
    this.entity = {name:"Moby Dick", sample:'"Moby Dick", "Oliver Twist"'};
    $('#manageModal').width("510px");
    $('#manageModal').height("600px");
    this.message=this.success="";
    this.uiService = uiService;
    this.choice="Prose";
  }],
  submit: function() {
      var newPage=$("#NewDoc").text();
      this.uiService.newPage$.emit(newPage);
      this.closeModalNP();
  },
  choose: function(choice) {
    switch (choice) {
      case "Prose":
          this.entity = {name:"Moby Dick", sample:'"Moby Dick", "Oliver Twist"'};
          break;
      case "Poetry":
          this.entity = {name:"Commedia", sample:'"Commedia", "The Prelude"'};
          break;
      case "Play":
          this.entity = {name:"Hamlet", sample:'"Hamlet", "The Doll House"'};
          break;
    }
    this.choice=choice;
  },
  closeModalNP: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
    this.uiService.newPage$.emit("");
  }
});

module.exports = EditNewPageComponent;
