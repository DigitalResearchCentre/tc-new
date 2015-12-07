var $ = require('jquery');

var login = {
  loginFrame: '/auth?url=/index.html#/home',
};
document.addEventListener("DOMContentLoaded", function(event) {
  var prompt=getParameterByName("prompt");
  var context=getParameterByName("context");
  var name=getParameterByName("name");
  var link=getParameterByName("link");
  if (prompt) {
    if (prompt=="alreadylocal") {
      document.getElementById("frame").setAttribute("src","/auth/alreadylocal?context="+context+"&email="+name);
    }
    if (prompt=="facebooklinkemail") {
      document.getElementById("frame").setAttribute("src","/auth/facebooklinkemail");
    }
    if (prompt=="facebookassocemail") {
      document.getElementById("frame").setAttribute("src","/auth/facebookassocemail");
    }
    if (prompt=="showprofile") {
      document.getElementById("frame").setAttribute("src","/auth/profile");
      document.getElementById("frame").setAttribute("height", "350px");
    }
    if (prompt=="facebookconnect" && context=="") {
      document.getElementById("frame").setAttribute("src","/auth/profile");
      document.getElementById("frame").setAttribute("height", "350px");
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
login.closeModal = function closeModal() {
    document.getElementById("frame").setAttribute("src", "/auth?url=/index.html#/home")
    document.getElementById("frame").setAttribute("height", "233px");
    //ask the database -- if the current user has a FB ac but no local, then eliminate the stray fb ac
  //$('#myModal').modal('hide');  close in call to server
  window.location="/auth/removeSurplusSM";

}
login.showLogProf = function showLogProf (){
  document.getElementById("frame").setAttribute("src", "/auth/profile");
  document.getElementById("frame").setAttribute("height", "350px");
  $('#myModal').modal('show');
}

module.exports = login;
