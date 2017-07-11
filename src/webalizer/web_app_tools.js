function createWebAppTools (lib, Node) {
  'use strict';
  var common = require('./common.js')(lib, Node),
    Fs = Node.Fs,
    Path = Node.Path;

  function partialExists (component, path, item) {
    throw new Error('TODO');
  }
  function addPartial (component, partial_path) {
    throw new Error('TODO');
  }

  function getMissingComponents (cwd) {
    throw new Error('TODO');
  }

  function _isWebapp (cwd, dir) {
    var pb_path = Path.resolve(cwd, dir, 'protoboard.json');
    if (!Fs.fileExists(pb_path)) return false;
    return Fs.readFieldFromJSONFile(pb_path, 'protoboard.role') === 'web_app';
  }

  function findWebApps (cwd) {
    if (!Fs.dirExists(cwd)) throw new Error('Missing directory: '+cwd);
    if (_isWebapp(cwd, './')) return ['./'];
    return Fs.readdirSync(cwd).filter(_isWebapp.bind(null, cwd));
  }

  return {
    findWebApps: findWebApps
  };
}

module.exports = createWebAppTools;

