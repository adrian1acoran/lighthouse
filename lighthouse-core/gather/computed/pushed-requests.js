/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');

class PushedRequests extends ComputedArtifact {
  get name() {
    return 'PushedRequests';
  }

  /**
   * Return list of network requests that were pushed.
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {Promise<Array<LH.WebInspector.NetworkRequest>>}
   */
  compute_(devtoolsLog, artifacts) {
    return artifacts.requestNetworkRecords(devtoolsLog).then(records => {
      const pushedRecords = records.filter(r => r._timing && !!r._timing.pushStart);
      return pushedRecords;
    });
  }
}

module.exports = PushedRequests;
