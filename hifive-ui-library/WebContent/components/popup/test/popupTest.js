/*
 * Copyright (C) 2013-2014 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
$(function() {
	module('複数ポップアップ', {
		setup: function() {
		},
		teardown: function() {
		}
	});

	test("内部のコンテンツにz-index:1が指定してある", function() {
		stop();
		var testContent = '<div style="z-index: 1">z-indexが1</div>';
		this.popup = h5.ui.popupManager.createPopup('test', null, testContent);
		this.popup.show();
		this.popup.promise.done(function() {
			ok('z-index:1を指定しても内部のコンテンツがポップアップの後ろに隠れない');
			start();
		});
	});

	test("内部のコンテンツにz-index:10000が指定してある", function() {
		stop();
		var testContent = '<div style="z-index: 10000">z-indexが10000</div>';
		this.popup = h5.ui.popupManager.createPopup('test', null, testContent);
		this.popup.show();
		this.popup.promise.done(function() {
			ok('z-index:10000を指定してもoverlayの後ろに表示される');
			start();
		});
		var popup2 = h5.ui.popupManager.createPopup('test2', null, '2つめのポップアップ');
		popup2.show();
		popup2.setPosition('top');

	});
});