import { Json2Sql } from 'ampath-json2sql';
import { Promise } from 'bluebird';
import QueryService from '../database-access/query.service';
import ReportProcessorHelpersService from './report-processor-helpers.service';
import * as hiv_monthly_tb_base from './json-reports/hiv-montly-tb-base.json';
import * as hiv_monthly_tb_aggregate from './json-reports/hiv-montly-tb-aggregate.json';
import * as hiv_monthly_tb_aggregate_disaggregated from './json-reports/hiv-montly-tb-aggregate-disaggregation.json';

export class BaseMysqlReport {
  constructor(reportName, params) {
    this.reportName = reportName;
    this.params = params;
  }

  generateReport() {
    // 1. Fetch report schema
    // 2. Generate report sql using json2sql
    // 3. Execute sql statement using sql generator
    const that = this;
    return new Promise((resolve, error) => {
      // fetch reports
      that
        .fetchReportSchema(that.reportName)
        .then((reportSchemas) => {
          console.dir({ reportSchemas }, { depth: null });
          that.reportSchemas = reportSchemas;
          // generate query
          that
            .generateReportQuery(that.reportSchemas, that.params)
            .then((sqlQuery) => {
              // allow user to use 'null' as parameter values
              sqlQuery = sqlQuery.replace(/\'null\'/g, 'null');
              // console.log({ sqlQuery });
              that.reportQuery = sqlQuery;
              // run query
              that
                .executeReportQuery(that.reportQuery)
                .then((result) => {
                  // console.dir({ result }, { depth: null });
                  return that.transFormResults(that.reportSchemas, result);
                })
                .then((results) => {
                  that.queryResults = results;
                  // console.dir({ results }, { depth: null });
                  resolve({
                    schemas: that.reportSchemas,
                    sqlQuery: that.reportQuery,
                    results: that.queryResults
                  });
                })
                .catch((err) => {
                  error(err);
                });
            })
            .catch((err) => {
              error(err);
            });
        })
        .catch((err) => {
          error(err);
        });
    });
  }

  fetchReportSchema(reportName, version) {
    return new Promise((resolve, reject) => {
      switch (reportName) {
        case 'hivMonthlyTbBase':
          resolve({
            main: this.cloneJsonSchema(hiv_monthly_tb_base) //patient_list_test_template
          });
          break;
        case 'hivMonthlyTbAggregate':
          resolve({
            main: this.cloneJsonSchema(hiv_monthly_tb_aggregate),
            hivMonthlyTbBase: this.cloneJsonSchema(hiv_monthly_tb_base)
          });
        case 'hivMonthlyTbAggregateDisaggregation':
          resolve({
            main: this.cloneJsonSchema(hiv_monthly_tb_aggregate_disaggregated),
            hivMonthlyTbBase: this.cloneJsonSchema(hiv_monthly_tb_base)
          });
        default:
          reject('Unknown report ', reportName);
          break;
      }
    });
  }

  generateReportQuery(reportSchemas, params) {
    // console.log('Passed params', params)
    // console.log('report schemas', JSON.stringify(reportSchemas, null, 4));
    let jSql = this.getJson2Sql(reportSchemas, params);
    // console.log({ jSql });
    return new Promise((resolve, reject) => {
      try {
        resolve(jSql.generateSQL().toString());
      } catch (error) {
        console.error('Error generating report sql statement', error);
        reject('Encountered an unexpected error', error);
      }
    });
  }

  getJson2Sql(reportSchemas, params) {
    return new Json2Sql(reportSchemas.main, reportSchemas, params);
  }

  executeReportQuery(sqlQuery) {
    // console.log('Executing Query', sqlQuery);
    let runner = this.getSqlRunner();
    return new Promise((resolve, reject) => {
      runner
        .executeQuery(sqlQuery)
        .then((results) => {
          resolve({
            results: results
          });
        })
        .catch((error) => {
          console.error('Error Executing Mysql Query', error);
          reject(error);
        });
    });
  }

  transFormResults(reportSchemas, result) {
    return new Promise((resolve, reject) => {
      try {
        if (
          reportSchemas &&
          reportSchemas.main &&
          reportSchemas.main.transFormDirectives &&
          reportSchemas.main.transFormDirectives.disaggregationColumns &&
          reportSchemas.main.transFormDirectives.joinColumn
        ) {
          const reportProcessorHelpersService = new ReportProcessorHelpersService();
          let final = reportProcessorHelpersService.tranform(result.results, {
            use: reportSchemas.main.transFormDirectives.disaggregationColumns,
            skip: reportSchemas.main.transFormDirectives.skipColumns || [],
            joinColumn: reportSchemas.main.transFormDirectives.joinColumn
          });
          result.results = final;
        }
        resolve(result);
      } catch (error) {
        console.error(error);
        reject(error);
        // expected output: SyntaxError: unterminated string literal
        // Note - error messages will vary depending on browser
      }
    });
  }

  getSqlRunner() {
    return new QueryService();
  }

  cloneJsonSchema(schema) {
    return JSON.parse(JSON.stringify(schema));
  }
}
