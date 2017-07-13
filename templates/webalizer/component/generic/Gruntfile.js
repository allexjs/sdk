module.exports = function(grunt){
  require('allex-webalizer').grunt_web_component(grunt);
  /*
  var projectFiles = [
    'src/index.js'
  ],
  concatTarget = 'dist/all.js';
  grunt.initConfig({
    concat:{
      dist:{
        src:projectFiles,
        dest:concatTarget
      }
    },
    uglify:{
      build:{
        src:concatTarget,
        dest:'dist/all.min.js'
      }
    },
    jshint:{
      beforeconcat:projectFiles,
      afterconcat:concatTarget
    }
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('default',['jshint:beforeconcat','concat','jshint:afterconcat','uglify']);
  */
};
