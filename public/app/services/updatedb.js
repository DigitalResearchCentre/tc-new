var $ = require('jquery')
    , URI = require('urijs')
    , config = require('../config')
;

var UpdateDbService=function (collection, data, callback) {
  $.ajax({
      url: config.BACKEND_URL+'updateDbJson/?collection='+collection,
      type: 'POST',
      data: data,
      accepts: 'application/json',
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    })
      .done(function(){
        callback("success");
      })
      .fail(function( jqXHR, textStatus, errorThrown) {
        callback( "error" + errorThrown );
     });
}

module.exports = UpdateDbService;
