var $ = require('jquery');

var xmlValide =  '<?xml version="1.0" encoding="UTF-8"?>' +
           '<TEI>' +
               '<teiHeader><fileDesc><titleStmt>'+
               '<title></title>' +
               '</titleStmt>'+
               '<publicationStmt>'+
               '<p></p>' +
               '</publicationStmt>' +
               '<sourceDesc>'+
               '<p></p>' +
               '</sourceDesc>' +
               '</fileDesc></teiHeader>' +
               '<text><body>' +
               '<div>' +
                   '<l>grandchild content</l>' +
               '</div>' +
               '</body></text>' +
           '</TEI>';



$.post('/api/validate', {
  xml: xmlValide,
}, function(res) {
//  console.log(res);
});

$.post('/api/validate', {
  xml: '<TEI></TEI>', // invalid
}, function(res) {
//  console.log(res);
});
