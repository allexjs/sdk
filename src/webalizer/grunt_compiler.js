var compilepage = require('../webapp/compilepage.js').go,
  Lib = require('allexlib'),
  Node = require('allex_nodehelpersserverruntimelib')(Lib),
  Grunter = require('allex_grunthelperssdklib')(Lib);

function go(variant, verbose) {
  var cwd = process.cwd(),
    ret = compilepage(cwd, variant);

  return Grunter.goforGrunt(require('./grunt_web_app.js'), {
    devel : true,
    clean : false,
    rebuild : false,
    distro : variant,
    pb_dir : ret.pb_dir
  },{verbose: verbose});
}

module.exports = go;
