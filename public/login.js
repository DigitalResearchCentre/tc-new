var $ = require('jquery');
var login = {
  loginFrame: '/auth?url=/index.html',
};
document.addEventListener("DOMContentLoaded", function(event) {
  var prompt=getParameterByName("prompt");
  var context=getParameterByName("context");
  var name=getParameterByName("name");
  if (prompt) {
    if (prompt=="facebook") {
      document.getElementById("frame").setAttribute("src","/auth/facebookemail");
    }
    if (prompt=="sendauthenticate" && context=="") {
     document.getElementById("frame").setAttribute("src","/auth/sendauthenticate?context=email");
    }
    if (prompt=="authlinkExpired" && context=="") {
     document.getElementById("frame").setAttribute("src","/auth/authlinkExpired");
    }
    if (prompt=="authlinkNotFound" && context=="") {
     document.getElementById("frame").setAttribute("src","/auth/authlinkNotFound");
    }
    if (prompt=="resetpwExpired") {
     document.getElementById("frame").setAttribute("src","/auth/resetpwExpired");
    }
    if (prompt=="TCauthenticateDone") {
      var query;
      if (context=="newuser") query="?context="+context;
        document.getElementById("frame").setAttribute("src","/auth/authenticateOK"+query);
    }
    if (prompt=="TCresetpw") {
      document.getElementById("frame").setAttribute("src","/auth/TCresetpw?email="+context+"&name="+name);
    }
    $('#myModal').modal('show');
  }
});
function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
  results = regex.exec(location.href);
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
