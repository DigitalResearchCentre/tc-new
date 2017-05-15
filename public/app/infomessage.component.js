var $ = require('jquery');

var InfoMessageComponent = ng.core.Component({
  selector: 'tc-managemodal-info-message',
  templateUrl: '/app/infomessage.html',
  inputs : ['message', 'header', 'source'],
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
  ngOnChanges: function() {
    if (this.source="CollationBase") {
      $('#manageModal').width("400px");
      $('#manageModal').height("150px");
    }
  },
  doLoginModal: function() {
    $('#manageModal').modal('hide');
  }
});


module.exports = InfoMessageComponent;
