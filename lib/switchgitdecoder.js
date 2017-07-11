'use strict';

function createSwitchGitDecoder (lib, Node) {
  'use strict';
  if (!Node) {
    console.trace();
    process.exit(1);
  }

  var q = lib.q,
    Git = require('allex_githelperssdklib')(lib);

  function decode (target) {
    if (target.substring(target.length-4) === '.git') {
      var name = git.getRepoName(target);
      //it's a pure git repo ...
      return q({
        modulename: name,
        gitclonestring: target,
        rtarget: Node.Path.join('node_modules', name)
      });
    }
    return lib.moduleRecognition(target).then(nodemodulizer);
  }

  function nodemodulizer (r) {
    if (r && r.modulename) {
      r.rtarget = Node.Path.join('node_modules', r.modulename);
      return q(r);
    }
    return q(null);
  }

  return decode;
}

module.exports = createSwitchGitDecoder;
