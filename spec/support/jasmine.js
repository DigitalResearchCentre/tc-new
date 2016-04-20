const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfig({
  "spec_dir": "spec",
  "spec_files": [
    "**/*[sS]pec.js"
  ],
  "helpers": [
    "helpers/**/*.js"
  ],
  "stopSpecOnExpectationFailure": false,
  "random": false
});

jasmine.onComplete(function(passed) {
  if (passed) {
    console.log('All specs have passed');
  } else {
    console.log('At least one spec has failed');
  }
});

jasmine.execute([
  'spec/mixin.spec.js',
  'spec/node.spec.js',
  'spec/doc.spec.js',
]);
