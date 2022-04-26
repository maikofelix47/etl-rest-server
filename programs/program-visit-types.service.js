const Promise = require('bluebird');
const scopeBuilder = require('./scope-builder.service');
const dataResolver = require('./patient-data-resolver.service');
const expressionRunner = require('../expression-runner/expression-runner');
const encounterType = require('../dao/encounter-type/encounter-type-dao');

const def = {
  isVisitTypeAllowed: isVisitTypeAllowed,
  separateAllowedDisallowedVisitTypes: separateAllowedDisallowedVisitTypes,
  getPatientVisitTypes: getPatientVisitTypes
};

module.exports = def;

function isVisitTypeAllowed(scope, visitType) {
  if (!visitType.allowedIf) {
    return true;
  }
  return expressionRunner.run(visitType.allowedIf, scope);
}

function isEncounterTypeAllowed(scope, encounterType) {
  if (!encounterType.allowedIf) {
    return true;
  }
  // console.log('Before run data scope', scope);
  const rundata = expressionRunner.run(encounterType.allowedIf, scope);
  console.log('rundata', rundata);
  return rundata;
}

function separateAllowedDisallowedVisitTypes(scope, visitTypes) {
  console.log('separateAllowedDisallowedVisitTypes : scope', scope);
  console.log('separateAllowedDisallowedVisitTypes : visitTypes', visitTypes);
  const separated = {
    allowed: [],
    disallowed: []
  };

  if (Array.isArray(visitTypes)) {
    visitTypes.forEach((item) => {
      if (isVisitTypeAllowed(scope, item)) {
        console.log('item', item);
        const encounterTypes = item.encounterTypes;
        const allowedEncounterTypes = encounterTypes.filter((e) => {
          return isEncounterTypeAllowed(scope, e);
        });

        item.encounterTypes = allowedEncounterTypes;

        console.log('Allowed encounter types', allowedEncounterTypes);

        separated.allowed.push(item);
      } else {
        separated.disallowed.push(item);
      }
    });
  }
  return separated;
}

function getPatientVisitTypes(
  patientUuid,
  programUuid,
  programEnrollmentUuid,
  intendedVisitLocationUuid,
  allProgramsConfig,
  retroSpective,
  visitDate
) {
  return new Promise((success, error) => {
    const program = allProgramsConfig[programUuid];
    if (!program) {
      error({ message: 'Program not found!' });
      return;
    }

    // resolve data dependencies
    dataResolver
      .getAllDataDependencies(program.dataDependencies || [], patientUuid, {
        programUuid: programUuid,
        programEnrollmentUuid: programEnrollmentUuid,
        intendedVisitLocationUuid: intendedVisitLocationUuid
      })
      .then((dataObject) => {
        // add missing properties
        dataObject.programUuid = programUuid;
        dataObject.intendedVisitLocationUuid = intendedVisitLocationUuid;
        dataObject.retroSpective = retroSpective;
        dataObject.visitDate = visitDate;
        // build scope
        const scopeObj = scopeBuilder.buildScope(dataObject);
        // console.log('scopeObj', scopeObj);
        const visits = program.visitTypes;

        program.visitTypes = separateAllowedDisallowedVisitTypes(
          scopeObj,
          visits
        );

        success(program);
      })
      .catch((dataErr) => {
        console.error(dataErr);
        error({
          message: 'Error resolving data dependencies'
        });
      });
  });
}
