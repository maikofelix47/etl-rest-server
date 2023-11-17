module.exports = (function () {
  var routes = [
    {
      method: 'GET',
      path: '/',
      config: {
        handler: function (request, reply) {
          console.log('default rote', request.path);

          reply('Welcome to Ampath ETL service.');
          //return reply(Boom.forbidden('Not this end point bruh'));
        },
        description: 'Home',
        notes: 'Returns a message that shows ETL service is running.',
        tags: ['api']
      }
    }
  ];

  return routes;
})();
