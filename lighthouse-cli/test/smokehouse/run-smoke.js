/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */
const {promisify} = require('util');
const execAsync = promisify(require('child_process').exec);

const {server, serverForOffline} = require('../fixtures/static-server');
const log = require('lighthouse-logger');

const purpleify = str => `${log.purple}${str}${log.reset}`;
const smokehouseDir = 'lighthouse-cli/test/smokehouse/';

const SMOKETESTS = [{
  id: 'ally',
  config: smokehouseDir + 'a11y/a11y-config.js',
  expectations: 'a11y/expectations.js',
}, {
  id: 'dbw',
  expectations: 'dobetterweb/dbw-expectations.js',
  config: smokehouseDir + 'dbw-config.js',
}, {
  id: 'redirects',
  expectations: 'redirects/expectations.js',
  config: smokehouseDir + 'redirects-config.js',
}, {
  id: 'seo',
  expectations: 'seo/expectations.js',
  config: smokehouseDir + 'seo-config.js',
}, {
  id: 'offline',
  expectations: 'offline-local/offline-expectations.js',
  config: smokehouseDir + 'offline-config.js',
}, {
  id: 'byte',
  expectations: 'byte-efficiency/expectations.js',
  config: smokehouseDir + 'byte-config.js',
  perfSensitive: true,
}, {
  id: 'perf',
  expectations: 'perf/expectations.js',
  config: 'lighthouse-core/config/perf-config.js',
  perfSensitive: true,
}, {
  id: 'ttci',
  expectations: 'tricky-ttci/expectations.js',
  config: 'lighthouse-core/config/default-config.js',
}, {
  id: 'pwa',
  expectations: smokehouseDir + 'pwa-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
}];

/**
 * Display smokehouse output from child process
 * @param {{id: string, process?: NodeJS.Process, code?: number}} cp
 */
function displaySmokehouseOutput(result) {
  console.log(`\n${purpleify(result.id)} smoketest results:`);
  if (result.error) {
    console.log(result.error.message);
    process.stdout.write(result.error.stdout);
    process.stderr.write(result.error.stderr);
  } else {
    process.stdout.write(result.process.stdout);
    process.stderr.write(result.process.stderr);
  }
  console.log(`${purpleify(result.id)} smoketest complete. \n`);
}

/**
 * Run smokehouse in child processes for selected smoketests
 * Display output from each as soon as they finish, but resolve function when ALL are complete
 * @param {*} smokes
 */
async function runSmokehouse(smokes) {
  const cmdPromises = [];
  for (const {id, expectations, config} of smokes) {
    // If the machine is terribly slow, do them in succession, not parallel
    if (process.env.APPVEYOR) {
      await Promise.all(cmdPromises);
    }

    console.log(`${purpleify(id)} smoketest starting…`);
    const cmd = [
      'node lighthouse-cli/test/smokehouse/smokehouse.js',
      `--config-path=${config}`,
      `--expectations-path=${expectations}`,
    ].join(' ');
    const p = execAsync(cmd, {timeout: 5 * 60 * 1000, encoding: 'utf8'}).then(cp => {
      const ret = {id: id, process: cp};
      displaySmokehouseOutput(ret);
      return ret;
    }).catch(err => {
      const ret = {id: id, error: err};
      displaySmokehouseOutput(ret);
      return ret;
    });
    cmdPromises.push(p);
  }

  return Promise.all(cmdPromises);
}

/**
 * Main function. Run webservers, smokehouse, then report on failures
 */
async function init() {
  server.listen(10200, 'localhost');
  serverForOffline.listen(10503, 'localhost');

  let smokes = [];
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    smokes = SMOKETESTS;
    console.log('Running ALL smoketests. Equivalent to:');
    console.log(`    ${log.dim}yarn smoke ${smokes.map(t => t.id).join(' ')}${log.reset}\n`);
  } else {
    smokes = SMOKETESTS.filter(test => argv.includes(test.id));
    console.log(`Running ONLY smoketests for: ${smokes.map(t => t.id).join(' ')}\n`);
  }

  const parallelSmokes = SMOKETESTS.filter(t => !t.perfSensitive);
  const serialSmokes = SMOKETESTS.filter(t => t.perfSensitive);

  const smokeResults = await runSmokehouse(parallelSmokes);
  const serialSmokeResults = await runSmokehouse(serialSmokes);
  smokeResults.push(...serialSmokeResults);

  await new Promise(res => server.close(res));
  await new Promise(res => serverForOffline.close(res));

  const failingTests = smokeResults.filter(res => !!res.error);

  if (failingTests.length) {
    const testNames = failingTests.map(t => t.id).join(', ');
    console.error(log.redify(`We have ${failingTests.length} failing smoketests: ${testNames}`));
    process.exit(1);
  }

  process.exit(0);
}

init();
