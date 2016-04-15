/* require('script!angular2/bundles/angular2-polyfills.min'); */
// require('script!rxjs/bundles/Rx.umd');
/* require('script!angular2/bundles/angular2-all.umd'); */
require('../../common/mixin');
require('./app.less');

var AppComponent = require('./app.component');

document.addEventListener('DOMContentLoaded', function() {
  ng.platform.browser.bootstrap(AppComponent, [
    ng.http.HTTP_PROVIDERS,
    ng.router.ROUTER_PROVIDERS,
    require('./services/ui'),
    require('./services/auth'),
    require('./services/community'),
    require('./services/doc'),
    require('./services/rest'),
  ]).catch(function(err) {
    console.error(err);
  });
});
