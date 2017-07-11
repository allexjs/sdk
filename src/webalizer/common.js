function createCommon (lib, Node) {
  'use strict';
  var Fs = Node.Fs;
  function readWebAppPb () {
    var data = readProtoboard();
    if (!data.protoboard || !data.protoboard.role || data.protoboard.role !== 'web_app') throw Error('Not a web_app format');

    return data;
  };
  function readProtoboard () {
    return Fs.safeReadJSONFileSync ('protoboard.json');
  }

  function saveWebAppPb (data) {
    Fs.writeJsonSync('protoboard.json', data);
  }
  return {
    readProtoboard : readProtoboard,
    readWebAppPb: readWebAppPb,
    saveWebAppPb: saveWebAppPb
  };
}

module.exports = createCommon;
