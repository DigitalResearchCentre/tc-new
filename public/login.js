var $ = require('jquery');
var login = {
  loginFrame: '/auth?url=/index.html',
};
document.addEventListener("DOMContentLoaded", function(event) {
  var emailreq=getParameterByName("emailreq");
  var prompt=getParameterByName("prompt");
  var context=getParameterByName("context");
  var name=getParameterByName("name");
  if (emailreq=="facebook") {
    document.getElementById("frame").setAttribute("src","/auth/facebookemail");
    $('#myModal').modal('show');
  }
  if (prompt=="sendauthenticate" && context=="") {
    $('#myModal').modal('show');
    document.getElementById("frame").setAttribute("src","/auth/sendauthenticate?context=email");
  }
<<<<<<< HEAD
  if (prompt=="TCauthenticateDone") {
    var query;
    if (context=="newuser") query="?context="+context;
    document.getElementById("frame").setAttribute("src","/auth/authenticateOK"+query);
    $('#myModal').modal('show');
  }
  if (prompt=="TCresetpw") {
    login.loginFrame="/auth/resetpwdlog?email="+context+"&name="+name;
//    document.getElementById("frame").setAttribute("src","/auth/resetpwdlog?email="+context+"&name="+name);
    $('#myModal').modal('show');
=======
  if (prompt=="redirectModal") {
    $('#myModal').hide();
    $('.modal-backdrop').hide();
  //  document.getElementById("myModal").setAttribute("class", "fade hide");

>>>>>>> 0f40d93dea1bf448be9848dce81ecd5cd17c5ffc
  }
});
function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
  results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
login.loadLogIn = function loadLogIn () {
    document.getElementById("frame").setAttribute("src", "/auth?url=/index.html")
}
login.closeModal = function closeModal() {
    document.getElementById("frame").setAttribute("src", "/auth?url=/index.html")
  $('#myModal').modal('hide');
}

module.exports = login;
