

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
    },
    {
      method: 'GET',
      path: '/aggregate-report',
      config: {
        handler: function (request, reply) {
          console.log('base report...');
          const hmr = new HivMonthlyReport('hivMonthlyReportAggregate', {});
          hmr
            .generateReport()
            .then((data) => {
              console.log({ data });
              reply(data);
            })
            .catch((err) => {
              console.error({ err });
              reply(err);
            });
        },
        description: 'Home',
        notes: 'Returns a message that shows ETL service is running.',
        tags: ['api']
      }
    },
    {
      method: 'GET',
      path: '/base-report',
      config: {
        handler: function (request, reply) {
          console.log('base report...');
          const hmr = new HivMonthlyReport('hivMonthlyReportBase', {});
          hmr
            .generateReport()
            .then((data) => {
              console.log({ data });
              reply(data);
            })
            .catch((err) => {
              console.error({ err });
              reply(err);
            });
        },
        description: 'Home',
        notes: 'Returns a message that shows ETL service is running.',
        tags: ['api']
      }
    }
  ];

  return routes;
})();
