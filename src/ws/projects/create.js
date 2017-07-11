'use strict';

function createProjectCreator (lib, Node) {
  'use strict';
  var
    Q = lib.q,
    Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR;

  function createProject (name) {
    var project_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', name);
    if (Fs.dirExists(project_path)) {
      throw new Error('Project '+name+' already exists, cowardly retreating');
    }

    Fs.mkdirSync(project_path);
    return Q.resolve('Done');
  }
  return createProject;
}

module.exports = createProjectCreator;

