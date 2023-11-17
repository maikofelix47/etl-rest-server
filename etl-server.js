try {
  var Hapi = require('hapi');
  var mysql = require('mysql');
  var Good = require('good');
  var requestConfig = require('./request-config');
  var Basic = require('hapi-auth-basic');
  // var etlBroadcast =require('./etl-broadcast');
  var https = require('http');
  var config = require('./conf/config');
  var requestConfig = require('./request-config');
  var corsHeaders = require('hapi-cors-headers');
  var _ = require('underscore');
  var moment = require('moment');
  var tls = require('tls');
  var fs = require('fs');
  var routes = require('./etl-routes');
  var Inert = require('inert');
  var Vision = require('vision');
  var HapiSwagger = require('hapi-swagger');
  var Pack = require('./package');
  var hapiAuthorization = require('hapi-authorization');
  var authorizer = require('./authorization/etl-authorizer');
  var cluster = require('cluster');
  var os = require('os');
  var locationAuthorizer = require('./authorization/location-authorizer.plugin');
  var cache = require('./session-cache');
  var request = require('request');
  var numCPUs = os.cpus().length;
  var authencticated = false;
  var server = new Hapi.Server({
    connections: {
      //routes: {cors:{origin:["https://amrs.ampath.or.ke:8443"]}}
      routes: {
        cors: {
          additionalHeaders: ['JSNLog-RequestId']
        }
      }
    }
  });

  var tls_config = false;

  if (config.testMode === true) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  server.connection({
    port: config.etl.port,
    host: config.etl.host,
    tls: false,
    routes: { log: true }
  });
  var pool = mysql.createPool(config.mysql);

  var validate = function (username, password, callback) {
    var currentUser = {
      username: 'fmaiko',
      role: [],
      authorizedLocations: []
    };
    callback(null, true, currentUser);
  };

  var HapiSwaggerOptions = {
    info: {
      title: 'REST API Documentation',
      version: Pack.version
    },
    tags: [
      {
        name: 'patient'
      },
      {
        name: 'location'
      }
    ],
    sortEndpoints: 'path'
  };

  server.register(
    [
      Inert,
      Vision,
      {
        register: HapiSwagger,
        options: HapiSwaggerOptions
      },
      {
        register: require('hapi-routes'),
        options: {
          dir: `${__dirname}/app/routes`
        }
      },
      {
        register: Good,
        options: {
          reporters: []
        }
      }
    ],

    function (err) {
      if (err) {
        console.error(err);
        throw err; // something bad happened loading the plugin
      }

      //Adding routes
      for (var route in routes) {
        try {
          server.route(routes[route]);
        } catch (badThing) {
          console.error(badThing);
        }
      }

      server.on('response', function (request) {
        if (request.response === undefined || request.response === null) {
          console.log('No response');
        } else {
          var user = '';
          //if (request.auth && request.auth.credentials)
          user = 'Test';
          console.log(
            'Username:',
            user +
              '\n' +
              moment().local().format('YYYY-MM-DD HH:mm:ss') +
              ': ' +
              server.info.uri +
              ': ' +
              request.method.toUpperCase() +
              ' ' +
              request.url.path +
              ' \n ' +
              request.response.statusCode
          );
        }
      });

      server.ext('onPreResponse', corsHeaders);
      //TODO start HAPI server here
      server.start(function () {
        console.log('info', 'Server running at: ' + server.info.uri);
        server.log('info', 'Server running at: ' + server.info.uri);
      });
    }
  );
  module.exports = server;
} catch (error) {
  console.log('error-starting', error);
  throw error;
}
