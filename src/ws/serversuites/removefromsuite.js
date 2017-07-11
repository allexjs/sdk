'use strict';

function createServerRemove (Lib, Node) {
  'use strict';

  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    BaseWSWorkerClass = require('../baseclasses.js')(Lib, AllexJS).BaseWSWorkerClass,
    Git = require('allex_githelperssdklib')(Lib),
    Q = Lib.q; /*, will be left for tmux extensions
    GenerateScripts = require('../../system/generatescripts.js')(Lib, Node, AllexJS);*/

  function ServerRemover (projectname, name, options) {
    this.projectname = projectname;
    this.name = name;
    this.success_string = name+' was successfully removed from project '+projectname;
    this.project_path = Path.resolve(ALLEX_WORKSPACE_DIR, 'projects', projectname, 'servers');
    this.path = Path.resolve(this.project_path, name);

    BaseWSWorkerClass.call(this, options);
  }

  Lib.inherit(ServerRemover, BaseWSWorkerClass);
  ServerRemover.prototype.destroy = function () {
    this.project_path = null;
    this.projectname = null;
    this.name = null;
    BaseWSWorkerClass.prototype.destroy.call(this);
  };

  ServerRemover.prototype.go = function () {
    if (!Fs.dirExists(this.path)) {
      throw new Error('Unable to find a given path: '+this.path);
    }
    if (!Git.isDirClear(this.path)) {
      if (this.options.force) 
      {
        Node.warn("There are some git pending issues ... Forcing delete due to --force option");
      }else{
        throw new Error('Directory not ready for deletion, pending git issues ... Review git status and try again');
      }
    }
    Fs.removeSync(this.path);
    AllexJS.removeFromAllexJS('serversuites', this.projectname+'/'+this.name);
    Fs.removeSync(Path.resolve(this.project_path, '.scripts'));

    ///TODO: neka ga za sad ... tanko ...
    var remaining = Fs.readdirSync(this.project_path);

    if (!remaining.length) {
      Fs.removeSync(this.project_path);
      Lib.runNext(this.destroy.bind(this));
    }else{
      Lib.runNext(this.destroy.bind(this));
      /*
       * will be left for tmux extension(s)
      GenerateScripts(remaining, this.project_path, this.projectname).done(
        this.destroy.bind(this),
        this.exit.bind(this)
      );
      */
    }
  };

  return function (project, name, options) {
    if (!project) return Q.reject('Suite missing');
    if (!name) return Q.reject('Server name missing');

    var d = new ServerRemover(project, name, options);
    return d.defer.promise;
  };
}

module.exports = createServerRemove;

