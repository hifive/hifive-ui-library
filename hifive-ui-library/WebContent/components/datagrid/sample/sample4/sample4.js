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
 * hifive
 */

/*global h5 */

// ---- Fake Server ---- //
(function($) {

	var random = function(range) {
		return Math.floor(Math.random() * range);
	};

	var data = [];
	for (var i = 0; i < 10000; i++) {
		var now = new Date();
		var time = now.getTime() + random(100) * 1000 * 60 * 60 * 24;
		var date = new Date(time);

		var year = String(date.getFullYear());
		var month = String(date.getMonth() + 1);
		var day = String(date.getDate());

		month = '0' + month;
		month = month.substring(month.length - 2);

		day = '0' + day;
		day = day.substring(day.length - 2);

		var ymd = year + '/' + month + '/' + day;

		var record = {
			id: i,
			date: ymd,
			col2: random(10),
			col4: random(1000),
			col5: random(10000),
			col6: random(100),
			col7: random(100),
			col8: random(100),
			col9: random(100)
		};

		data.push(record);
	}

	var sortKey = null;
	var sortOrder = 'asc';

	var sorted = $.extend([], data);

	var sort = function(option) {
		var requestSortKey = option.sortKey;
		var requestSortOrder = option.sortOrder;
		if (typeof requestSortKey === 'undefined') {
			requestSortKey = null;
		}
		if (requestSortOrder == null) {
			requestSortOrder = 'asc';
		}

		if (sortKey === requestSortKey && sortOrder === requestSortOrder) {
			return;
		}

		sortKey = requestSortKey;
		sortOrder = requestSortOrder;

		if (sortKey == null) {
			sorted = $.extend([], data);
			return;
		}

		sorted.sort(function(x, y) {
			var xValue = x[sortKey];
			var yValue = y[sortKey];

			var base = (sortOrder === 'asc') ? 1 : -1;

			if (xValue < yValue) {
				return -1 * base;
			}
			if (xValue === yValue) {
				return 0;
			}
			return 1 * base;
		});
	};


	var createResult = function(option) {

		sort(option);

		var result = {
			list: sorted.slice(option.start, option.end)
		};

		if (option.requireTotalCount) {
			result.totalCount = sorted.length;
		}

		return result;
	};


	var originAjax = h5.ajax;

	h5.ajax = function(url, option) {
		if (url !== '/api/sample4') {
			return originAjax(url, option);
		}

		var deferred = h5.async.deferred();

		setTimeout(function() {
			var result = createResult(option.data);
			deferred.resolve(result);
		}, 200);

		return deferred.promise();
	};

})(jQuery);


// ---- Controller ---- //
(function($) {

	var gridSample4Controller = {

		// --- コントローラの設定 --- //

		__name: 'h5.ui.components.datagrid.sample4.GridSample4Controller',

		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},


		// --- プロパティ --- //

		_gridController: h5.ui.components.datagrid.HorizontalScrollGridController,


		// --- ライフサイクル関連メソッド --- //

		__ready: function() {
			this._gridController.init({
				url: '/api/sample4',
				idKey: 'id',
				columnWidth: 150,
				headerRows: 2,
				verticalScrollStrategy: 'pixel',
				horizontalScrollStrategy: 'pixel',
				rows: [{
					propertyName: 'date',
					header: '日付',
					height: 25
				}, {
					propertyName: 'col1',
					header: '列1',
					height: 25
				}, {
					propertyName: 'col2',
					header: '列2',
					height: 25
				}, {
					propertyName: 'col3',
					header: '列3',
					height: 25
				}, {
					propertyName: 'col4',
					header: '列4',
					height: 25
				}, {
					propertyName: 'col5',
					header: '列5',
					height: 25
				}, {
					propertyName: 'col6',
					header: '列6',
					height: 300
				}, {
					propertyName: 'col7',
					header: '列7',
					height: 25
				}, {
					propertyName: 'col8',
					header: '列8',
					height: 25
				}, {
					propertyName: 'col9',
					header: '列9',
					height: 25
				}]
			});
		},


		// --- イベントハンドラメソッド --- //

	};

	h5.core.expose(gridSample4Controller);

})(jQuery);

// ---- Init ---- //
$(function() {
	h5.core.controller('body', h5.ui.components.datagrid.sample4.GridSample4Controller);
});