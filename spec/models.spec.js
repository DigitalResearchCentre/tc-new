var models = require('./../models')
  , Doc = models.Doc
;


describe('models test', function() {
  var doc = new Doc()
    , pb1r = new Doc()
    , lb1 = new Doc()
  ;
  pb1r.ancestors = [doc._id];
  doc.children.push(pb1r._id);
  lb1.ancestors = pb1r.ancestors.concat(pr1r._id);
  pb1r.children.push(lb1._id);

  pb1r.commit({
    tei: {
      name: 'text',
      attrs: {},
      children: [{
        name: 'body',
        children: [{
          name: 'div',
          attrs: {type: 'G', n: 'GP'},
          children: [{
            name: 'lb',
            children: [],
          }, {
            name: 'l',
            children: [],
          },],
        },],
      },],
    },
    doc: {
      children: [],
      label: 'text',
    }
  }, console.log.bind(console));
});
