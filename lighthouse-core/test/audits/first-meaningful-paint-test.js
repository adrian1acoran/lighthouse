/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FMPAudit = require('../../audits/first-meaningful-paint.js');
const Audit = require('../../audits/audit.js');
const assert = require('assert');
const options = FMPAudit.defaultOptions;
const traceEvents = require('../fixtures/traces/progressive-app.json');
const badNavStartTrace = require('../fixtures/traces/bad-nav-start-ts.json');
const lateTracingStartedTrace = require('../fixtures/traces/tracingstarted-after-navstart.json');
const preactTrace = require('../fixtures/traces/preactjs.com_ts_of_undefined.json');
const noFMPtrace = require('../fixtures/traces/no_fmp_event.json');
const noFCPtrace = require('../fixtures/traces/airhorner_no_fcp');

const Runner = require('../../runner.js');
const computedArtifacts = Runner.instantiateComputedArtifacts();

function generateArtifactsWithTrace(trace) {
  return Object.assign({
    traces: {
      [Audit.DEFAULT_PASS]: {traceEvents: Array.isArray(trace) ? trace : trace.traceEvents},
    },
    devtoolsLogs: {[Audit.DEFAULT_PASS]: []},
  }, computedArtifacts);
}

/* eslint-env mocha */
describe('Performance: first-meaningful-paint audit', () => {
  const context = {options, settings: {throttlingMethod: 'provided'}};

  describe('measures the pwa.rocks example correctly', () => {
    let fmpResult;

    it('processes a valid trace file', () => {
      return FMPAudit.audit(generateArtifactsWithTrace(traceEvents), context).then(result => {
        fmpResult = result;
      }).catch(_ => {
        assert.ok(false);
      });
    });

    it('finds the expected fMP', () => {
      assert.equal(fmpResult.displayValue, '1,100\xa0ms');
      assert.equal(fmpResult.rawValue, 1099.523);
    });

    it('scores the fMP correctly', () => {
      assert.equal(fmpResult.score, 0.99);
    });
  });

  describe('finds correct FMP', () => {
    it('if there was a tracingStartedInPage after the frame\'s navStart', () => {
      const artifacts = generateArtifactsWithTrace(lateTracingStartedTrace);
      return FMPAudit.audit(artifacts, context).then(result => {
        assert.equal(result.displayValue, '530\xa0ms');
        assert.equal(result.rawValue, 529.916);
      });
    });

    it('if there was a tracingStartedInPage after the frame\'s navStart #2', () => {
      const artifacts = generateArtifactsWithTrace(badNavStartTrace);
      return FMPAudit.audit(artifacts, context).then(result => {
        assert.equal(result.displayValue, '630\xa0ms');
        assert.equal(result.rawValue, 632.424);
      });
    });

    it('if it appears slightly before the fCP', () => {
      return FMPAudit.audit(generateArtifactsWithTrace(preactTrace), context).then(result => {
        assert.equal(result.displayValue, '880\xa0ms');
        assert.equal(result.rawValue, 878.353);
      });
    });

    it('from candidates if no defined FMP exists', () => {
      return FMPAudit.audit(generateArtifactsWithTrace(noFMPtrace), context).then(result => {
        assert.equal(result.displayValue, '4,460\xa0ms');
        assert.equal(result.rawValue, 4460.928);
      });
    });
  });

  it('handles traces missing an FMP', () => {
    return FMPAudit.audit(generateArtifactsWithTrace(noFCPtrace), context).then(result => {
      assert.strictEqual(result.debugString, undefined);
      assert.strictEqual(result.displayValue, '480\xa0ms');
      assert.strictEqual(result.rawValue, 482.318);
    });
  });
});
