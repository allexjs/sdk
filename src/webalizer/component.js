function createInit (lib, Node) {
  'use strict';
  var Fs = Node.Fs;

  function init(dir) {
    var pbfile_path = Path.resolve(dir, 'protoboard.json'),
      bower_path = Path.resolve(dir, 'bower.json');
    Fs.ensureDir(dir);

    var bower_data = Fs.safeReadJSONFileSync(bower_path);
    var pbjd = {};
    if (!pbjd.js) pbjd.js = {};
    if (bower_data && bower_data.main) {
      pbjd.js.all = [bower_data.main];
    }
    if (!pbjd.exclude) pbjd.exclude = {};
    if (!pbjd.exclude.jshint) pbjd.exclude.jshint = [];
    pbjd.exclude.jshint.push ('browserified.js');
    pbjd.protoboard = {
      role: 'web_component'
    };
    Fs.writeJSONSync(pbfile_path, pbjd);
    Node.info ('Browserify was detected,please add browserified.js to JS files list in protoboard.json before running your grunt ...');
  }

  return init;
}

module.exports = createInit;

