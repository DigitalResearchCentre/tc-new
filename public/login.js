var $ = require('jquery');
var login = {};
document.addEventListener("DOMContentLoaded", function(event) {
  var emailreq=getParameterByName("emailreq");
  var prompt=getParameterByName("prompt");
  var context=getParameterByName("context");
  if (emailreq=="facebook") {
    document.getElementById("frame").setAttribute("src","/auth/facebookemail");
    $('#myModal').modal('show');
  }
  if (prompt=="sendauthenticate" && context=="") {
    $('#myModal').modal('show');
    document.getElementById("frame").setAttribute("src","/auth/sendauthenticate?context=email");
  }
  if (prompt=="redirectModal") {
    $('#myModal').hide();
    $('.modal-backdrop').hide();
  //  document.getElementById("myModal").setAttribute("class", "fade hide");

  }
});
function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
  results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
login.loadLogIn = function loadLogIn () {
    document.getElementById("frame").setAttribute("src", "/auth")
}
login.closeModal = function closeModal() {
  $('#myModal').modal('hide');
}

module.exports = login;
