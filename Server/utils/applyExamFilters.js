/**
 * Reads common exam-hierarchy filter fields from a query object and adds
 * them to an existing MongoDB filter — only when the query param is present
 * AND the filter doesn't already define that key (avoids overwriting e.g.
 * an $in operator that was set up earlier).
 *
 * Supported fields: examSeriesId, examStructureId, subjectName, pyqYear.
 *
 * @param {Object} filter  – the MongoDB query object to mutate
 * @param {Object} query   – typically req.query
 * @returns {Object} the same filter object (for chaining convenience)
 */
module.exports = function applyExamFilters(filter, query) {
  if (query.examSeriesId && filter.examSeriesId === undefined) {
    filter.examSeriesId = query.examSeriesId;
  }
  if (query.examStructureId) {
    filter.examStructureId = query.examStructureId;
  }
  if (query.subjectName) {
    filter.subjectName = query.subjectName;
  }
  if (query.pyqYear) {
    filter.pyqYear = Number(query.pyqYear);
  }
  if (query.testType) {
    filter.testType = query.testType;
  }
  if (query.shift) {
    filter.shift = query.shift;
  }
  if (query.topicName) {
    filter.topicName = query.topicName;
  }
  if (query.testFormat) {
    filter.testFormat = query.testFormat;
  }
  return filter;
};
