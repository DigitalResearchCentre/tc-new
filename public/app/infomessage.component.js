var $ = require('jquery');

var InfoMessageComponent = ng.core.Component({
  selector: 'tc-managemodal-info-message',
  templateUrl: '/app/infomessage.html',
  inputs : ['page', 'message', 'docname'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [ function() {
//    var Doc = TCService.Doc, doc = new Doc();
    $('#manageModal').width("300px");
    $('#manageModal').height("100px");
    }],
  closeModalIMLC: function() {
    this.message="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  doLoginModal: function() {
    $('#manageModal').modal('hide');
  }
});


module.exports = InfoMessageComponent;
