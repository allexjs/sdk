var Lib = require('allexlib'),
  Node = require('allex_nodehelpersserverruntimelib')(Lib),
  Component = require('allex_protoboardhelperssdklib')(Lib),
  AppBuilder = require('./webappbuilder/AppBuilder.js')(Lib, Node),
  Interpreter = require('./PBWebAppInterpreter.js')(Lib, Node),
  Q = Lib.q,
  AllexQ = Lib.qlib,
  App = null;


function getField(field, obj) { return obj[field];}

function buildWebapp(devel, rebuild, distro, path) {
  App = new AppBuilder(devel, distro, path),
    jobs = [
      App.install.bind(App),
    ];
  Node.info('Building app: ',App.name);

  var job = new AllexQ.PromiseExecutorJob(jobs);
  return job.go();
}

function buildGrunt (grunt, params, defer) {
  var interpreter = new Interpreter(App.reader, grunt, params, defer);
  interpreter.go();
  return Q.resolve(true);
}

function do_grunt (grunt, params, defer) {

  var dir = params.pb_dir ? params.pb_dir : process.cwd();
  var jobs = [ 
    Node.executeCommand.bind(Node, 'rm -rf _generated _tmp', null, {cwd : dir}, true),
    Node.executeCommand.bind(Node, params.devel ? 'allex-bower-install' : 'bower install', null, {cwd:dir}, true),
    buildWebapp.bind(null, params.devel, params.rebuild, params.distro, params.pb_dir),
    buildGrunt.bind(null, grunt, params, defer)
  ];

  if (params.clean){
    jobs.unshift (Node.executeCommand.bind(Node, 'allex-webapp-clear', null, {cwd:true}, true));
  }

  var job = new AllexQ.PromiseExecutorJob(jobs);
  var promise = job.go();
  promise.done(Node.info.bind(Node, 'Webapp sucessfully built'), Node.error.bind(Node, 'Webapp build failed due to: '));
  promise.done(null, process.exit.bind(process, 1));
}

module.exports = {
  async: true,
  grunt: do_grunt,
  GruntTasks: [
    'grunt-html-template',
    'grunt-contrib-symlink',
    'grunt-contrib-jshint',
    'grunt-mkdir',
    'grunt-file-exists',
    'grunt-template',
    'grunt-contrib-concat',
    'grunt-contrib-uglify', 
    'grunt-exec'
  ],
  tasklist: ['default']
}
