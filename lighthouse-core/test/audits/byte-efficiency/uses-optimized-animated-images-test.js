/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const UsesOptimizedAnimatedImages =
  require('../../../audits/byte-efficiency/uses-optimized-animated-images');
const WebInspector = require('../../../lib/web-inspector');
const assert = require('assert');

describe('Page uses videos for animated GIFs', () => {
  it('should flag gifs above 10kb as unoptimized', async () => {
    const networkRecords = [
      {
        _resourceType: WebInspector.resourceTypes.Image,
        mimeType: 'image/gif',
        transferSize: 10240,
      },
      {
        _resourceType: WebInspector.resourceTypes.Image,
        mimeType: 'image/gif',
        transferSize: 11000,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesOptimizedAnimatedImages.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
    };

    const {score, rawValue, details} = await UsesOptimizedAnimatedImages.audit(artifacts);
    assert.equal(score, 0);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 1);
  });

  it(`shouldn't flag content that looks like a gif but isn't`, async () => {
    const networkRecords = [
      {
        mimeType: 'image/gif',
        _resourceType: WebInspector.resourceTypes.Media,
        transferSize: 15000,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesOptimizedAnimatedImages.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
    };

    const {score, rawValue, details} = await UsesOptimizedAnimatedImages.audit(artifacts);
    assert.equal(score, 1);
    assert.equal(rawValue, 1);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't flag non gif content`, async () => {
    const networkRecords = [
      {
        _resourceType: WebInspector.resourceTypes.Document,
        mimeType: 'text/html',
        transferSize: 15000,
      },
      {
        _resourceType: WebInspector.resourceTypes.Stylesheet,
        mimeType: 'text/css',
        transferSize: 15000,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesOptimizedAnimatedImages.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
    };

    const {score, rawValue, details} = await UsesOptimizedAnimatedImages.audit(artifacts);
    assert.equal(score, 1);
    assert.equal(rawValue, 1);
    assert.equal(details.items.length, 0);
  });
});
