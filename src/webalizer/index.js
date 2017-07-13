function createWebalizer(lib) {
  'use strict';
  var Node = require('allex_nodehelpersserverruntimelib')(lib);
  return {
    component: require('./component.js')(lib, Node),
    WebAppTools: require('./web_app_tools.js')(lib, Node),
    web_app : require('./web_app.js')(lib, Node)
  };
}

module.exports = createWebalizer;
