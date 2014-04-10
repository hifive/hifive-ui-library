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
			col7: random(100)
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
		if (url !== '/api/sample2') {
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

	var gridSample2Controller = {

		// --- コントローラの設定 --- //

		__name: 'h5.ui.components.datagrid.sample2.GridSample2Controller',

		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},


		// --- プロパティ --- //

		_gridController: h5.ui.components.datagrid.PagingGridController,


		// --- プライベートなメソッド --- //

		_updateSelectDataIds: function() {
			var selectedDataIds = this._gridController.getSelectedDataIds();
			this.$find('#selectedDataIds').text(selectedDataIds);
		},


		// --- ライフサイクル関連メソッド --- //

		__ready: function() {
			this._gridController.init({
				url: '/api/sample2',
				idKey: 'id',
				pageSize: 20,
				rowHeight: 25,
				headerColumns: 2,
				columns: [{
					propertyName: '_selectCheckBox',
					header: '選択',
					width: 40,
					formatter: function(cellData) {
						if (cellData.isHeaderRow) {
							return cellData.value;
						}
						var dataId = cellData.dataId;
						var checked = cellData.selected ? 'checked' : '';
						var html = '<input type="checkbox"';
						html += ' data-grid-sample-data-id="' + dataId + '"';
						html += ' ' + checked;
						html += '>';
						return html;
					},
					sortable: false
				}, {
					propertyName: 'date',
					header: '日付',
					width: 100,
					sortable: true
				}, {
					propertyName: 'col1',
					header: '列1',
					width: 60,
					sortable: false
				}, {
					propertyName: 'col2',
					header: '列2',
					width: 140,
					sortable: true
				}, {
					propertyName: 'col3',
					header: '列3',
					width: 120,
					sortable: false
				}, {
					propertyName: 'col4',
					header: '列4',
					width: 120,
					sortable: true
				}, {
					propertyName: 'col5',
					header: '列5',
					width: 100,
					sortable: true
				}, {
					propertyName: 'col6',
					header: '列6',
					width: 100,
					sortable: true
				}, {
					propertyName: 'col7',
					header: '列7',
					width: 100,
					sortable: true
				}, {
					propertyName: 'col8',
					header: '列8',
					width: 100,
					sortable: false
				}, {
					propertyName: 'col9',
					header: '列9',
					width: 140,
					sortable: false
				}]
			});
		},


		// --- イベントハンドラメソッド --- //

		'#nextPage click': function(context, $el) {
			context.event.preventDefault();

			var currentPage = this._gridController.getCurrentPage();
			this._gridController.movePage(currentPage + 1);
		},

		'#prevPage click': function(context, $el) {
			context.event.preventDefault();

			var currentPage = this._gridController.getCurrentPage();
			this._gridController.movePage(currentPage - 1);
		},

		'#currentPage change': function(context, $el) {
			var page = parseInt($el.val(), 10);
			var totalPages = this._gridController.getTotalPages();

			if (isNaN(page) || page < 0 || totalPages < page) {
				var currentPage = this._gridController.getCurrentPage();
				$el.val(currentPage);
				return;
			}

			this._gridController.movePage(page);
		},

		// 選択
		'input[type="checkbox"] change': function(context, $el) {
			var isSelected = $el.prop('checked');

			// data による取得は数値変換できる場合はしてしまうので文字列に直す
			var dataId = String($el.data('gridSampleDataId'));

			if (isSelected) {
				this._gridController.selectData(dataId);
			} else {
				this._gridController.unselectData(dataId);
			}

			this._updateSelectDataIds();
		},

		// 選択全解除
		'#unselectAll click': function() {
			this._gridController.unselectAllData();
			this._updateSelectDataIds();
		},

		// ページが変更されたらページの表示を変える
		'#grid changeSource': function() {
			var totalPages = this._gridController.getTotalPages();
			var currentPage = this._gridController.getCurrentPage();

			if (currentPage === 1) {
				this.$find('#prevPage').addClass('disabled-link');
			} else {
				this.$find('#prevPage').removeClass('disabled-link');
			}
			if (currentPage === totalPages) {
				this.$find('#nextPage').addClass('disabled-link', true);
			} else {
				this.$find('#nextPage').removeClass('disabled-link');
			}

			this.$find('#totalPages').text(totalPages);
			this.$find('#currentPage').val(currentPage);
		}

	};

	h5.core.expose(gridSample2Controller);

})(jQuery);

// ---- Init ---- //
$(function() {
	h5.core.controller('body', h5.ui.components.datagrid.sample2.GridSample2Controller);
});