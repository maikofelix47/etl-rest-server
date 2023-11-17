import { BaseMysqlReport } from '../../app/reporting-framework/base-mysql.report';

export class HivMonthlyTbService extends BaseMysqlReport {
  constructor(reportName, params) {
    super(reportName, params);
  }
  getIndicatordefs() {
    return 'Indicators';
  }
}
