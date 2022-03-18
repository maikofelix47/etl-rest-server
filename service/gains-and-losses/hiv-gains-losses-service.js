const Promise = require('bluebird');
const _ = require('lodash');
import { MultiDatasetPatientlistReport } from '../../app/reporting-framework/multi-dataset-patientlist.report.js';
import ReportProcessorHelpersService from '../../app/reporting-framework/report-processor-helpers.service';
const gainsLossesIndicatorDefs = require('../../app/reporting-framework/hiv/gains-and-losses-indicators.json');
const etlHelpers = require('../../etl-helpers.js');
const patientListCols = require('../../app/reporting-framework/json-reports/gains-and-losses/gains-and-losses-patient-list-cols.json');
const Moment = require('moment');
const gainsAndLossesSections = require('../../app/reporting-framework/hiv/hiv-monthly-gains-and-losses-sections.json');
export class HIVGainsAndLossesService extends MultiDatasetPatientlistReport {
  constructor(reportName, params) {
    super(reportName, params);
    params.hivMonthlyGainsEndingDatasetSource =
      'etl.hiv_monthly_report_dataset_frozen';
    params.hivMonthlyGainsStartingDatasetSource =
      'etl.hiv_monthly_report_dataset_frozen';
  }

  generateReport(additionalParams) {
    const that = this;
    return new Promise((resolve, reject) => {
      that
        .getSourceTables()
        .then((sourceTables) => {
          that.params.hivMonthlyGainsEndingDatasetSource =
            sourceTables.hivMonthlyGainsEndingDatasetSource;
          that.params.hivMonthlyGainsStartingDatasetSource =
            sourceTables.hivMonthlyGainsStartingDatasetSource;
          super
            .generateReport(additionalParams)
            .then((results) => {
              if (
                additionalParams &&
                additionalParams.type === 'patient-list'
              ) {
                resolve(results);
              } else {
                let finalResult = [];
                const reportProcessorHelpersService = new ReportProcessorHelpersService();
                for (let result of results) {
                  if (
                    result.report &&
                    result.report.reportSchemas &&
                    result.report.reportSchemas.main &&
                    result.report.reportSchemas.main.transFormDirectives
                      .joinColumn
                  ) {
                    finalResult = reportProcessorHelpersService.joinDataSets(
                      that.params[
                        result.report.reportSchemas.main.transFormDirectives
                          .joinColumnParam
                      ] ||
                        result.report.reportSchemas.main.transFormDirectives
                          .joinColumn,
                      finalResult,
                      result.results.results.results
                    );
                  }
                }

                const proxyRetention = this.calculateProxiRetention(
                  finalResult
                );

                resolve({
                  queriesAndSchemas: results,
                  result: finalResult,
                  proxyRetention: proxyRetention,
                  sectionDefinitions: gainsLossesIndicatorDefs,
                  indicatorDefinitions: [],
                  isDraftReport: this.deterMineIfDraftReport(sourceTables),
                  gainsAndLossesSections: gainsAndLossesSections,
                  resultTotals: this.generateTotalsColumn(finalResult)
                });
              }
            })
            .catch((error) => {
              console.error(
                'Gains and losses report generation error: ',
                error
              );
              reject(error);
            });
        })
        .catch((error) => {
          console.log('Source Table dermination error', error);
          reject(error);
        });
    });
  }

  generatePatientListReport(indicators) {
    let self = this;
    return new Promise((resolve, reject) => {
      super
        .generatePatientListReport(indicators)
        .then((results) => {
          // console.log('Results', results);
          const patientListCols = this.getIndicatorPatientList(indicators);
          let result = results.result;
          results['results'] = {
            results: result,
            patientListCols: patientListCols
          };
          delete results['result'];
          _.each(results.results.results, (row) => {
            row.cur_meds = etlHelpers.getARVNames(row.cur_meds);
          });
          resolve(results);
        })
        .catch((err) => {
          console.error('Gains and Losses patient list generation error', err);
          reject(err);
        });
    });
  }

  getIndicatorPatientList(indicator) {
    let patientList = [];
    if (patientListCols.hasOwnProperty(indicator)) {
      patientList = patientListCols[indicator].patientListCols;
    } else {
      patientList = patientListCols['general'].patientListCols;
    }

    return patientList;
  }

  calculateProxiRetention(results) {
    let curr_tx = 0;
    let curr_tx_expected = 0;
    let proxi_retention = 0;
    if (results.length > 0) {
      const result = results[0];
      curr_tx = result.on_art_starting;
      curr_tx_expected =
        result.on_art_starting +
        result.ending_new_on_art +
        result.return_to_care +
        result.transferred_in -
        result.transfer_out;
    }
    proxi_retention = ((curr_tx / curr_tx_expected) * 100).toFixed(2);

    return proxi_retention;
  }
  getSourceTables() {
    const self = this;
    return new Promise((resolve, reject) => {
      let query = 'select * from etl.moh_731_last_release_month';
      let runner = self.getSqlRunner();

      runner
        .executeQuery(query)
        .then((results) => {
          const lastReleasedMonth = results[0]['last_released_month'];
          console.log(
            `Last released MOH 731 month: ' ${Moment(
              lastReleasedMonth
            ).toLocaleString()}`
          );
          let sourceTables = {
            hivMonthlyGainsEndingDatasetSource: this.determineSourceTable(
              self.params.endingMonth,
              lastReleasedMonth
            ),
            hivMonthlyGainsStartingDatasetSource: this.determineSourceTable(
              self.params.startingMonth,
              lastReleasedMonth
            )
          };

          resolve(sourceTables);
        })
        .catch((error) => {
          console.error('Error getting moh 731 released report month:', error);
          reject(error);
        });
    });
  }

  determineSourceTable(month, lastReleasedMonth) {
    // set default source table to frozen table
    let sourceTable = 'etl.hiv_monthly_report_dataset_frozen';
    if (Moment(lastReleasedMonth).isSameOrAfter(Moment(month))) {
      sourceTable = 'etl.hiv_monthly_report_dataset_frozen';
    } else {
      sourceTable = 'etl.hiv_monthly_report_dataset_v1_2';
    }
    return sourceTable;
  }
  deterMineIfDraftReport(dataSourceTables) {
    let isDraft = false;

    if (
      dataSourceTables.hivMonthlyGainsEndingDatasetSource ===
        'etl.hiv_monthly_report_dataset_v1_2' ||
      dataSourceTables.hivMonthlyGainsStartingDatasetSource ===
        'etl.hiv_monthly_report_dataset_v1_2'
    ) {
      isDraft = true;
    }

    return isDraft;
  }
  generateTotalsColumn(results) {
    let totalResults = [];
    let resultRow = {
      location_uuid: [],
      location: 'Total',
      reporting_month: ''
    };
    results.forEach((locationResult) => {
      Object.entries(locationResult).forEach(([key, value]) => {
        if (
          typeof value === 'number' &&
          key !== 'location_id' &&
          key !== 'person_id'
        ) {
          resultRow[key] = value + (resultRow[key] ? resultRow[key] : 0);
        } else if (key === 'location_uuid') {
          resultRow.location_uuid.push(value);
        } else if (key === 'reporting_month') {
          resultRow.reporting_month = value;
        } else {
        }
      });
    });
    totalResults.push(resultRow);
    return totalResults;
  }
}
