'use strict';

function createClone (Lib, Node) {
  'use strict';
  var Fs = Node.Fs,
    Path = Node.Path,
    AllexJS = require('allex_allexjshelperssdklib')(Lib),
    ALLEX_WORKSPACE_DIR = AllexJS.ALLEX_WORKSPACE_DIR,
    Git = require('allex_githelperssdklib')(Lib),
    Bower = require('allex_bowerhelperssdklib')(Lib),
    Q = Lib.q;

  function Cloner (gitpath, options) {
    if (!options) options = {};
    this.gitpath = null;

    this.options = options;
    ///at this moment a check should be done: if this is real git path or not ... if not, gitpath should stand for name ...

    if (gitpath.indexOf('git+ssh://') === 0){
      gitpath = gitpath.replace('git+ssh://');
    }
    this.name = null;
    this.tmp_dir = Path.resolve(ALLEX_WORKSPACE_DIR,'.tmp', 'components');
    this.bower_name = null;
    this.tmp_path = null;
    this.target_path = null;

    this.defer = Q.defer();
    if (gitpath.substring (gitpath.length-4) !== '.git') {
      Lib.moduleRecognition(gitpath, ['component']).then(this.onRecognized.bind(this));
    } else {
      this.clone();
    }
  }

  Cloner.prototype.onRecognized = function (recognized) {
    if (recognized) {
      this.options.project = recognized.namespace;
      this.gitpath = recognized.gitclonestring;
    }else{
      this.gitpath = gitpath;
    }
    this.name = Git.getRepoName(this.gitpath);
    this.clone();
  };

  Cloner.prototype.clone = function () {
    AllexJS.createTmpDir();
    if (this.options.force) {
      Fs.recreateDir(this.tmp_dir);
    }
    if (!Fs.dirExists(this.tmp_dir)){
      Fs.mkdirSync(this.tmp_dir);
    }
    process.chdir(this.tmp_dir);
    Node.info('About to git clone component named', this.name, 'from', this.gitpath);
    Node.info('Currently at', process.cwd());
    this.tmp_path = Path.resolve(this.tmp_dir, this.name);
    Git.clone (this.gitpath).done(this.processClone.bind(this), this.exit.bind(this));
  };

  Cloner.prototype.destroy = function () {
    if (Fs.existsSync(this.tmp_path)){
      Fs.removeSync(this.tmp_path);
    }
    AllexJS.destroyTmpDir();
    this.gitpath = null;
    this.options = null;
    this.name = null;
    this.tmp_dir = null;
    this.bower_name = null;
    this.target_path = null;
    if (this.defer) {
      this.defer.resolve('ok');
    }
    this.defer = null;
  };

  Cloner.prototype.exit = function () {
    this.defer.reject(Array.prototype.join.call(arguments, ''));
    this.defer = null;
    this.destroy();
  };

  Cloner.prototype.processClone = function (result) {
    var name = this.name,
      gitpath = this.gitpath,
      tmp_dir = this.tmp_dir,
      bower_file = Path.resolve(tmp_dir, name, 'bower.json');

    if (Fs.fileExists(bower_file)){
      var b = Fs.safeReadJSONFileSync(bower_file);
      this.bower_name = b.name;
    } else {
      console.log('No bower file, options.name', this.options.name);
      if (this.options.name) {
        this.bower_name = this.options.name;
      }else{
        Node.warn('bower.json was not found in the cloned component, no name was given through the -n option');
        Node.warn('Component', this.name, 'will be named', this.name);
        this.bower_name = name;
      }
    }

    if (AllexJS.readFromAllexJS('components', this.bower_name)){
      if (this.options.force) {
        Node.warn('Component record exists but will be overriden due to --force option');
      }else{
        return this.exit('Component record for component ', this.bower_name, ' already exists');
      }
    }

    var components_path = Path.join('components', this.bower_name);

    this.target_path = this.options.project ? Path.resolve(ALLEX_WORKSPACE_DIR, 'projects',this.options.project, components_path) : Path.resolve(ALLEX_WORKSPACE_DIR, components_path);

    if (Fs.existsSync(this.target_path)){
      if (this.options.force) {
        Node.warn('Will remove old data on path ', this.target_path, 'due to --force option');
        Fs.removeSync(this.target_path);
      }else{
        return this.exit('Path '+this.target_path+' already exists, cowardly retreating');
      }
    }else{
      Fs.ensureDirSync(Path.dirname(this.target_path));
    }

    if (Bower.commands.isInCache(this.bower_name)) {
      if (this.options.force) {
        Node.warn ('Bower link detected, will remove it due to --force option');
        Bower.commands.unlink(this.bower_name);
      }else{
        return this.exit('Bower link already exists for a component ', this.bower_name, '. Unlink it first.');
      }
    }

    //has to be this.name ... that's how its cloned ;)
    Fs.renameSync(Path.resolve(tmp_dir, this.name), this.target_path);
    Bower.commands.linkToCache(this.bower_name, this.target_path);
    Node.info('Linked', this.target_path, 'to Bower cache as', this.bower_name);

    AllexJS.storeToAllexJS('components', this.bower_name, {
      project: this.options.project,
      git: gitpath
    });

    Node.info('Successfully cloned a component', this.bower_name);
    this.destroy();
  };

  return function (gitpath , options) {
    var c = new  Cloner(gitpath, options);
    return c.defer.promise;
  };
}


module.exports = createClone;
