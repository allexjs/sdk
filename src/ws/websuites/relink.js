'use strict';

function createRelink (Lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    recognize = Lib.moduleRecognition,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    BaseWSWorkerClass = require('../baseclasses.js')(Lib, AllexJS).BaseWSWorkerClass,
    Git = require('allex_githelperssdklib')(Lib),
    Q = Lib.q,
    WebAppTools = require('../../webalizer')(Lib).WebAppTools;

  function doRelink (project, suitename, webapp){
    if ('./' === webapp) return; ///TODO: anomaly to be resolved

    var app = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', project, 'websolutions', suitename, webapp, '_generated'),
      linkdirname = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps', project, suitename),
      link = Path.resolve(linkdirname, webapp);

    if (Fs.existsSync(link)) return;

    try {
      Fs.ensureDirSync(linkdirname);
      Fs.symlinkSync (app, link);
    }catch (ignore) {
    }
  }


  function push_web_app (project, suitename) {
    WebAppTools.findWebApps(Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', project, 'websolutions', suitename)).forEach(doRelink.bind(null, project, suitename));
  }

  function find_in_solution(project, path){
    Fs.readdirSync(path).forEach (push_web_app.bind(null, project))
  }


  function findSuite (project){
    var pp = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', project, 'websolutions');
    if (!Fs.dirExists(pp)) return;
    Fs.readdirSync(pp).forEach (find_in_solution.bind(null, project, Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', project, 'websolutions')));
  }


  function linkDeployment (item) {
    var target = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps', item.project, item.name),
      source = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', item.project, 'webdeployments', item.name);

    if (!Fs.dirExists(source)) return;
    if (Fs.existsSync(target)) return;
    Fs.symlinkSync (source, target);
  }

  return function () {
    var webappsdirname, projects;
    webappsdirname = Path.resolve(ALLEX_WORKSPACE_DIR, '.webapps');
    Node.Fs.ensureDirSync(webappsdirname);
    Node.executeCommandSync ('find '+webappsdirname+' -type l -delete');
    projects = Fs.readdirSync (Path.resolve(ALLEX_WORKSPACE_DIR, 'projects'));

    projects.forEach (findSuite);

    var webds = AllexJS.getAllexJSData().webdeployments;

    if (webds){
      Lib.traverseShallow (webds, linkDeployment);
    }
    return Q.resolve('ok');
  };
}

module.exports = createRelink;
