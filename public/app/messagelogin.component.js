var $ = require('jquery');

var MessageLoginComponent = ng.core.Component({
  selector: 'tc-managemodal-message-login',
  templateUrl: '/app/messagelogin.html',
  inputs : ['community'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [ function() {
//    var Doc = TCService.Doc, doc = new Doc();
    $('#manageModal').width("300px");
    $('#manageModal').height("200px");
    }],
  closeModalMLI: function() {
    this.message=this.success=this.doc.name="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  doLoginModal: function() {
    $('#manageModal').modal('hide');
  }
});


module.exports = MessageLoginComponent;
