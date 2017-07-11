'use strict';

var SUBDIRS = ['components', 'projects', 'modules', '.webapps'];

function createInitializator (lib) {
  'use strict';
  var Node = require('allex_nodehelpersserverruntimelib')(lib),
    CreateProject = require('./projects/create.js')(lib, Node),
    Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR;

  function createSubdir(allex_dir, subdir) {
    Fs.mkdirSync(Path.resolve(allex_dir, subdir));
  }

  function initialize (){
    if (Fs.dirExists(ALLEX_WORKSPACE_DIR)) {
      Node.exit('Directory '+ALLEX_WORKSPACE_DIR+' already exists, cowardly retreating, exiting');
      return;
    }

    Fs.mkdirSync(ALLEX_WORKSPACE_DIR);
    SUBDIRS.forEach (createSubdir.bind(null, ALLEX_WORKSPACE_DIR));

    Fs.writeJSONSync(Path.resolve(ALLEX_WORKSPACE_DIR, '.allexjs.json'), {
      components: {},
      websolutions: {},
      serversuites: {},
      modules: {},
      aliases: {
        allex : 'git@gitlab.hers.rs:'
      }
    });

    return CreateProject('_modules').then(CreateProject.bind(null, '_tests'));
  }

  return initialize;
}

module.exports = createInitializator;
