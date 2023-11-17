import { BaseMysqlReport } from './app/reporting-framework/base-mysql.report';
import { HivMonthlyTbService } from './service/hiv-monthly-tb/hiv-monthly-tb.service';

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
      path: '/tb/patient-list',
      config: {
        handler: function (request, reply) {
          const hivMonthlyTbService = new HivMonthlyTbService(
            'hivMonthlyTbBase',
            {}
          );
          hivMonthlyTbService
            .generateReport()
            .then((report) => {
              reply(report);
            })
            .catch((e) => {
              console.error(e);
              reply(Boom.forbidden('Error'));
            });
        },
        description: 'Home',
        notes: 'Returns a message that shows ETL service is running.',
        tags: ['api']
      }
    },
    {
      method: 'GET',
      path: '/tb/monthly-report',
      config: {
        handler: function (request, reply) {
          const hivMonthlyTbService = new HivMonthlyTbService(
            'hivMonthlyTbAggregate',
            {}
          );
          hivMonthlyTbService
            .generateReport()
            .then((report) => {
              reply(report);
            })
            .catch((e) => {
              console.error(e);
              reply(Boom.forbidden('Error'));
            });
        },
        description: 'Home',
        notes: 'Returns a message that shows ETL service is running.',
        tags: ['api']
      }
    },
    {
      method: 'GET',
      path: '/tb/aggregated-monthly-report',
      config: {
        handler: function (request, reply) {
          const { query } = request;
          console.dir({ query }, { depth: null });
          let requestParams = Object.assign({}, request.query, request.params);
          const hivMonthlyTbService = new HivMonthlyTbService(
            'hivMonthlyTbAggregateDisaggregation',
            {}
          );
          hivMonthlyTbService
            .generateReport()
            .then((report) => {
              reply(report);
            })
            .catch((e) => {
              console.error(e);
              reply(Boom.forbidden('Error'));
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
