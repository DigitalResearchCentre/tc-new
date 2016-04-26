require('jasmine-core/lib/jasmine-core/jasmine.css');

require('script!jasmine-core/lib/jasmine-core/jasmine.js');
require('script!jasmine-core/lib/jasmine-core/jasmine-html.js');
require('script!jasmine-core/lib/jasmine-core/boot.js');

require('../common/mixin');

var requireAll = (requireContext) => { 
  requireContext.keys().map(requireContext); 
};

requireAll(require.context('app/', true, /[sS]pec\.js$/));


var xml2js = require('xml2js');

var options = {
  trim: true,
  explicitRoot: true,
  explicitArray: true,
  explicitChildren: true,
  ignoreAttrs: false,
  mergeAttrs: false,
  preserveChildrenOrder: true,
  charsAsChildren: true,
  xmlns: false,
  validator: function(xpath, curValue, newValue) {
    if (!newValue.$$) {
      console.log(xpath);
      console.log(curValue);
      console.log(newValue);
    }
    return newValue;
  },
  attrNameProcessors: [function(attrName) {
    // n type
    return attrName;
  }],
  attrValueProcessors: [
    function(attrValue) {
      return attrValue;
    }
  ],
  valueProcessors: [
    function(value) {
      return value;
    }
  ],
};
var parser = new xml2js.Parser(options);
parser.addListener('end', function(result) {
  console.log(result);
});

var xml = `
  <text><body>
    <div type="G" n="L28">
      <l n="4">
        <pb facs="217r.jpg" n="223r" d="hg 223r"/>
        <lb d="hg 223r lb1"/>
          (hg 223r lb1)Myn eres ake 
        <lb/>of þin darsty speche
      </l>
      <ab>hello</ab>
      <lb/>
      <l n="5">
        world
      </l>
      <l></l>
    </div>
  </body></text>
`;

var obj = parser.parseString(xml);

var builder = new xml2js.Builder(options);
var xml = builder.buildObject(obj);
console.log(xml);

/*
doc-leaf - text - 56ac


56ac -
  <hello>world</hello>
  world

 */
