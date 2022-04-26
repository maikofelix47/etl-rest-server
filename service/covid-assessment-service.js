'use strict';
const db = require('../etl-db');

const def = {
  getPatientLatestCovidAssessmentDate
};

function getPatientLatestCovidAssessmentDate(patientUuid) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT 
    DATE_FORMAT(e.encounter_datetime,'%Y-%m-%d') as 'latest_covid_assessment_date'
FROM
    amrs.encounter e
        JOIN
    amrs.person p ON (p.person_id = e.patient_id
        AND p.voided = 0)
WHERE
    p.uuid = '${patientUuid}'
        AND e.voided = 0
        AND e.encounter_type = '252'
ORDER BY e.encounter_datetime DESC
limit 1;`;

    console.log('sql', sql);

    const queryParts = {
      sql: sql
    };
    db.queryServer(queryParts, function (result) {
      result.sql = sql;
      resolve(result);
    });
  });
}

module.exports = def;
