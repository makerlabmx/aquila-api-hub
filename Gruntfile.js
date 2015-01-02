'use strict';

module.exports = function(grunt) {

  // configure grunt
  grunt.initConfig({

    pkg: grunt.file.readJSON('Package.json'),

    jshint: {
      files: [
        '**/*.js',
        '!node_modules/**/*',
        '!apps/main/bower_components/**/*'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

  });

  // Load plug-ins
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // define tasks
  grunt.registerTask('default', [
    'jshint',
  ]);
};
