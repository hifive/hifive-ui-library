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

/*jshint browser: true, jquery: true */
/*global h5 */


// ---- SingleSelector ---- //
(function($) {
	'use strict';

	var SingleSelector = function() {
		this._selectKey = null;
	};

	$.extend(SingleSelector.prototype, {

		// --- Property --- //

		_selectKey: null,


		// --- Public Method --- //

		select: function(key) {
			this._selectKey = key;
		},

		unselect: function(key) {
			if (this._selectKey === key) {
				this._selectKey = null;
			}
		},

		unselectAll: function() {
			this._selectKey = null;
		},

		isSelected: function(key) {
			return this._selectKey === key;
		},

		getSelectedKeys: function() {
			return [this._selectKey];
		}
	});

	h5.u.obj.expose('h5.ui.components.datagrid', {

		/**
		 * @memberOf h5.ui.components.datagrid
		 */
		createSingleSelector: function() {
			return new SingleSelector();
		}
	});

})(jQuery);


// ---- MultiSelector ---- //

(function($) {
	'use strict';

	var MultiSelector = function() {
		this._selectMap = {};
	};

	$.extend(MultiSelector.prototype, {

		_selectMap: null,


		// --- Public Method --- //

		select: function(key) {
			if (this._selectMap[key] == null) {
				this._selectMap[key] = true;
			}
		},

		unselect: function(key) {
			if (this._selectMap[key]) {
				delete this._selectMap[key];
			}
		},

		unselectAll: function() {
			this._selectMap = {};
		},

		isSelected: function(key) {
			return this._selectMap[key] != null;
		},

		getSelectedKeys: function() {
			return $.map(this._selectMap, function(value, key) {
				return key;
			});
		}
	});


	h5.u.obj.expose('h5.ui.components.datagrid', {

		/**
		 * @memberOf h5.ui.components.datagrid
		 */
		createMultiSelector: function() {
			return new MultiSelector();
		}
	});

})(jQuery);

// ---- PagingAdapter ---- //
(function($) {
	'use strict';

	var EventDispatcher = h5.ui.components.virtualScroll.data.EventDispatcher;

	var PagingAdapter = function(dataSource, pageSize) {
		this._source = dataSource;
		this._pageSize = pageSize;
		this._currentPage = 1;
		this._pageData = [];

		var that = this;
		this._source.addEventListener('changeSource', function(ev) {
			that.movePage(that._currentPage);
		});
	};

	$.extend(PagingAdapter.prototype, new EventDispatcher(), {

		_source: null,
		_pageSize: null,
		_pageData: null,
		_currentPage: null,

		changeSearchOptions: function(searchOptions) {
			this._source.changeSearchOptions(searchOptions);
		},

		getSearchOptions: function() {
			return this._source.getSearchOptions();
		},

		getTotalLength: function() {
			return this._pageData.length;
		},

		isCached: function(start, end) {
			return true;
		},

		sliceAsync: function(start, end) {
			var deferred = h5.async.deferred();

			var sliced = this._pageData.slice(start, end);
			deferred.resolve(sliced);

			return deferred.promise();
		},

		sliceCachedData: function(start, end) {
			return this._pageData.slice(start, end);
		},

		getCachedData: function(index) {
			return this._pageData[index];
		},

		onChangeSource: function(listener) {
			this.addEventListener('changeSource', listener);
		},

		getCurrentPage: function() {
			return this._currentPage;
		},

		getTotalPages: function() {
			var pages = Math.ceil(this._source.getTotalLength() / this._pageSize);
			if (pages <= 0) {
				return 1;
			}
			return pages;
		},

		movePage: function(pageNumber) {
			var start = (pageNumber - 1) * this._pageSize;
			var end = start + this._pageSize;


			var max = this._source.getTotalLength();
			if (max < end) {
				end = max;
			}

			if (end <= start && pageNumber !== 1) {
				throw new Error('存在しないページです');
			}

			var that = this;
			this._source.sliceAsync(start, end).then(function(data) {
				that._currentPage = pageNumber;
				that._pageData = data;
				that.dispatchEvent({
					type: 'changeSource'
				});
			});
		}
	});

	h5.u.obj.expose('h5.ui.components.datagrid', {

		/**
		 * @memberOf h5.ui.components.datagrid
		 */
		createPagingAdapter: function(dataSource, pageSize) {
			return new PagingAdapter(dataSource, pageSize);
		}
	});

})(jQuery);


// ---- GridDataConverter ---- //
(function($) {
	'use strict';

	var EventDispatcher = h5.ui.components.virtualScroll.data.EventDispatcher;


	var GridDataConverter = function(params) {
		this._source = params.dataSource;
		this._idKey = params.idKey;
		this._columns = params.columns;
		this._selector = params.selector;
		this._defaultRowHeight = params.defaultRowHeight;
		this._defaultColumnWidth = params.defaultColumnWidth;

		this._columns = [];

		this._heightMap = {};
		this._widthMap = {};
		this._sortable = {};
		this._markable = {};
		this._modified = {};
		this._markedRange = {
			rowStart: 0,
			rowEnd: 0,
			columnStart: 0,
			columnEnd: 0
		};

		for (var i = 0, len = params.columns.length; i < len; i++) {
			this._columns.push({
				key: params.columns[i]
			});
		}

		var that = this;
		if (params.columnsOption != null) {
			this._columnsHeader = {};
			$.each(params.columnsOption, function(key, option) {
				if (option.width != null) {
					that._widthMap[key] = option.width;
				}
				if (option.header != null) {
					that._columnsHeader[key] = option.header;
				}
				that._sortable[key] = !!option.sortable;
				that._markable[key] = !!option.markable;
			});
		}

		this._init();
	};


	$.extend(GridDataConverter.prototype, new EventDispatcher(), {

		// --- Property --- //


		/**
		 * @memberOf h5.ui.components.datagrid.GridDataConverter
		 */
		_source: null,

		_idKey: null,

		_columns: null,


		_selector: null,

		_heightMap: null,

		_widthMap: null,

		_sortable: null,

		_markable: null,

		_defaultRowHeight: null,

		_defaultColumnWidth: null,

		_columnsHeader: null,

		_modified: null,

		_markedRange: null,



		// --- Private Method --- //

		_dataToId: function(data) {
			if (data == null) {
				return null;
			}
			return data[this._idKey];
		},

		_cellToEditKey: function(rowId, columnId, data) {
			return this._columns[columnId].key;
		},

		_cellToSelectKey: function(rowId, columnId, data) {
			return this._dataToId(data);
		},

		_cellToHeightKey: function(rowId, data) {
			return this._dataToId(data);
		},

		_cellToWidthKey: function(columnId, data) {
			return this._columns[columnId].key;
		},

		_cellToValue: function(rowId, columnId, data) {
			if (data == null) {
				return null;
			}
			var key = this._columns[columnId].key;
			return data[key];
		},

		_range2DTo1D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var start = rowStart;
			var end = rowEnd;
			if (this._columnsHeader != null) {
				start -= 1;
				end -= 1;

				if (start < 0) {
					start = 0;
				}
			}
			return {
				start: start,
				end: end
			};
		},

		_createHeaderRow: function(columnStart, columnEnd) {

			var searchOptions = this._source.getSearchOptions();
			var sorts = {};

			if (searchOptions.sort != null) {
				$.each(searchOptions.sort, function(i, elem) {
					sorts[elem.property] = elem.order;
				});
			}

			var row = [];
			for (var i = columnStart; i < columnEnd; i += 1) {
				var key = this._columns[i].key;
				var header = key;
				if (this._columnsHeader[key] != null) {
					header = this._columnsHeader[key];
				}

				var columnId = i;
				var height = this._defaultRowHeight;

				var widthKey = this._cellToWidthKey(columnId, null);
				var width = this._defaultColumnWidth;
				if (this._widthMap.hasOwnProperty(widthKey)) {
					width = this._widthMap[widthKey];
				}

				var isSortableColumn = this._sortable[key];
				var sortOrder = null;
				if (sorts.hasOwnProperty(key)) {
					sortOrder = sorts[key];
				}

				var cellData = {
					dataId: null,
					rowId: 0,
					columnId: columnId,

					propertyName: key,
					editKey: null,
					selectKey: null,
					heightKey: null,
					widthKey: widthKey,

					selected: false,
					height: height,
					width: width,

					isHeaderRow: true,
					isSortableColumn: isSortableColumn,
					sortOrder: sortOrder,

					isMarkableCell: false,

					rowData: null,
					value: header
				};

				row.push(cellData);
			}
			return row;
		},

		_convert: function(dataArray, rowStart, rowEnd, columnStart, columnEnd) {
			var cells = [];

			var rangeHeight = 0;
			var rangeWidth = 0;

			var row;

			var i = 0;
			var rowId = rowStart;
			var len = dataArray.length;

			var markedRange = this._markedRange;

			if (this._columnsHeader != null) {
				if (rowStart === 0 && 0 < rowEnd) {
					var headerRow = this._createHeaderRow(columnStart, columnEnd);
					$.each(headerRow, function(index, headerCell) {
						if (index === 0) {
							rangeHeight += headerCell.height;
						}
						rangeWidth += headerCell.width;
					});
					cells.push(this._createHeaderRow(columnStart, columnEnd));
				}
			}

			for (; i < len; i += 1) {
				var data = dataArray[i];
				var dataId = this._dataToId(data);

				var heightKey = this._cellToHeightKey(rowId, data);
				var height = this._defaultRowHeight;
				if (this._heightMap.hasOwnProperty(heightKey)) {
					height = this._heightMap[heightKey];
				}

				var isMarkedRow = markedRange.rowStart <= rowId && rowId < markedRange.rowEnd;

				rangeHeight += height;

				row = [];

				for (var j = columnStart; j < columnEnd; j += 1) {
					var columnId = j;

					var widthKey = this._cellToWidthKey(columnId, data);
					var width = this._defaultColumnWidth;
					if (this._widthMap.hasOwnProperty(widthKey)) {
						width = this._widthMap[widthKey];
					}

					var selectKey = this._cellToSelectKey(rowId, columnId, data);
					var selected = this._selector.isSelected(selectKey);

					if (i === 0 && (0 < rowStart || this._columnsHeader == null)) {
						rangeWidth += width;
					}


					var propertyName = this._columns[j].key;
					var isSortableColumn = this._sortable[propertyName];

					var isMarkableCell = this._markable[propertyName];

					var marked = false;
					if (isMarkedRow && markedRange.columnStart <= columnId && columnId < markedRange.columnEnd) {
						marked = true;
					}

					var modified = false;
					var value = this._cellToValue(rowId, columnId, data);

					if (this._modified[dataId] != null && this._modified[dataId][propertyName] != null) {
						modified = true;
						value = this._modified[dataId][propertyName];
					}

					var cellData = {
						dataId: dataId,
						rowId: rowId,
						columnId: columnId,

						propertyName: propertyName,
						editKey: this._cellToEditKey(rowId, columnId, data),
						selectKey: selectKey,
						heightKey: heightKey,
						widthKey: widthKey,

						selected: selected,
						marked: marked,
						height: height,
						width: width,

						isModified: modified,
						isHeaderRow: false,
						isSortableColumn: isSortableColumn,
						isMarkableCell: isMarkableCell,

						value: value,
						rowData: data
					};

					row.push(cellData);
				}
				cells.push(row);

				rowId += 1;
			}

			return {
				cells: cells,
				rangeHeight: rangeHeight,
				rangeWidth: rangeWidth
			};
		},


		_init: function() {
			var that = this;
			this._source.addEventListener('changeSource', function(ev) {
				that.dispatchEvent(ev);
			});
		},


		// --- Public Method --- //

		sliceAsync2D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var range = this._range2DTo1D(rowStart, rowEnd, columnStart, columnEnd);

			var that = this;

			return this._source.sliceAsync(range.start, range.end).then(function(dataArray) {
				var gridData = that._convert(dataArray, rowStart, rowEnd, columnStart, columnEnd);
				gridData.columnsWidth = that.getColumnsWidth();

				return gridData;
			});
		},

		isCached2D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var range = this._range2DTo1D(rowStart, rowEnd, columnStart, columnEnd);
			return this._source.isCached(range.start, range.end);
		},

		sliceCachedData2D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var range = this._range2DTo1D(rowStart, rowEnd, columnStart, columnEnd);

			var dataArray = this._source.sliceCachedData(range.start, range.end);
			var gridData = this._convert(dataArray, rowStart, rowEnd, columnStart, columnEnd);

			return gridData;
		},

		getCachedData2D: function(rowId, columnId) {
			var gridData = this.sliceCachedData2D(rowId, rowId + 1, columnId, columnId + 1);
			return gridData[0][0];
		},

		getCachedOriginData: function(rowId) {
			var range = this._range2DTo1D(rowId, rowId + 1, 0, -1);

			var dataArray = this._source.sliceCachedData(range.start, range.end);

			return dataArray[0];
		},

		isCachedAllWidth: function() {
			return true;
		},

		isCachedAllHeight: function() {
			// TODO: 実装
			return false;
		},

		getTotalRows: function() {
			var totalRows = this._source.getTotalLength();
			if (this._columnsHeader != null) {
				totalRows += 1;
			}
			return totalRows;
		},

		getTotalColumns: function() {
			return this._columns.length;
		},

		getDefaultRowHeight: function() {
			return this._defaultRowHeight;
		},

		getDefaultColumnWidth: function() {
			return this._defaultColumnWidth;
		},

		getColumnsWidth: function() {
			var result = [];

			var len = this._columns.length;
			for (var i = 0; i < len; i += 1) {
				var widthKey = this._columns[i].key;

				var columnWidth = this._defaultColumnWidth;
				if (this._widthMap.hasOwnProperty(widthKey)) {
					columnWidth = this._widthMap[widthKey];
				}

				result.push(columnWidth);
			}

			return result;
		},

		onChangeSource: function(listener) {
			this._source.onChangeSource(listener);
		},

		setHeight: function(heightKey, height) {
			if (height === this._defaultHeight) {
				delete this._heightMap[heightKey];
				return;
			}
			this._heightMap[heightKey] = height;

			// TODO: 列入れ替えもあるのでもっと良い名前を考える
			this.dispatchEvent({
				type: 'changeCellSize'
			});
		},

		setWidth: function(widthKey, width) {
			if (width === this._defaultWidth) {
				delete this._widthMap[widthKey];
				return;
			}
			this._widthMap[widthKey] = width;
			this.dispatchEvent({
				type: 'changeCellSize'
			});
		},

		selectData: function(selectKey) {
			this._selector.select(selectKey);
			this.dispatchEvent({
				type: 'changeData'
			});
		},

		selectMultiData: function(allData) {
			for (var i =0, len = allData.length; i < len; i++) {
				var data = allData[i];
				var selectKey = this._cellToSelectKey(null, null, data);
				this._selector.select(selectKey);
			}

			this.dispatchEvent({
				type: 'changeData'
			});
		},

		unselectData: function(selectKey) {
			this._selector.unselect(selectKey);
			this.dispatchEvent({
				type: 'changeData'
			});
		},

		unselectAllData: function() {
			this._selector.unselectAll();
			this.dispatchEvent({
				type: 'changeData'
			});
		},

		isSelected: function(selectKey) {
			return this._selector.isSelected(selectKey);
		},

		getSelectedDataIds: function() {
			return this._selector.getSelectedKeys();
		},

		getColumns: function() {
			return $.extend(true, [], this._columns);
		},

		setColumns: function(columns) {
			this._columns = columns;
			this.dispatchEvent({
				type: 'changeCellSize'
			});
		},

		editData: function(dataId, propertyName, value) {
			var objectModified = this._modified[dataId];
			if (objectModified == null) {
				objectModified = {};
				this._modified[dataId] = objectModified;
			}

			objectModified[propertyName] = value;

			this.dispatchEvent({
				type: 'changeData'
			});
		},

		getModified: function() {
			return $.extend(true, {}, this._modified);
		},

		clearModified: function() {
			this._modified = {};
			this.dispatchEvent({
				type: 'changeData'
			});
		},

		markRange: function(rowStart, rowEnd, columnStart, columnEnd) {
			var _rowStart = rowStart;
			var _rowEnd = rowEnd;
			var _columnStart = columnStart;
			var _columnEnd = columnEnd;

			if (this.getTotalRows() < _rowEnd) {
				_rowEnd = this.getTotalRows();
			}
			if (this.getTotalColumns() < _columnEnd) {
				_columnEnd = this.getTotalColumns();
			}
			if (_rowEnd < _rowStart) {
				_rowStart = _rowEnd;
			}
			if (_columnEnd < _columnStart) {
				_columnStart = _columnEnd;
			}

			this._markedRange = {
				rowStart: _rowStart,
				rowEnd: _rowEnd,
				columnStart: _columnStart,
				columnEnd: _columnEnd
			};

			this.dispatchEvent({
				type: 'changeData'
			});
		},

		getMarkedRange: function() {
			return $.extend({}, this._markedRange);
		}

	});


	var createGridDataConverter = function(params) {
		return new GridDataConverter(params);
	};


	h5.u.obj.expose('h5.ui.components.datagrid', {

		/**
		 * @memberOf h5.ui.components.datagrid
		 */
		createGridDataConverter: createGridDataConverter

	});

})(jQuery);


//---- GridHorizontalDataConverter ---- //
(function($) {
	'use strict';

	var EventDispatcher = h5.ui.components.virtualScroll.data.EventDispatcher;


	var GridHorizontalDataConverter = function(params) {
		this._source = params.dataSource;
		this._idKey = params.idKey;
		this._selector = params.selector;
		this._defaultRowHeight = params.defaultRowHeight;
		this._defaultColumnWidth = params.defaultColumnWidth;

		this._rows = [];

		this._heightMap = {};
		this._widthMap = {};
		this._sortable = {};
		this._modified = {};

		for (var i = 0, len = params.rows.length; i < len; i++) {
			this._rows.push({
				key: params.rows[i]
			});
		}

		var that = this;
		if (params.rowsOption != null) {
			this._rowsHeader = {};
			$.each(params.rowsOption, function(key, option) {
				if (option.height != null) {
					that._heightMap[key] = option.height;
				}
				if (option.header != null) {
					that._rowsHeader[key] = option.header;
				}
				that._sortable[key] = !!option.sortable;
				taht._markable[key] = !!option.markable;
			});
		}

		this._init();
	};


	$.extend(GridHorizontalDataConverter.prototype, new EventDispatcher(), {

		// --- Property --- //


		/**
		 * @memberOf h5.ui.components.datagrid.GridHorizontalDataConverter
		 */
		_source: null,

		_idKey: null,

		_rows: null,


		_selector: null,

		_heightMap: null,

		_widthMap: null,

		_sortable: null,

		_defaultRowHeight: null,

		_defaultColumnWidth: null,

		_rowsHeader: null,

		_modified: null,



		// --- Private Method --- //

		_dataToId: function(data) {
			if (data == null) {
				return null;
			}
			return data[this._idKey];
		},

		_cellToEditKey: function(rowId, columnId, data) {
			return this._rows[rowId].key;
		},

		_cellToSelectKey: function(rowId, columnId, data) {
			return this._dataToId(data);
		},

		_cellToHeightKey: function(rowId, data) {
			return this._rows[rowId].key;
		},

		_cellToWidthKey: function(columnId, data) {
			return this._dataToId(data);
		},

		_cellToValue: function(rowId, columnId, data) {
			if (data == null) {
				return null;
			}
			var key = this._rows[rowId].key;
			return data[key];
		},

		_range2DTo1D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var start = columnStart;
			var end = columnEnd;
			if (this._rowsHeader != null) {
				start -= 1;
				end -= 1;

				if (start < 0) {
					start = 0;
				}
			}
			return {
				start: start,
				end: end
			};
		},

		_createHeaderColumn: function(rowStart, rowEnd) {

			var searchOptions = this._source.getSearchOptions();
			var sorts = {};

			if (searchOptions.sort != null) {
				$.each(searchOptions.sort, function(i, elem) {
					sorts[elem.property] = elem.order;
				});
			}

			var column = [];
			for (var i = rowStart; i < rowEnd; i += 1) {
				var key = this._rows[i].key;
				var header = key;
				if (this._rowsHeader[key] != null) {
					header = this._rowsHeader[key];
				}

				var rowId = i;
				var width = this._defaultColumnWidth;

				var heightKey = this._cellToHeightKey(rowId, null);
				var height = this._defaultRowHeight;
				if (this._heightMap.hasOwnProperty(heightKey)) {
					height = this._heightMap[heightKey];
				}

				var isSortableColumn = this._sortable[key];
				var sortOrder = null;
				if (sorts.hasOwnProperty(key)) {
					sortOrder = sorts[key];
				}

				var cellData = {
					dataId: null,
					rowId: rowId,
					columnId: 0,

					propertyName: key,
					editKey: null,
					selectKey: null,
					heightKey: heightKey,
					widthKey: null,

					selected: false,
					height: height,
					width: width,

					isHeaderRow: true,
					isSortableColumn: isSortableColumn,
					sortOrder: sortOrder,

					columnData: null,
					value: header
				};

				column.push([cellData]);
			}
			return column;
		},

		_convert: function(dataArray, rowStart, rowEnd, columnStart, columnEnd) {
			var cells = [];

			var rangeHeight = 0;
			var rangeWidth = 0;

			var i = 0;
			var columnId = columnStart;
			var len = dataArray.length;

			if (this._rowsHeader != null) {
				if (columnStart === 0 && 0 < columnEnd) {
					var headerColumn = this._createHeaderColumn(rowStart, rowEnd);
					$.each(headerColumn, function(index, headerRow) {
						var headerCell = headerRow[0];
						if (index === 0) {
							rangeWidth += headerCell.width;
						}
						rangeHeight += headerCell.height;
					});
					for (i = rowStart; i < rowEnd; i += 1) {
						cells.push(headerColumn[i - rowStart]);
					}
				} else {
					for (i = rowStart; i < rowEnd; i += 1) {
						cells.push([]);
					}
				}
			}

			for (i = 0; i < len; i += 1) {
				var data = dataArray[i];
				var dataId = this._dataToId(data);

				var widthKey = this._cellToWidthKey(columnId, data);
				var width = this._defaultColumnWidth;
				if (this._widthMap.hasOwnProperty(widthKey)) {
					width = this._widthMap[widthKey];
				}

				rangeWidth += width;

				for (var j = rowStart; j < rowEnd; j += 1) {
					var rowId = j;

					var heightKey = this._cellToHeightKey(rowId, data);
					var height = this._defaultColumnHeight;
					if (this._heightMap.hasOwnProperty(heightKey)) {
						height = this._heightMap[heightKey];
					}

					var selectKey = this._cellToSelectKey(rowId, columnId, data);
					var selected = this._selector.isSelected(selectKey);

					if (i === 0 && (0 < columnStart || this._rowsHeader == null)) {
						rangeHeight += height;
					}


					var propertyName = this._rows[j].key;
					var isSortableColumn = this._sortable[propertyName];

					var modified = false;
					var value = this._cellToValue(rowId, columnId, data);

					if (this._modified[dataId] != null && this._modified[dataId][propertyName] != null) {
						modified = true;
						value = this._modified[dataId][propertyName];
					}

					var cellData = {
						dataId: dataId,
						rowId: rowId,
						columnId: columnId,

						propertyName: propertyName,
						editKey: this._cellToEditKey(rowId, columnId, data),
						selectKey: selectKey,
						heightKey: heightKey,
						widthKey: widthKey,

						selected: selected,
						height: height,
						width: width,

						isModified: modified,
						isHeaderRow: false,
						isSortableColumn: isSortableColumn,

						value: value,
						rowData: data
					};

					cells[j - rowStart].push(cellData);
				}

				columnId += 1;
			}

			return {
				cells: cells,
				rangeHeight: rangeHeight,
				rangeWidth: rangeWidth
			};
		},


		_init: function() {
			var that = this;
			this._source.addEventListener('changeSource', function(ev) {
				that.dispatchEvent(ev);
			});
		},


		// --- Public Method --- //

		sliceAsync2D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var range = this._range2DTo1D(rowStart, rowEnd, columnStart, columnEnd);

			var that = this;

			return this._source.sliceAsync(range.start, range.end).then(function(dataArray) {
				var gridData = that._convert(dataArray, rowStart, rowEnd, columnStart, columnEnd);
				gridData.rowsHeight = that.getRowsHeight();

				return gridData;
			});
		},

		isCached2D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var range = this._range2DTo1D(rowStart, rowEnd, columnStart, columnEnd);
			return this._source.isCached(range.start, range.end);
		},

		sliceCachedData2D: function(rowStart, rowEnd, columnStart, columnEnd) {
			var range = this._range2DTo1D(rowStart, rowEnd, columnStart, columnEnd);

			var dataArray = this._source.sliceCachedData(range.start, range.end);
			var gridData = this._convert(dataArray, rowStart, rowEnd, columnStart, columnEnd);

			return gridData;
		},

		getCachedData2D: function(rowId, columnId) {
			var gridData = this.sliceCachedData2D(rowId, rowId + 1, columnId, columnId + 1);
			return gridData[0][0];
		},

		getCachedOriginData: function(rowId) {
			var range = this._range2DTo1D(rowId, rowId + 1, 0, -1);

			var dataArray = this._source.sliceCachedData(range.start, range.end);

			return dataArray[0];
		},

		isCachedAllWidth: function() {
			return false;
		},

		isCachedAllHeight: function() {
			return true;
		},

		getTotalRows: function() {
			return this._rows.length;
		},

		getTotalColumns: function() {
			var totalColumns = this._source.getTotalLength();
			if (this._rowsHeader != null) {
				totalColumns += 1;
			}
			return totalColumns;
		},

		getDefaultRowHeight: function() {
			return this._defaultRowHeight;
		},

		getDefaultColumnWidth: function() {
			return this._defaultColumnWidth;
		},

		getRowsHeight: function() {
			var result = [];

			var len = this._rows.length;
			for (var i = 0; i < len; i += 1) {
				var heightKey = this._rows[i].key;

				var rowHeight = this._defaultRowHeight;
				if (this._heightMap.hasOwnProperty(heightKey)) {
					rowHeight = this._heightMap[heightKey];
				}

				result.push(rowHeight);
			}

			return result;
		},

		onChangeSource: function(listener) {
			this._source.onChangeSource(listener);
		},

		setHeight: function(heightKey, height) {
			if (height === this._defaultHeight) {
				delete this._heightMap[heightKey];
				return;
			}
			this._heightMap[heightKey] = height;

			// TODO: 列入れ替えもあるのでもっと良い名前を考える
			this.dispatchEvent({
				type: 'changeCellSize'
			});
		},

		setWidth: function(widthKey, width) {
			if (width === this._defaultWidth) {
				delete this._widthMap[widthKey];
				return;
			}
			this._widthMap[widthKey] = width;
			this.dispatchEvent({
				type: 'changeCellSize'
			});
		},

		selectData: function(selectKey) {
			this._selector.select(selectKey);
			this.dispatchEvent({
				type: 'changeData'
			});
		},

		unselectData: function(selectKey) {
			this._selector.unselect(selectKey);
			this.dispatchEvent({
				type: 'changeData'
			});
		},

		unselectAllData: function() {
			this._selector.unselectAll();
			this.dispatchEvent({
				type: 'changeData'
			});
		},

		isSelected: function(selectKey) {
			return this._selector.isSelected(selectKey);
		},

		getSelectedDataIds: function() {
			return this._selector.getSelectedKeys();
		},

		getRows: function() {
			return $.extend(true, [], this._rows);
		},

		setRows: function(rows) {
			this._rows = rows;
			this.dispatchEvent({
				type: 'changeCellSize'
			});
		},

		editData: function(dataId, propertyName, value) {
			var objectModified = this._modified[dataId];
			if (objectModified == null) {
				objectModified = {};
				this._modified[dataId] = objectModified;
			}

			objectModified[propertyName] = value;

			this.dispatchEvent({
				type: 'changeData'
			});
		},

		getModified: function() {
			return $.extend(true, {}, this._modified);
		},

		clearModified: function() {
			this._modified = {};
			this.dispatchEvent({
				type: 'changeData'
			});
		}

	});


	var createGridHorizontalDataConverter = function(params) {
		return new GridHorizontalDataConverter(params);
	};


	h5.u.obj.expose('h5.ui.components.datagrid', {

		/**
		 * @memberOf h5.ui.components.datagrid
		 */
		createGridHorizontalDataConverter: createGridHorizontalDataConverter

	});

})(jQuery);


// ---- GridLayout ---- //

(function($) {
	'use strict';

	var VERTICAL_SCROLL_BAR_CLASS = 'grid-vertical-scroll-bar';
	var HORIZONTAL_SCROLL_BAR_CLASS = 'grid-horizontal-scroll-bar';

	var HEADER_TOP_LEFT_CELLS_CLASS = 'grid-header-top-left-cells';
	var HEADER_ROWS_CLASS = 'grid-header-rows';
	var HEADER_COLUMNS_CLASS = 'grid-header-columns';
	var MAIN_BOX_CLASS = 'grid-main-box';
	var COPY_TARGET_CLASS = 'grid-copy-target';

	var RENDER_WAIT_TIME = 100;
	var KEYDOWN_WAIT_TIME = 100;

	var createRenderer = function(defaultFormatter, formatters) {

		return function($target, gridData) {
			if (gridData == null) {
				return;
			}
			var tableWidth = gridData.rangeWidth + 1;

			var html = '<table style="table-layout: fixed; border-collapse: collapse; ';
			html += 'width: ' + tableWidth + 'px;';
			html += '">';

			var rowSize = gridData.cells.length;
			var columnSize = 0;
			if (0 < gridData.cells.length) {
				columnSize = gridData.cells[0].length;
			}

			for (var i = 0; i < rowSize; i += 1) {
				var row = gridData.cells[i];
				if (row == null || row[0] == null) {
					continue;
				}

				var height = row[0].height;

				html += '<tr style="height:' + height + 'px;">';

				for (var j = 0; j < columnSize; j += 1) {
					var cell = row[j];
					var width = cell.width;

					var divHeight = height - 1;
					var divWidth = width - 1;

					html += '<td class="';

					if (cell.selected) {
						html += 'grid-selected ';
					}
					if (cell.marked) {
						html += 'grid-marked ';
					}
					if (cell.isHeaderRow) {
						html += 'grid-header ';
					}

					html += '" ';

					html += 'data-h5-dyn-grid-row-id="' + cell.rowId + '" ';
					html += 'data-h5-dyn-grid-column-id="' + cell.columnId + '" ';
					html += 'data-h5-dyn-grid-data-id="' + cell.dataId + '" ';
					html += 'data-h5-dyn-grid-property-name="' + cell.propertyName + '" ';
					html += 'data-h5-dyn-grid-edit-key="' + cell.editKey + '" ';
					html += 'data-h5-dyn-grid-select-key="' + cell.selectKey + '" ';
					html += 'data-h5-dyn-grid-height-key="' + cell.heightKey + '" ';
					html += 'data-h5-dyn-grid-width-key="' + cell.widthKey + '" ';
					html += 'data-h5-dyn-grid-is-header-row="' + cell.isHeaderRow + '" ';
					html += 'data-h5-dyn-grid-is-sortable-column="' + cell.isSortableColumn + '" ';
					html += 'data-h5-dyn-grid-is-markable-cell="' + cell.isMarkableCell + '" ';
					html += 'data-h5-dyn-grid-is-modified-cell="' + cell.isModified + '" ';
					html += 'data-h5-dyn-grid-sort-order="' + cell.sortOrder + '" ';

					// TODO: cellData から td の属性 data-h5-dyn-grid-custom-xxx を追加する仕組み

					html += 'style="padding: 0;';
					html += ' width:' + divWidth + 'px;';
					html += ' border-width: 1px;';

					html += '">';
					html += '<div class="grid-cell-frame" style="overflow: hidden;';
					html += ' height:' + divHeight + 'px;';
					html += ' width:' + divWidth + 'px;';


					html += '">';

					var formatter = formatters[cell.propertyName];
					if (formatter == null) {
						formatter = defaultFormatter;
					}
					var cellHtml = formatter(cell);

					html += cellHtml;
					html += '</div>';
					html += '</td>';
				}

				html += '</tr>';
			}

			html += '</table>';

			$target[0].innerHTML = html;
		};
	};


	var gridLayoutController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.datagrid.GridLayoutController
		 */
		__name: 'h5.ui.components.datagrid.GridLayoutController',


		// --- Property --- //

		_converter: null,

		_headerRows: 0,

		_headerColumns: 0,

		_headerTopLeftCellsHtml: null,

		_verticalScrollStrategy: null,

		_horizontalScrollStrategy: null,

		_knownRowsHeight: null,

		_knownColumnsWidth: null,

		_rowSelector: null,

		_columnSelector: null,


		_mainHeight: 0,

		_mainWidth: 0,


		_initializeDeferred: null,

		_setRendererDeferred: null,


		_renderPromise: null,

		_renderWaitTimerId: null,

		_ignoreKeydown: false,


		// --- Private Method --- //

		_getCopyText: function() {
			var range = this._converter.getMarkedRange();
			var copyData = this._converter.sliceCachedData2D(range.rowStart, range.rowEnd, range.columnStart, range.columnEnd);

			var copyText = $.map(copyData.cells, function(row) {
				return $.map(row, function(cell) {
					if (cell.value == null) {
						return '';
					}
					return String(cell.value);
				}).join('\t');
			}).join('\n');
			return copyText;
		},

		_preventDefaultKeydownEvent: function(event) {
			var keycode = event.which;
			if (37 <= keycode && keycode <= 40) {
				event.preventDefault();
			}
		},

		_triggerKeydownEvent: function(event) {
			var keycode = event.which;
			var isCtrl = false;
			if (event.ctrlKey) {
				isCtrl = true;
			}

			if (isCtrl && keycode === 67) {
				var $textArea = this.$find('.' + COPY_TARGET_CLASS).find('textarea');
				$textArea.val(this._getCopyText());
				$textArea.select();
				setTimeout(function() {
					$textArea.select();
				}, 0);
				return;
			}

			if (keycode === 37) { // arrow-left

				this.trigger('h5scroll', {
					horizontalScroll: {
						type: 'index',
						diff: -1
					}
				});

				return;
			}

			if (keycode === 38) { // arrow-up

				this.trigger('h5scroll', {
					verticalScroll: {
						type: 'index',
						diff: -1
					}
				});

				return;
			}

			if (keycode === 39) { // arrow-right

				this.trigger('h5scroll', {
					horizontalScroll: {
						type: 'index',
						diff: 1
					}
				});

				return;
			}

			if (keycode === 40) { // arrow-down

				this.trigger('h5scroll', {
					verticalScroll: {
						type: 'index',
						diff: 1
					}
				});

				return;
			}
		},

		_createBoxController: function(className, headerProperty) {
			var $root = $(this.rootElement);
			var $target = $root.children('.' + className);

			var controller;

			if ($target.length === 0 && typeof headerProperty !== 'string') {
				$target = $('<div></div>').addClass(className).appendTo($root);
				controller = h5.core.controller($target, h5.ui.components.virtualScroll.VirtualScrollBoxController);

				var that = this;
				this._setRendererDeferred.then(function() {
					controller.init(that._renderer);
				});

			} else {
				if ($target.length === 0) {
					$target = $('<div></div>');
					$target.addClass(className).html(headerProperty).appendTo($root);
				}
				controller = h5.core.controller($target, h5.ui.components.virtualScroll.HtmlScrollBoxController);

				controller.init(this._rowSelector, this._columnSelector);
			}

			return controller;
		},

		_refreshBoxPosition: function() {
			this._verticalBarController.initPromise.then(this.own(function() {
				var $root = $(this.rootElement);
				var $headerCells = $root.children('.' + HEADER_TOP_LEFT_CELLS_CLASS);
				var $headerRows = $root.children('.' + HEADER_ROWS_CLASS);
				var $headerColumns = $root.children('.' + HEADER_COLUMNS_CLASS);
				var $mainBox = $root.children('.' + MAIN_BOX_CLASS);
				var $verticalBar = $root.children('.' + VERTICAL_SCROLL_BAR_CLASS);
				var $horizontalBar = $root.children('.' + HORIZONTAL_SCROLL_BAR_CLASS);

				var scrollBarWidth = $verticalBar.width();

				var rootHeight = $root.height();
				var rootWidth = $root.width();

				var renderHeight = 0;
				var renderWidth = 0;

				if (this._converter.getColumnsWidth != null) {
					var columnsWidth = this._converter.getColumnsWidth();
					$.each(columnsWidth, function(i, width) {
						renderWidth += width;
					});

					renderHeight = this._converter.getTotalRows() * this._converter.getDefaultRowHeight();

					if (typeof this._headerColumns === 'number') {
						this._headerWidth = 1;

						for (var i = 0; i < this._headerColumns; i++) {
							this._headerWidth += columnsWidth[i];
						}
					}
				} else {
					var rowsHeight = this._converter.getRowsHeight();
					$.each(rowsHeight, function(i, height) {
						renderHeight += height;
					});

					renderWidth = this._converter.getTotalColumns() * this._converter.getDefaultColumnWidth();

					if (typeof this._headerRows === 'number') {
						this._headerHeight = 1;

						for (var i = 0; i < this._headerRows; i++) {
							this._headerHeight += rowsHeight[i];
						}
					}
				}

				// TODO: headerHeight の更新


				var headerHeight = this._headerHeight;
				var headerWidth = this._headerWidth;

				var mainHeight = rootHeight - headerHeight + 1;
				var mainWidth = rootWidth - headerWidth + 1;

				if (rootHeight <= renderHeight) {
					mainWidth -= scrollBarWidth;

					if (rootWidth - scrollBarWidth <= renderWidth) {
						mainHeight -= scrollBarWidth;
					}
				} else {
					if (rootWidth <= renderWidth) {
						mainHeight -= scrollBarWidth;
					}
				}

				this._mainHeight = mainHeight;
				this._mainWidth = mainWidth;

				var mainLeft = (0 < headerWidth) ? headerWidth - 1 : 0;
				var mainTop = (0 < headerHeight) ? headerHeight - 1 : 0;

				// TODO: バーが表現できない場合に列が消えたりする
				if (mainHeight < 0) {
					this.log.warn('ヘッダ行が描画領域に入りきりません');
				}
				if (mainWidth < 0) {
					this.log.warn('ヘッダ列が描画領域に入りきりません');
				}

				$headerCells.css({
					height: headerHeight,
					width: headerWidth,
					'z-index': 3
				});

				$headerRows.css({
					left: mainLeft,
					height: headerHeight,
					width: mainWidth,
					'z-index': 2
				});

				$headerColumns.css({
					top: mainTop,
					height: mainHeight,
					width: headerWidth,
					'z-index': 2
				});

				$mainBox.css({
					top: mainTop,
					left: mainLeft,
					height: mainHeight,
					width: mainWidth
				});

				$verticalBar.css({
					top: mainTop,
					height: mainHeight
				});

				$horizontalBar.css({
					left: mainLeft,
					width: mainWidth
				});
			}));
		},

		_setKnownHeightAndWidth: function(gridData) {
			if (gridData == null) {
				return;
			}

			if (this._knownColumnsWidth == null && this._knownRowsHeight == null) {
				return;
			}

			var that = this;

			if (this._knownColumnsWidth) {
				gridData.columnsWidth = this._knownColumnsWidth;
			}

			$.each(gridData.cells, function(i, row) {
				$.each(row, function(j, cell) {
					if (that._knownColumnsWidth != null) {
						cell.width = that._knownColumnsWidth[cell.columnId];
					}
					if (that._knownRowsHeight != null) {
						cell.height = that._knownRowsHeight[cell.rowId];
					}
				});
			});
		},

		_endRender: function(rowStart, rowEnd, columnStart, columnEnd) {
			this._mainBoxController.endLoad();
			this._headerColumnsController.endLoad();
			this.trigger('renderGrid', {
				rowStart: rowStart,
				rowEnd: rowEnd,
				columnStart: columnStart,
				columnEnd: columnEnd
			});
			$(this.rootElement).focus();
		},

		_renderHeader: function(rowStart, rowEnd, columnStart, columnEnd) {

			// ヘッダ行のレンダリング
			var headerRowsData = null;
			if (typeof this._headerRows === 'number' && 0 < this._headerRows) {
				headerRowsData = this._converter.sliceCachedData2D(0, this._headerRows,
						columnStart, columnEnd);
			}

			this._setKnownHeightAndWidth(headerRowsData);

			var headerRowsRange = {
				columnStart: columnStart,
				columnEnd: columnEnd
			};

			if (typeof this._headerRows === 'number') {
				headerRowsRange.rowStart = 0;
				headerRowsRange.rowEnd = this._headerRows;
			}

			this._headerRowsController.render(headerRowsData, headerRowsRange);


			// ヘッダ列のレンダリング
			var headerColumnsData = null;
			if (typeof this._headerColumns === 'number' && 0 < this._headerColumns) {
				headerColumnsData = this._converter.sliceCachedData2D(rowStart, rowEnd, 0,
						this._headerColumns);
			}

			this._setKnownHeightAndWidth(headerColumnsData);

			var headerColumnsRange = {
				rowStart: rowStart,
				rowEnd: rowEnd
			};

			if (typeof this._headerColumns === 'number') {
				headerColumnsRange.columnStart = 0;
				headerColumnsRange.columnEnd = this._headerColumns;
			}

			this._headerColumnsController.render(headerColumnsData, headerColumnsRange);


			// 左上ヘッダのレンダリング
			var headerRows = this._headerRows;
			var headerColumns = this._headerColumns;
			if (this._headerTopLeftCellsHtml == null && 0 < headerColumns && 0 < headerRows) {

				var headerCellsData = this._converter.sliceCachedData2D(0, headerRows, 0,
						headerColumns);


				this._setKnownHeightAndWidth(headerCellsData);

				var headerCellsRange = {
					rowStart: 0,
					rowEnd: headerRows,
					columnStart: 0,
					columnEnd: headerColumns
				};

				this._headerTopLeftCellsController.render(headerCellsData, headerCellsRange);
			}
		},

		_render: function() {
			var that = this;

			var msg;
			if (this._knownRowsHeight != null) {
				var knownHeaderRows = this._knownRowsHeight.length;
				var dataRows = this._converter.getTotalRows();
				if (knownHeaderRows !== dataRows) {
					msg = 'ヘッダの行数（{0}行）とデータの行数（{1}行）が一致しません';
					this.throwError(msg, knownHeaderRows, dataRows);
				}
			}
			if (this._knownColumnsWidth != null) {
				var knownHeaderColumns = this._knownColumnsWidth.length;
				var dataColumns = this._converter.getTotalColumns();
				if (knownHeaderColumns !== dataColumns) {
					msg = 'ヘッダの列数（{0}列）とデータの列数（{1}列）が一致しません';
					this.throwError(msg, knownHeaderColumns, dataColumns);
				}
			}


			var rowStart = this._rowStart;
			var rowEnd = this._rowEnd;
			var columnStart = this._columnStart;
			var columnEnd = this._columnEnd;

			if (typeof this._headerRows === 'number') {
				rowStart += this._headerRows;
				rowEnd += this._headerRows;
			}
			if (typeof this._headerColumns === 'number') {
				columnStart += this._headerColumns;
				columnEnd += this._headerColumns;
			}

			var isCached = this._converter.isCached2D(rowStart, rowEnd, columnStart, columnEnd);

			// cache されている場合はそのまま表示する
			if (isCached && this._renderWaitTimerId == null) {
				var cachedData = this._converter.sliceCachedData2D(rowStart, rowEnd, columnStart,
						columnEnd);

				that._renderPromise = that._renderPromise.then(function() {
					that._setKnownHeightAndWidth(cachedData);
					that._mainBoxController.render(cachedData, {
						rowStart: rowStart,
						rowEnd: rowEnd,
						columnStart: columnStart,
						columnEnd: columnEnd
					});

					that._renderHeader(rowStart, rowEnd, columnStart, columnEnd);
					that._endRender(rowStart, rowEnd, columnStart, columnEnd);
				});
				return;
			}

			if (this._renderWaitTimerId != null) {
				clearTimeout(this._renderWaitTimerId);
			}

			this._mainBoxController.beginLoad();
			this._headerColumnsController.beginLoad();
			this.trigger('loadDataBegin');

			this._renderWaitTimerId = setTimeout(function() {

				// データの読み込み
				var loadPromise = that._converter.sliceAsync2D(rowStart, rowEnd, columnStart,
						columnEnd);

				// 前のレンダリングとデータ読み込みの双方を待つ
				// TODO: reject 時の復帰をうまくやる
				that._renderPromise = h5.async.when(loadPromise, that._renderPromise);

				// データのレンダリング
				that._renderPromise = that._renderPromise.then(function(gridData) {
					that._setKnownHeightAndWidth(gridData);

					that._mainBoxController.render(gridData, {
						rowStart: rowStart,
						rowEnd: rowEnd,
						columnStart: columnStart,
						columnEnd: columnEnd
					});
				});

				// ヘッダのレンダリング & 後処理
				that._renderPromise = that._renderPromise.then(function() {
					that._renderHeader(rowStart, rowEnd, columnStart, columnEnd);
					that.trigger('loadDataEnd');
					that._endRender(rowStart, rowEnd, columnStart, columnEnd);
				});

				that._renderWaitTimerId = null;
			}, RENDER_WAIT_TIME);
		},

		_scroll: function(verticalDiff, horizontalDiff) {
			var $mainBox = $(this._mainBoxController.rootElement);
			var windowHeight = $mainBox.height();
			var windowWidth = $mainBox.width();

			var defaultRowHeight = this._converter.getDefaultRowHeight();
			var defaultColumnWidth = this._converter.getDefaultColumnWidth();

			var rowsHeight;

			var totalRows = this._converter.getTotalRows();
			if (typeof this._headerRows === 'number') {
				totalRows -= this._headerRows;
			}

			var totalColumns = this._converter.getTotalColumns();
			if (typeof this._headerColumns === 'number') {
				totalColumns -= this._headerColumns;
			}


			var i;

			if (this._knownRowsHeight != null) {
				rowsHeight = this._knownRowsHeight;
			} else {
				if (this._converter.getRowsHeight != null) {
					rowsHeight = this._converter.getRowsHeight();
				} else {
					rowsHeight = [];
					for (i = 0; i < totalRows; i++) {
						rowsHeight.push(defaultRowHeight);
					}
				}
			}

			var vScrollInfo = this._verticalScrollStrategy.scroll(verticalDiff, windowHeight, {
				totalCells: totalRows,
				defaultCellSize: defaultRowHeight,
				cellSizeArray: rowsHeight
			});

			var columnsWidth;
			if (this._knownColumnsWidth != null) {
				columnsWidth = this._knownColumnsWidth;
			} else {
				if (this._converter.getColumnsWidth != null) {
					columnsWidth = this._converter.getColumnsWidth();
				} else {
					columnsWidth = [];
					for (i = 0; i < totalColumns; i++) {
						columnsWidth.push(defaultColumnWidth);
					}
				}
			}
			if (typeof this._headerColumns === 'number') {
				columnsWidth = columnsWidth.slice(this._headerColumns);
			}

			var hScrollInfo = this._horizontalScrollStrategy.scroll(horizontalDiff, windowWidth, {
				totalCells: totalColumns,
				defaultCellSize: defaultColumnWidth,
				cellSizeArray: columnsWidth
			});

			this._verticalBarController.setScrollPosition(vScrollInfo.scrollPosition);
			this._verticalBarController.setScrollSize(vScrollInfo.scrollSize);

			this._horizontalBarController.setScrollPosition(hScrollInfo.scrollPosition);
			this._horizontalBarController.setScrollSize(hScrollInfo.scrollSize);

			var vIndex = vScrollInfo.index;
			var hIndex = hScrollInfo.index;

			var vLen = vScrollInfo.length;
			var hLen = hScrollInfo.length;

			if (vLen == null) {
				vLen = Math.ceil(windowHeight / defaultRowHeight) + 1;
			}

			if (totalRows < vLen) {
				this._rowStart = 0;
				this._rowEnd = totalRows;
				this._mainBoxController.setVerticalPosition(0);
				this._headerColumnsController.setVerticalPosition(0);
			} else if (vScrollInfo.isEnd) {
				this._rowStart = vIndex - vLen;
				this._rowEnd = vIndex;
				this._mainBoxController.setVerticalPositionBottom();
				this._headerColumnsController.setVerticalPositionBottom();
			} else {
				this._rowStart = vIndex;
				this._rowEnd = vIndex + vLen;
				this._mainBoxController.setVerticalPosition(vScrollInfo.offset);
				this._headerColumnsController.setVerticalPosition(vScrollInfo.offset);
			}
			if (totalRows < this._rowEnd) {
				this._rowEnd = totalRows;
			}

			if (totalColumns < hLen) {
				this._columnStart = 0;
				this._columnEnd = totalColumns;
				this._mainBoxController.setHorizontalPosition(0);
				this._headerRowsController.setHorizontalPosition(0);
			}
			if (hScrollInfo.isEnd) {
				this._columnStart = hIndex - hLen;
				this._columnEnd = hIndex;
				this._mainBoxController.setHorizontalPositionRight();
				this._headerRowsController.setHorizontalPositionRight();
			} else {
				this._columnStart = hIndex;
				this._columnEnd = hIndex + hLen;
				this._mainBoxController.setHorizontalPosition(hScrollInfo.offset);
				this._headerRowsController.setHorizontalPosition(hScrollInfo.offset);
			}

			// TODO: length が返ってきており同じ範囲だったら renderer 呼ばない
			this._render();

			// TODO: slice
		},

		_initializeChildControllers: function() {
			var $root = $(this.rootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			if ($root.attr('tabindex') == null) {
				$root.attr('tabindex', -1);
			}
			$root.css({
				position: rootPosition,
				overflow: 'hidden',
				outline: 'none'
			});


			this._headerTopLeftCellsController = this._createBoxController(
					HEADER_TOP_LEFT_CELLS_CLASS, this._headerTopLeftCellsHtml);
			var $headerCells = $(this._headerTopLeftCellsController.rootElement);
			$headerCells.css({
				position: 'absolute',
				top: 0,
				left: 0
			});


			this._headerRowsController = this._createBoxController(HEADER_ROWS_CLASS,
					this._headerRows);
			var $headerRows = $(this._headerRowsController.rootElement);
			$headerRows.css({
				position: 'absolute',
				top: 0
			});


			this._headerColumnsController = this._createBoxController(HEADER_COLUMNS_CLASS,
					this._headerColumns);
			var $headerColumns = $(this._headerColumnsController.rootElement);
			$headerColumns.css({
				position: 'absolute',
				left: 0
			});

			this._initializeDeferred.then(this.own(function() {
				var headerColumnsLoadingDiv = this._headerColumnsController.getLoadingDiv();
				if (headerColumnsLoadingDiv != null) {
					$(headerColumnsLoadingDiv).text('');
				}
			}));


			this._mainBoxController = this._createBoxController(MAIN_BOX_CLASS);
			var $mainBox = $(this._mainBoxController.rootElement);
			$mainBox.css({
				position: 'absolute'
			});


			var $verticalBar = $('<div></div>').addClass(VERTICAL_SCROLL_BAR_CLASS).css({
				position: 'absolute',
				right: 0
			}).appendTo(this.rootElement);
			this._verticalBarController = h5.core.controller($verticalBar,
					h5.ui.components.virtualScroll.VerticalScrollBarController);

			var $horizontalBar = $('<div></div>').addClass(HORIZONTAL_SCROLL_BAR_CLASS).css({
				position: 'absolute',
				bottom: 0
			}).appendTo(this.rootElement);
			this._horizontalBarController = h5.core.controller($horizontalBar,
					h5.ui.components.virtualScroll.HorizontalScrollBarController);

			var offset = $root.offset();
			var $copyTarget = $('<div></div>').addClass(COPY_TARGET_CLASS).css({
				position: 'fixed',
				top: -offset.top - 1000,
				left: -offset.left - 1000
			}).appendTo($root);

			var $copyTextArea = $('<textarea></textarea>').css({
				width: '1px',
				height: '1px',
				overflow: 'hidden',
				opacity: 0
			}).appendTo($copyTarget);


			this._refreshBoxPosition();
		},


		// --- Life Cycle Method --- //

		__construct: function() {
			this._initializeDeferred = h5.async.deferred();
			this._setRendererDeferred = h5.async.deferred();

			var deferred = h5.async.deferred();
			deferred.resolve();
			this._renderPromise = deferred.promise();
		},


		// --- Event Handler --- //

		'{rootElement} h5scroll': function(context) {
			context.event.stopPropagation();

			var vInfo = context.evArg.verticalScroll;
			var hInfo = context.evArg.horizontalScroll;

			var msg;

			var $mainBox = $(this._mainBoxController.rootElement);

			var vDiff = 0;
			if (vInfo) {
				if (vInfo.type === 'pixel') {
					vDiff = vInfo.diff;
				} else if (vInfo.type === 'index') {
					var height = $mainBox.height();
					vDiff = this._verticalScrollStrategy.indexDiffToScrollDiff(vInfo.diff, height);
				} else {
					msg = '不正な type を持つ h5scroll イベントです; verticalScroll.type = {0}';
					this.throwError(msg, vInfo.type);
				}
			}

			var hDiff = 0;
			if (hInfo) {
				if (hInfo.type === 'pixel') {
					hDiff = hInfo.diff;
				} else if (hInfo.type === 'index') {
					var width = $mainBox.width();
					hDiff = this._horizontalScrollStrategy.indexDiffToScrollDiff(hInfo.diff, width);
				} else {
					msg = '不正な type を持つ h5scroll イベントです; horizontalScroll.type = {0}';
					this.throwError(msg, hInfo.type);
				}
			}
			this._scroll(vDiff, hDiff);
		},

		'{rootElement} mousewheel': function(context) {
			context.event.preventDefault();

			var diff = (context.event.wheelDelta < 0) ? 1 : -1;

			this.trigger('h5scroll', {
				verticalScroll: {
					type: 'index',
					diff: diff
				}
			});
		},

		'{rootElement} keydown': function(context) {
			var event = context.event;

			this._preventDefaultKeydownEvent(event);

			if (this._ignoreKeydown) {
				return;
			}

			this._triggerKeydownEvent(event);

			var that = this;

			this._ignoreKeydown = true;
			setTimeout(function() {
				that._ignoreKeydown = false;

			}, KEYDOWN_WAIT_TIME);
		},

		'td[data-h5-dyn-grid-is-markable-cell="true"] h5trackstart': function(context, $el) {
			var rowId = $el.data('h5DynGridRowId');
			var columnId = $el.data('h5DynGridColumnId');

			this._converter.markRange(rowId, rowId + 1, columnId, columnId + 1);
		},

		'td[data-h5-dyn-grid-is-markable-cell="true"] h5trackmove': function(context, $el) {
		},

		'td[data-h5-dyn-grid-is-markable-cell="true"] h5trackend': function(context, $el) {
		},


		// --- Public Method --- //

		init: function(params) {

			this._converter = params.converter;
			this._verticalScrollStrategy = params.verticalScrollStrategy;
			this._horizontalScrollStrategy = params.horizontalScrollStrategy;
			this._headerRows = params.headerRows;
			this._headerColumns = params.headerColumns;
			this._headerTopLeftCellsHtml = params.headerTopLeftCellsHtml;
			this._renderer = createRenderer(params.defaultFormatter, params.formatters);

			// TODO: ない場合もOKにしたい
			this._headerHeight = params.headerHeight;
			this._headerWidth = params.headerWidth;

			this._knownRowsHeight = params.allRowsHeight;
			this._rowSelector = params.rowSelector;
			this._columnSelector = params.columnSelector;

			var that = this;

			this._setRendererDeferred.resolve();


			this.initPromise.then(function() {

				that._initializeChildControllers();

				var childrenPromissList = [that._mainBoxController.getInitializePromise(),
						that._headerRowsController.getInitializePromise(),
						that._headerColumnsController.getInitializePromise(),
						that._headerTopLeftCellsController.getInitializePromise(),
						that._verticalBarController.readyPromise,
						that._horizontalBarController.readyPromise];

				h5.async.when(childrenPromissList).then(function() {

					// TODO: リファクタリング
					if (that._headerRowsController.getColumnsWidth) {
						that._knownColumnsWidth = that._headerRowsController.getColumnsWidth();
					}
					if (that._headerColumnsController.getRowsHeight) {
						that._knownRowsHeight = that._headerColumnsController.getRowsHeight();
					}

					that._verticalScrollStrategy.resetPageInfo();
					that._horizontalScrollStrategy.resetPageInfo();

					that._initializeDeferred.resolve();

					that._scroll(0, 0);
				});

				that._converter.addEventListener('changeSource', function() {
					that.trigger('changeSource');
					that._refreshBoxPosition();
					that.refresh();
				});

				that._converter.addEventListener('changeData', function() {
					that._scroll(0, 0);
				});

				that._converter.addEventListener('changeCellSize', function() {
					that._refreshBoxPosition();
					that.refresh();
				});
			});

			return this.getInitializePromise();
		},

		refresh: function() {
			this._verticalScrollStrategy.resetPageInfo();
			this._horizontalScrollStrategy.resetPageInfo();
			this._scroll(0, 0);
		},

		beginLoad: function() {
			this._mainBoxController.beginLoad();
			this._headerColumnsController.beginLoad();
		},

		getInitializePromise: function() {
			return this._initializeDeferred.promise();
		},

		resize: function() {
			this._refreshBoxPosition();
			this.refresh();
		}
	};

	h5.core.expose(gridLayoutController);

})(jQuery);


// ---- D&D によるリサイズ ---- //

(function($) {
	'use strict';

	var RESIZABLE_BAR_CLASS = 'resizable-bar';
	var RESIZE_MARKER_CLASS = 'resize-marker';
	var RESIZE_MARKER_COLOR = '#888';

	var resizeColumnWidthTableController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.datagrid.ResizeColumnWidthTableController
		 */
		__name: 'h5.ui.components.datagrid.ResizeColumnWidthTableController',


		// --- Property --- //

		_columnWidthKey: null,

		_minX: null,

		_startX: null,

		_posX: null,

		_minWidth: 20,

		_maxWidth: 500,


		// --- Private Method --- //

		_appendResizableBar: function() {

			var $headerRows = this.$find('.grid-header-top-left-cells, .grid-header-rows');
			$headerRows.find('td, th').each(function() {
				var $target = $(this).children('div');

				$target.wrapInner('<div></div>');
				var $wrap = $target.children('div');
				var width = parseInt($target[0].style.width.replace('px', ''), 10);
				$wrap.css({
					height: '100%',
					width: width - 4,
					float: 'left'
				});

				var $resizableBar = $('<div></div>');

				$resizableBar.addClass(RESIZABLE_BAR_CLASS).css({
					cursor: 'col-resize',
					float: 'right',
					height: '100%',
					width: 4
				});

				$wrap.after($resizableBar);
			});
		},


		// --- Life Cycle Method --- //

		__init: function() {
			var $root = $(this.rootElement);

			if ($root.css('position') === 'static') {
				$root.css({
					position: 'relative'
				});
			}

			var $resizeMarker = $('<div></div>');
			$resizeMarker.addClass(RESIZE_MARKER_CLASS).css({
				position: 'absolute',
				'background-color': RESIZE_MARKER_COLOR,
				top: 0,
				height: '100%',
				width: 2,
				'z-index': 10
			}).hide();

			$root.append($resizeMarker);
		},


		// --- Event Handler --- //

		'{rootElement} renderGrid': function() {
			this._appendResizableBar();
		},

		'.resizable-bar h5trackstart': function(context, $el) {
			context.event.stopPropagation();

			var $root = $(this.rootElement);
			var $resizeMarker = $(this.rootElement).children('.' + RESIZE_MARKER_CLASS);
			var $cell = $el.closest('td');

			this._columnWidthKey = $cell.attr('data-h5-dyn-grid-width-key');
			this._startX = $cell.offset().left;
			this._minX = this._startX + this._minWidth;
			this._maxX = this._startX + this._maxWidth;

			var posX = $cell.offset().left + $cell.outerWidth();
			if (posX < this._minX) {
				posX = this._minX;
			}
			if (this._maxX < posX) {
				posX = this._maxX;
			}

			this._posX = posX;
			var left = posX - $root.offset().left;

			$resizeMarker.css({
				left: left
			}).show();
		},

		'{rootElement} h5trackmove': function(context) {
			var $resizeMarker = $(this.rootElement).children('.' + RESIZE_MARKER_CLASS);

			var pageX = context.event.pageX;
			if (pageX < this._minX) {
				pageX = this._minX;
			}
			if (this._maxX < pageX) {
				pageX = this._maxX;
			}

			this._posX = pageX;

			var left = pageX - $(this.rootElement).offset().left;

			$resizeMarker.css({
				left: left
			});
		},

		'{rootElement} h5trackend': function(context) {
			var $resizeMarker = $(this.rootElement).children('.' + RESIZE_MARKER_CLASS);
			$resizeMarker.hide();

			var width = this._posX - this._startX;
			if (width < this._minWidth) {
				width = this._minWidth;
			}
			if (this._maxWidth < width) {
				width = this._maxWidth;
			}

			width = Math.floor(width);

			this.trigger('changeColumnWidth', {
				widthKey: this._columnWidthKey,
				width: width
			});

			this._columnWidthKey = null;
			this._minX = null;
			this._startX = null;
			this._posX = null;
		},


		// --- Public Method --- //

		setMinWidth: function(minWidth) {
			this._minWidth = minWidth;
		},

		setMaxWidth: function(maxWidth) {
			this._maxWidth = maxWidth;
		}
	};


	h5.core.expose(resizeColumnWidthTableController);

})(jQuery);


// ---- ソートを操作する UI ---- //
(function($) {
	'use strict';

	var SORT_ICONS_CLASS = 'grid-sort-icons';
	var SORT_ASC_ICON_CLASS = 'grid-sort-icon-asc';
	var SORT_DESC_ICON_CLASS = 'grid-sort-icon-desc';
	var SORT_ICON_SORTING_CLASS = 'grid-sort-icon-sorting';

	var DEFAULT_SORTABLE_ICON_COLOR = '#BBB';
	var DEFAULT_SORTING_ICON_COLOR = '#666';

	var sortTableController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.datagrid.SortTableController
		 */
		__name: 'h5.ui.components.datagrid.SortTableController',


		// --- Property --- //

		_sortableIconColor: DEFAULT_SORTABLE_ICON_COLOR,

		_sortingIconColor: DEFAULT_SORTING_ICON_COLOR,


		// --- Private Method --- //

		_appendSortIcon: function() {
			var that = this;

			var $headerRows = this.$find('.grid-header-top-left-cells, .grid-header-rows');
			$headerRows.find('td, th').each(function() {
				var $cell = $(this);

				var sortable = $cell.data('h5DynGridIsSortableColumn');

				if (!sortable) {
					return;
				}

				var sortOrder = $cell.data('h5DynGridSortOrder');
				var $target = $(this).find('div.grid-cell');

				var $sortIcons = $('<div></div>');
				$sortIcons.addClass(SORT_ICONS_CLASS).css({
					display: 'inline-block',
					'vertical-align': 'middle'
				});

				var $ascIcon = $('<div></div>');
				$ascIcon.addClass(SORT_ASC_ICON_CLASS).css({
					height: 0,
					width: 0,
					'border-style': 'solid',
					'border-top-style': 'hidden',
					'border-left-width': '6px',
					'border-left-color': 'transparent',
					'border-right-width': '6px',
					'border-right-color': 'transparent',
					'border-bottom-width': '6px',
					'border-bottom-color': that._sortableIconColor
				});

				var $descIcon = $('<div></div>');
				$descIcon.addClass(SORT_DESC_ICON_CLASS).css({
					height: 0,
					width: 0,
					'margin-left': '1px',
					'border-style': 'solid',
					'border-top-width': '5px',
					'border-top-color': that._sortableIconColor,
					'border-left-width': '5px',
					'border-left-color': 'transparent',
					'border-right-width': '6px',
					'border-right-color': 'transparent',
					'border-bottom-style': 'hidden'
				});

				if (sortOrder === 'asc') {
					$ascIcon.addClass(SORT_ICON_SORTING_CLASS).css({
						'border-bottom-color': that._sortingIconColor
					});
				} else if (sortOrder === 'desc') {
					$descIcon.addClass(SORT_ICON_SORTING_CLASS).css({
						'border-top-color': that._sortingIconColor
					});
				}

				$target.append($sortIcons);
				$sortIcons.append($ascIcon);
				$sortIcons.append($('<div style="height: 2px;"></div>'));
				$sortIcons.append($descIcon);
			});
		},

		// --- Life Cycle Method --- //

		// --- Event Handler --- //

		'{rootElement} renderGrid': function() {
			this._appendSortIcon();
		},

		// ソート
		'td[data-h5-dyn-grid-is-header-row="true"][data-h5-dyn-grid-is-sortable-column="true"] click': function(
				context, $el) {
			var key = $el.data('h5DynGridPropertyName');
			var currentOrder = $el.data('h5DynGridSortOrder');

			// TODO: イベントを投げる仕組みにする
			if (currentOrder == null) {
				this.parentController.sort(key, false);
			} else if (currentOrder === 'asc') {
				this.parentController.sort(key, true);
			} else {
				this.parentController.sort();
			}
		},


		// --- Public Method --- //

		setSortableIconColor: function(color) {
			this._sortableIconColor = color;
		},

		setSortingIconColor: function(color) {
			this._sortingIconColor = color;
		}
	};

	h5.core.expose(sortTableController);

})(jQuery);


// ---- 初期化に関する共通の値や関数 ---- //

(function($) {
	'use strict';

	var wrapScrollFormatter = function(formatterFunction) {
		return function(cellData) {
			var scrollBarWidth = h5.ui.components.virtualScroll.getScrollBarWidth();
			var scrollHeight = cellData.height + scrollBarWidth;
			var scrollWidth = cellData.width + scrollBarWidth;

			var html = '<div style="overflow: scroll;';
			html += ' width: ' + scrollWidth + 'px;';
			html += ' height: ' + scrollHeight + 'px;';
			html += '">';
			html += '<div class="grid-cell">';
			html += formatterFunction(cellData);
			html += '</div>';
			html += '</div>';

			return html;
		};
	};

	var DEFAULT_FORMATTER = function(cellData) {
		if (cellData.value == null) {
			return '';
		}
		return h5.u.str.escapeHtml(cellData.value);
	};

	var COMMON_DEFAULT_INIT_PARAMS = {
		defaultFormatter: DEFAULT_FORMATTER,
		verticalScrollStrategy: 'pixel',
		horizontalScrollStrategy: 'pixel',
		defaultColumnWidth: 100
	};

	var validateCommonInitParams = function(params) {
		var msgHeader = '初期パラメータが不正です: ';
		var msg;

		// -- 必須パラメータ -- //

		// idKey のチェック
		if (params.idKey == null) {
			this.throwError(msgHeader + 'idKey は必ず指定してください');
		}
		if (typeof params.idKey !== 'string') {
			msg = 'idKey は string 型である必要があります; idKey = {0}';
			this.throwError(msgHeader + msg, params.idKey);
		}

		// columns のチェック
//		if (params.columns == null) {
//			this.throwError(msgHeader + 'columns は必ず指定してください');
//		}
//		if (!$.isArray(params.columns)) {
//			msg = 'columns は Array 型である必要があります; columns = {0}';
//			this.throwError(msgHeader + msg, params.columns);
//		}
//
//
//		var columnPropertyNames = {};
//
//		for (var i = 0, len = params.columns.length; i < len; i++) {
//			var column = params.columns[i];
//			if (typeof column !== 'object') {
//				msg = 'columns の要素は object 型である必要があります; columns[{0}] = {1}';
//				this.throwError(msgHeader + msg, i, column);
//			}
//
//			// columns[i].propertyName のチェック
//			if (column.propertyName == null) {
//				msg = 'columns の要素は propertyName を持つ必要があります; columns[{0}] = {1}';
//				this.throwError(msgHeader + msg, i, column);
//			}
//			if (typeof column.propertyName !== 'string') {
//				msg = 'columns の要素の propertyName は string 型である必要があります; columns[{0}].propertyName = {1}';
//				this.throwError(msgHeader + msg, i, column.propertyName);
//			}
//
//			if (columnPropertyNames[column.propertyName]) {
//				msg = 'columns の要素の propertyName はそれぞれ一意である必要があります; 重複のある propertyName = {0}';
//				this.throwError(msgHeader + msg, column.propertyName);
//			}
//			columnPropertyNames[column.propertyName] = true;
//
//			// columns[i].formatter のチェック
//			if (column.formatter != null && !$.isFunction(column.formatter)) {
//				msg = 'columns の要素の formatter は function 型である必要があります; columns[{0}].formatter = {1}';
//				this.throwError(msgHeader + msg, i, column.formatter);
//			}
//		}


		// -- 共通なオプショナルなパラメータ -- //

		// defaultFormatter のチェック
		if (!$.isFunction(params.defaultFormatter)) {
			msg = 'defaultFormatter は function 型である必要があります; defaultFormatter = {0}';
			this.throwError(msgHeader + msg, params.defaultFormatter);
		}


		// verticalScrollStrategy のチェック
		var verticalScrollStrategy = params.verticalScrollStrategy;
		if (verticalScrollStrategy !== 'pixel' && verticalScrollStrategy !== 'index') {
			msg = 'verticalScrollStrategy は \'pixel\' または \'index\' である必要があります; verticalScrollStrategy = {0}';
			this.throwError(msgHeader + msg, verticalScrollStrategy);
		}

		// horizontalScrollStrategy のチェック
		var horizontalScrollStrategy = params.horizontalScrollStrategy;
		if (horizontalScrollStrategy !== 'pixel' && horizontalScrollStrategy !== 'index') {
			msg = 'horizontalScrollStrategy は \'pixel\' または \'index\' である必要があります; horizontalScrollStrategy = {0}';
			this.throwError(msgHeader + msg, horizontalScrollStrategy);
		}

		// defaultColumnWidth のチェック
		var defaultColumnWidth = params.defaultColumnWidth;
		if (typeof defaultColumnWidth !== 'number') {
			msg = 'defaultColumnWidth は number 型である必要があります; defaultColumnWidth = {0}';
			this.throwError(msgHeader + msg, defaultColumnWidth);
		}
		if (defaultColumnWidth !== Math.floor(defaultColumnWidth)) {
			msg = 'defaultColumnWidth は整数である必要があります; defaultColumnWidth = {0}';
			this.throwError(msgHeader + msg, defaultColumnWidth);
		}
		if (defaultColumnWidth <= 0) {
			msg = 'defaultColumnWidth は正の数である必要があります; defaultColumnWidth = {0}';
			this.throwError(msgHeader + msg, defaultColumnWidth);
		}

		// -- 元データに関するパラメータ -- //

		// url, data のチェック
		if (params.url == null && params.data == null) {
			this.throwError(msgHeader + 'url と data のどちらかは必ず指定してください');
		}
		if (params.url != null && params.data != null) {
			this.throwError(msgHeader + 'url と data は同時に指定できません');
		}

		if (params.url != null && typeof params.url !== 'string') {
			msg = 'url は string 型である必要があります; url = {0}';
			this.throwError(msgHeader + msg, params.url);
		}
		if (params.data != null && !$.isArray(params.data)) {
			msg = 'data は Array 型である必要があります; data = {0}';
			this.throwError(msgHeader + msg, params.data);
		}

		// ajaxSettings のチェック
		if (params.url == null && params.ajaxSettings != null) {
			msg = 'ajaxSetting は url と合わせて設定する必要があります';
			this.throwError(msgHeader + msg);
		}
		if (params.ajaxSettings != null && typeof params.ajaxSettings !== 'object') {
			msg = 'ajaxSettings は object 型である必要があります; ajaxSettings = {0}';
			this.throwError(msgHeader + msg, params.ajaxSettings);
		}

		// requestData のチェック
		if (params.url == null && params.requestData != null) {
			msg = 'requestData は url と合わせて設定する必要があります';
			this.throwError(msgHeader + msg);
		}
	};


	h5.u.obj.expose('h5.ui.components.datagrid.init', {
		COMMON_DEFAULT_INIT_PARAMS: COMMON_DEFAULT_INIT_PARAMS,
		wrapScrollFormatter: wrapScrollFormatter,
		validateCommonInitParams: validateCommonInitParams
	});

})(jQuery);


// ---- ComplexHeaderGridController ---- //

(function($) {
	'use strict';

	var COMMON_DEFAULT_INIT_PARAMS = h5.ui.components.datagrid.init.COMMON_DEFAULT_INIT_PARAMS;

	var COMPLEX_HEADER_DEFAULT_INIT_PARAMS = {
		rowSelector: 'tr:gt(0)',
		columnSelector: 'tr:eq(0) > td'
	};


	var complexHeaderGridController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.datagrid.ComplexHeaderGridController
		 */
		__name: 'h5.ui.components.datagrid.ComplexHeaderGridController',


		// --- Property --- //

		_params: null,

		_dataSource: null,

		_converter: null,

		_htmlHeaders: null,

		_gridLayoutController: h5.ui.components.datagrid.GridLayoutController,


		// --- Private Method --- //

		_makeGridParams: function(params) {
			return $.extend(true, {}, COMPLEX_HEADER_DEFAULT_INIT_PARAMS, COMMON_DEFAULT_INIT_PARAMS,
					params, this._htmlHeaders);
		},


		_validateInitParams: function(params) {

			// 共通のチェック
			h5.ui.components.datagrid.init.validateCommonInitParams(params);

			var msgHeader = '初期パラメータが不正です: ';
			var msg;


			// ヘッダ関連
			if (params.headerRowsHtml == null) {
				msg = 'headerRowsHtml は必ず指定してください（HTML上で指定する場合は class="grid-header-rows" の div 要素を直下に置く）';
				this.throwError(msgHeader + msg);
			}
			if (params.headerColumnsHtml == null) {
				msg = 'headerColumnsHtml は必ず指定してください（HTML上で指定する場合は class="grid-header-columns" の div 要素を直下に置く）';
				this.throwError(msgHeader + msg);
			}
			if (params.headerTopLeftCellsHtml == null) {
				msg = 'headerTopLeftCellsHtml は必ず指定してください（HTML上で指定する場合は class="grid-header-top-left-cells" の div 要素を直下に置く）';
				this.throwError(msgHeader + msg);
			}

			// セレクタに関連
			if (typeof params.rowSelector !== 'string') {
				msg = 'rowSelector は string 型である必要があります; rowSelector = {0}';
				this.throwError(msgHeader + msg, params.rowSelector);
			}
			if (typeof params.columnSelector !== 'string') {
				msg = 'columnSelector は string 型である必要があります; columnSelector = {0}';
				this.throwError(msgHeader + msg, params.columnSelector);
			}
		},

		_initializeChildControllers: function() {
			var params = this._params;

			if (params.url != null) {
				// TODO: ajaxSetting, postData
				this._dataSource = h5.ui.components.virtualScroll.data.createLazyLoadDataSource(params.url);
			} else {
				this._dataSource = h5.ui.components.virtualScroll.data.createLocalDataSource(params.data);
			}

			var idKey = params.idKey;
			var rowHeight = 20;
			var defaultColumnWidth = params.defaultColumnWidth;

			var selector = h5.ui.components.datagrid.createMultiSelector();

			var columns = [];
			var formatters = {};
			for (var i = 0, len = params.columns.length; i < len; i++) {
				var column = params.columns[i];
				columns.push(column.propertyName);

				if (column.formatter != null) {
					var formatter = h5.ui.components.datagrid.init.wrapScrollFormatter(column.formatter);
					formatters[column.propertyName] = formatter;
				}
			}

			this._converter = h5.ui.components.datagrid.createGridDataConverter({
				dataSource: this._dataSource,
				idKey: idKey,
				columns: columns,
				defaultRowHeight: rowHeight,
				defaultColumnWidth: defaultColumnWidth,
				selector: selector,
				columnsOption: null
			});

			var defaultFormatter = h5.ui.components.datagrid.init.wrapScrollFormatter(params.defaultFormatter);

			var vStrategy;
			if (params.verticalScrollStrategy === 'pixel') {
				vStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				vStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}

			var hStrategy;
			if (params.horizontalScrollStrategy === 'pixel') {
				hStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				hStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}


			var $headerRows = $('<div><div>');
			$headerRows.addClass('grid-header-rows').html(params.headerRowsHtml);
			$headerRows.appendTo(this.rootElement);
			var headerHeight = $headerRows.children().outerHeight();
			$headerRows.remove();

			var $headerColumns = $('<div></div>');
			$headerColumns.addClass('grid-header-columns').html(params.headerColumnsHtml);
			$headerColumns.appendTo(this.rootElement);
			var headerWidth = $headerColumns.children().outerWidth();
			$headerColumns.remove();


			var that = this;

			return this.readyPromise.then(function() {
				return that._gridLayoutController.readyPromise;
			}).then(function() {
				var promise = that._gridLayoutController.init({
					defaultFormatter: defaultFormatter,
					formatters: formatters,
					converter: that._converter,
					verticalScrollStrategy: vStrategy,
					horizontalScrollStrategy: hStrategy,
					headerRows: params.headerRowsHtml,
					headerColumns: params.headerColumnsHtml,
					headerTopLeftCellsHtml: params.headerTopLeftCellsHtml,
					rowSelector: params.rowSelector,
					columnSelector: params.columnSelector,
					headerHeight: headerHeight,
					headerWidth: headerWidth
				});

				that._dataSource.changeSearchOptions({});

				return promise;
			});
		},


		// --- Life Cycle Method --- //

		__init: function() {
			this._htmlHeaders = {};

			var $headerRows = $(this.rootElement).children('div.grid-header-rows');
			var $headerColumns = $(this.rootElement).children('div.grid-header-columns');
			var $headerTopLeftCells = $(this.rootElement)
					.children('div.grid-header-top-left-cells');

			if ($headerRows.length !== 0) {
				if ($headerRows.length !== 1) {
					this.throwError('div.grid-header-rows 要素が2個以上あります');
				}
				this._htmlHeaders.headerRowsHtml = $headerRows.html();
				$headerRows.remove();
			}

			if ($headerColumns.length !== 0) {
				if ($headerColumns.length !== 1) {
					this.throwError('div.grid-header-columns 要素が2個以上あります');
				}
				this._htmlHeaders.headerColumnsHtml = $headerColumns.html();
				$headerColumns.remove();
			}

			if ($headerTopLeftCells.length !== 0) {
				if ($headerTopLeftCells.length !== 1) {
					this.throwError('div.grid-header-top-left-cells 要素が2個以上あります');
				}
				this._htmlHeaders.headerTopLeftCellsHtml = $headerTopLeftCells.html();
				$headerTopLeftCells.remove();
			}
		},

		__ready: function() {
			return this._gridLayoutController.readyPromise;
		},


		__dispose: function() {
			$(this.rootElement).remove();
		},


		// --- Public Method --- //

		/**
		 * ComplexHeaderGridController を初期化する。
		 * <p>
		 * 初期化パラメータの詳細は以下の通り
		 * </p>
		 * <dl>
		 * <dt><strong>必須なパラメータ</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{string} idKey: 各データの dataId が格納されているプロパティ名</li>
		 * <li>{Array.&lt;{propertyName: string, formatter: function(object): string}&gt;} columns:
		 * 各列の情報を並べたオブジェクト</li>
		 * <li>{Array.&lt;object&gt;} data: データの配列
		 * </ul>
		 * </dd>
		 * <dt><strong>省略可能なパラメータ</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{undefined|function(object): string} [defaultFormatter]: デフォルトのフォーマッタ関数</li>
		 * <li>{string=} [verticalScrollStrategy='pixel']: 縦のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{string=} [horizontalScrollStrategy='pixel']: 横のスクロール方法（'pixel' と 'index'
		 * のどちらかを指定する）</li>
		 * <li>{string=} [horizontalScrollStrategy='pixel']: 横のスクロール方法（'pixel' と 'index'
		 * のどちらかを指定する）</li>
		 * <li>{number=} [defaultColumnWidth=100]: デフォルトの列幅
		 * <li>{string=} [headerRowsHtml] ヘッダ行（右上）を表現する HTML 文字列</li>
		 * <li>{string=} [headerColumnsHtml]: ヘッダ列（左下）を表現する HTML 文字列</li>
		 * <li>{string=} [headerTopLeftCellsHtml]: ヘッダの左上部分を表現する HTML 文字列</li>
		 * <li>{string=} [rowSelector='tr:gt(0)']: 縦のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{string=} [columnSelector='tr:eq(0) > td']: 横のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * </ul>
		 * </dd>
		 * </dl>
		 *
		 * @param {object} initParams 初期化パラメータ
		 * @return {Promise} 初期化完了を表す Promise オブジェクト
		 */
		init: function(initParams) {
			var that = this;

			return this.initPromise.then(function() {

				// デフォルト値のセット + HTML の解釈
				var params = that._makeGridParams(initParams);

				// パラメータチェック
				that._validateInitParams(params);

				// パラメータのセット
				that._params = params;

				// 子コントローラの初期化
				return that._initializeChildControllers();
			});
		}

	};

	h5.core.expose(complexHeaderGridController);

})(jQuery);


// ---- PagingGridController ---- //

(function($) {
	'use strict';

	var COMMON_DEFAULT_INIT_PARAMS = h5.ui.components.datagrid.init.COMMON_DEFAULT_INIT_PARAMS;

	var pagingGridController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.datagrid.PagingGridController
		 */
		__name: 'h5.ui.components.datagrid.PagingGridController',


		// --- Property --- //

		_params: null,

		_sortable: null,

		_dataSource: null,

		_pagingSource: null,

		_converter: null,

		_gridLayoutController: h5.ui.components.datagrid.GridLayoutController,

		_resizeColumnWidthTableController: h5.ui.components.datagrid.ResizeColumnWidthTableController,

		_sortTableController: h5.ui.components.datagrid.SortTableController,


		// --- Private Method --- //

		_makeGridParams: function(params) {
			return $.extend(true, {}, COMMON_DEFAULT_INIT_PARAMS, {
				enableMultiRowSelect: true,
				headerColumns: 0,
				gridHeight: 'auto',
				gridWidth: 'auto',

				enableChangeColumnWidthUI: true,
				minColumnWidth: 20,
				maxColumnWidth: 500,

				enableSortUI: true,
				sortableIconColor: '#BBB',
				sortingIconColor: '#666'
			}, params);
		},


		_validateInitParams: function(params) {

			// 共通のチェック
			h5.ui.components.datagrid.init.validateCommonInitParams(params);

			var msgHeader = '初期パラメータが不正です: ';
			var msg;

			// columns の追加パラメータチェック
			for (var i = 0, len = params.columns.length; i < len; i++) {
				var column = params.columns[i];

				// columns[i].width のチェック
				if (column.width != null) {

					if (typeof column.width !== 'number') {
						msg = 'columns の要素の width は number 型である必要があります; columns[{0}].width = {1}';
						this.throwError(msgHeader + msg, i, column.width);
					}
					if (column.width !== Math.floor(column.width)) {
						msg = 'columns の要素の width は整数である必要があります; columns[{0}].width = {1}';
						this.throwError(msgHeader + msg, i, column.width);
					}
					if (column.width <= 0) {
						msg = 'columns の要素の width は正の数である必要があります; columns[{0}].width = {1}';
						this.throwError(msgHeader + msg, i, column.width);
					}
				}

				if (column.sortable != null && typeof column.sortable !== 'boolean') {
					msg = 'columns の要素の sortable は boolean 型である必要があります; columns[{0}].sortable = {1}';
					this.throwError(msgHeader + msg, i, column.sortable);
				}
			}

			// pageSize
			if (params.pageSize == null) {
				msg = 'pageSize は必ず指定してください';
				this.throwError(msgHeader + msg);
			}
			if (typeof params.pageSize !== 'number') {
				msg = 'pageSize は number 型である必要があります; pageSize = {0}';
				this.throwError(msgHeader + msg, params.pageSize);
			}
			if (params.pageSize !== Math.floor(params.pageSize)) {
				msg = 'pageSize は整数である必要があります; pageSize = {0}';
				this.throwError(msgHeader + msg, params.pageSize);
			}
			if (params.pageSize <= 0) {
				msg = 'pageSize は正の数である必要があります; pageSize = {0}';
				this.throwError(msgHeader + msg, params.pageSize);
			}

			// rowHeight
			if (params.rowHeight == null) {
				msg = 'rowHeight は必ず指定してください';
				this.throwError(msgHeader + msg, params.rowHeight);
			}
			if (typeof params.rowHeight !== 'number') {
				msg = 'rowHeight は number 型である必要があります; rowHeight = {0}';
				this.throwError(msgHeader + msg, params.rowHeight);
			}
			if (params.rowHeight !== Math.floor(params.rowHeight)) {
				msg = 'rowHeight は整数である必要があります; rowHeight = {0}';
				this.throwError(msgHeader + msg, params.rowHeight);
			}
			if (params.rowHeight <= 0) {
				msg = 'rowHeight は正の数である必要があります; rowHeight = {0}';
				this.throwError(msgHeader + msg, params.rowHeight);
			}

			// enableMultiSelect のチェック
			if (typeof params.enableMultiRowSelect !== 'boolean') {
				msg = 'enableMultiRowSelect は boolean 型である必要があります; enableMultiRowSelect = {0}';
				this.throwError(msgHeader + msg, params.enableMultiRowSelect);
			}

			// headerColumns のチェック
			if (typeof params.headerColumns !== 'number') {
				msg = 'headerColumns は number 型である必要があります; headerColumns = {0}';
				this.throwError(msgHeader + msg, params.headerColumns);
			}
			if (params.headerColumns !== Math.floor(params.headerColumns)) {
				msg = 'headerColumns は整数である必要があります; headerColumns = {0}';
				this.throwError(msgHeader + msg, params.headerColumns);
			}
			if (params.headerColumns < 0) {
				msg = 'headerColumns は非負の数である必要があります; headerColumns = {0}';
				this.throwError(msgHeader + msg, params.headerColumns);
			}

			// gridHeight のチェック
			if (params.gridHeight !== 'auto') {
				if (typeof params.gridHeight !== 'number') {
					msg = 'gridHeight は \'auto\' または number 型である必要があります; gridHeight = {0}';
					this.throwError(msgHeader + msg, params.gridHeight);
				}
				if (params.gridHeight !== Math.floor(params.gridHeight)) {
					msg = 'gridHeight に number 型を指定する場合は整数である必要があります; gridHeight = {0}';
					this.throwError(msgHeader + msg, params.gridHeight);
				}
				if (params.gridHeight <= 0) {
					msg = 'gridHeight に number 型を指定する場合は正の数である必要があります; gridHeight = {0}';
					this.throwError(msgHeader + msg, params.gridHeight);
				}
			}

			// gridWidth のチェック
			if (params.gridWidth !== 'auto') {
				if (typeof params.gridWidth !== 'number') {
					msg = 'gridWidth は \'auto\' または number 型である必要があります; gridWidth = {0}';
					this.throwError(msgHeader + msg, params.gridWidth);
				}
				if (params.gridWidth !== Math.floor(params.gridWidth)) {
					msg = 'gridWidth に number 型を指定する場合は整数である必要があります; gridWidth = {0}';
					this.throwError(msgHeader + msg, params.gridWidth);
				}
				if (params.gridWidth <= 0) {
					msg = 'gridWidth に number 型を指定する場合は正の数である必要があります; gridWidth = {0}';
					this.throwError(msgHeader + msg, params.gridWidth);
				}
			}

			// enableChangeColumnWidthUI
			if (typeof params.enableChangeColumnWidthUI !== 'boolean') {
				msg = 'enableChangeColumnWidthUI は boolean 型である必要があります; enableChangeColumnWidthUI = {0}';
				this.throwError(msgHeader + msg, params.enableChangeColumnWidthUI);
			}

			// minColumnWidth
			if (typeof params.minColumnWidth !== 'number') {
				msg = 'minColumnWidth は number 型である必要があります; minColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.minColumnWidth);
			}
			if (params.minColumnWidth !== Math.floor(params.minColumnWidth)) {
				msg = 'minColumnWidth は整数である必要があります; minColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.minColumnWidth);
			}
			if (params.minColumnWidth < 5) {
				msg = 'minColumnWidth は 5 より大きい数値である必要があります; minColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.minColumnWidth);
			}

			// maxColumnWidth
			if (typeof params.maxColumnWidth !== 'number') {
				msg = 'maxColumnWidth は number 型である必要があります; maxColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.maxColumnWidth);
			}
			if (params.maxColumnWidth !== Math.floor(params.maxColumnWidth)) {
				msg = 'maxColumnWidth は整数である必要があります; maxColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.maxColumnWidth);
			}
			if (params.maxColumnWidth <= params.minColumnWidth) {
				msg = 'maxColumnWidth は minColumnWidth より大きい値である必要があります; maxColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.maxColumnWidth);
			}

			// enableSortUI
			if (typeof params.enableSortUI !== 'boolean') {
				msg = 'enableSortUI は boolean 型である必要があります; enableSortUI = {0}';
				this.throwError(msgHeader + msg, params.enableSortUI);
			}

			// sortableIconColor
			if (typeof params.sortableIconColor !== 'string') {
				msg = 'sortableIconColor は string 型である必要があります; sortableIconColor = {0}';
				this.throwError(msgHeader + msg, params.sortableIconColor);
			}

			// sortingIconColor
			if (typeof params.sortingIconColor !== 'string') {
				msg = 'sortingIconColor は string 型である必要があります; sortingIconColor = {0}';
				this.throwError(msgHeader + msg, params.sortingIconColor);
			}
		},

		_initializeChildControllers: function() {
			var params = this._params;

			if (params.url != null) {
				this._dataSource = h5.ui.components.virtualScroll.data.createLazyLoadDataSource(params.url,
						params.ajaxSettings, params.requestData);
			} else {
				this._dataSource = h5.ui.components.virtualScroll.data.createLocalDataSource(params.data);
			}


			var idKey = params.idKey;
			var rowHeight = params.rowHeight;
			var defaultColumnWidth = params.defaultColumnWidth;

			var selector;
			if (params.enableMultiRowSelect) {
				selector = h5.ui.components.datagrid.createMultiSelector();
			} else {
				selector = h5.ui.components.datagrid.createSingleSelector();
			}

			this._pagingSource = h5.ui.components.datagrid
					.createPagingAdapter(this._dataSource, params.pageSize);

			var headerRows = 1;
			var headerColumns = params.headerColumns;
			var headerTopLeftCellsHtml = null;
			var headerHeight = params.rowHeight + 1;
			var headerWidth = 1;

			var gridHeight = params.rowHeight * (params.pageSize + 1) + 1;
			var gridWidth = 1;

			var scrollBarWidth = h5.ui.components.virtualScroll.getScrollBarWidth();
			gridHeight += scrollBarWidth;
			gridWidth += scrollBarWidth;

			var columns = [];
			var formatters = {};
			var columnsOption = {};

			this._sortable = {};

			for (var i = 0, len = params.columns.length; i < len; i++) {
				var column = params.columns[i];
				columns.push(column.propertyName);

				if (column.formatter != null) {
					var formatter = h5.ui.components.datagrid.init.wrapScrollFormatter(column.formatter);
					formatters[column.propertyName] = formatter;
				}
				var option = {};

				if (column.width != null) {
					option.width = column.width;
				}

				if (column.header != null) {
					option.header = column.header;
				}

				var sortable = !!column.sortable;
				this._sortable[column.propertyName] = sortable;
				option.sortable = sortable;

				var markable = !!column.markable;
				if (column.markable == null) {
					markable = true;
				}
				option.markable = markable;

				columnsOption[column.propertyName] = option;

				// width 計算
				var width = (column.width != null) ? column.width : params.defaultColumnWidth;

				gridWidth += width;
				if (i < headerColumns) {
					headerWidth += width;
				}
			}

			if (params.gridHeight !== 'auto') {
				gridHeight = params.gridHeight + scrollBarWidth;
			}
			if (params.gridWidth !== 'auto') {
				gridWidth = params.gridWidth + scrollBarWidth;
			}

			this._converter = h5.ui.components.datagrid.createGridDataConverter({
				dataSource: this._pagingSource,
				idKey: idKey,
				columns: columns,
				defaultRowHeight: rowHeight,
				defaultColumnWidth: defaultColumnWidth,
				selector: selector,
				columnsOption: columnsOption
			});

			var defaultFormatter = h5.ui.components.datagrid.init.wrapScrollFormatter(params.defaultFormatter);

			var vStrategy;
			if (params.verticalScrollStrategy === 'pixel') {
				vStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				vStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}

			var hStrategy;
			if (params.horizontalScrollStrategy === 'pixel') {
				hStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				hStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}

			if (!params.enableChangeColumnWidthUI) {
				this._resizeColumnWidthTableController.disableListeners();
			}
			this._resizeColumnWidthTableController.setMinWidth(params.minColumnWidth);
			this._resizeColumnWidthTableController.setMaxWidth(params.maxColumnWidth);

			if (!params.enableSortUI) {
				this._sortTableController.disableListeners();
			}

			this._sortTableController.setSortableIconColor(params.sortableIconColor);
			this._sortTableController.setSortingIconColor(params.sortingIconColor);


			var that = this;

			return this.readyPromise.then(function() {
				return that._gridLayoutController.readyPromise;
			}).then(function() {

				var $root = $(that.rootElement);
				$root.css('height', gridHeight);
				$root.css('width', gridWidth);

				var promise = that._gridLayoutController.init({
					defaultFormatter: defaultFormatter,
					formatters: formatters,
					converter: that._converter,
					verticalScrollStrategy: vStrategy,
					horizontalScrollStrategy: hStrategy,
					headerRows: headerRows,
					headerColumns: headerColumns,
					headerTopLeftCellsHtml: headerTopLeftCellsHtml,
					headerHeight: headerHeight,
					headerWidth: headerWidth
				});

				that._pagingSource.changeSearchOptions({});

				return promise;
			});
		},


		// --- Life Cycle Method --- //

		__ready: function() {
			return this._gridLayoutController.readyPromise;
		},


		__dispose: function() {
			$(this.rootElement).remove();
		},


		// --- Event Handler --- //

		'{rootElement} changeColumnWidth': function(context) {
			var evArg = context.evArg;
			this.setColumnWidth(evArg.widthKey, evArg.width);
		},


		// --- Public Method --- //

		/**
		 * ComplexHeaderGridController を初期化する。
		 * <p>
		 * 初期化パラメータの詳細は以下の通り
		 * </p>
		 * <dl>
		 * <dt><strong>必須なパラメータ</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{string} idKey: 各データの dataId が格納されているプロパティ名</li>
		 * <li>{Array.&lt;{propertyName: string, formatter: function(object): string, width:
		 * number=, header: *, sortable: boolean}&gt;} columns: 各列の情報を並べたオブジェクト</li>
		 * </ul>
		 * <li>{number} pageSize: 1ページ内に表示するデータ数</li>
		 * <li>{number} rowHeight: 各行の高さ</li>
		 * </dd>
		 * <dt><strong>元データ指定用パラメータ（data と url のどちらか一方を必ず指定する）</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{Array&lt;object&gt;=} [data]: データの配列</li>
		 * <li>{string=} [url]: データ取得先のサーバのURL</li>
		 * <li>{object=} [ajaxSettings]: データ取得の際の ajax 通信の設定（$.ajax に渡すオブジェクト）</li>
		 * <li>{object=} [requestData]: データ取得の際にリクエストに付けるデータ</li>
		 * </ul>
		 * </dd>
		 * <dt><strong>省略可能なパラメータ</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{undefined|function(object): string} [defaultFormatter]: デフォルトのフォーマッタ関数</li>
		 * <li>{boolean=} [enableMultiSelect=true]: 複数行を選択可能とするか否か</li>
		 * <li>{string=} [verticalScrollStrategy='pixel']: 縦のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{string=} [horizontalScrollStrategy='pixel']: 横のスクロール方法（'pixel' と 'index'
		 * のどちらかを指定する）</li>
		 * <li>{string=} [horizontalScrollStrategy='pixel']: 横のスクロール方法（'pixel' と 'index'
		 * のどちらかを指定する）</li>
		 * <li>{number=} [defaultColumnWidth=100]: デフォルトの列幅
		 * <li>{string=} [headerRowsHtml] ヘッダ行（右上）を表現する HTML 文字列</li>
		 * <li>{string=} [headerColumnsHtml]: ヘッダ列（左下）を表現する HTML 文字列</li>
		 * <li>{string=} [headerTopLeftCellsHtml]: ヘッダの左上部分を表現する HTML 文字列</li>
		 * <li>{string=} [rowSelector='tr:gt(0)']: 縦のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{string=} [columnSelector='tr:eq(0) > td']: 横のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{number=} [headerColumns=0]: 固定する列数</li>
		 * <li>{undefined|number|string} [gridHeight='auto']: グリッド全体の高さ</li>
		 * <li>{undefined|number|string} [gridWidth='auto']: グリッド全体の幅</li>
		 * <li>{boolean=} [enableChangeColumnWidthUI=true]: 列幅変更のためのUIを有効にするか</li>
		 * <li>{number=} [minColumnWidth=20]: UI で操作する際の最小の列幅</li>
		 * <li>{number=} [maxColumnWidth=500]: UI で操作する際の最大の列幅</li>
		 * <li>{boolean=} [enableSortUI=true]: ソートのためのUIを有効にするか</li>
		 * <li>{string=} [sortableIconColor='#BBB']: ソート可能なことを表現する矢印アイコンの色</li>
		 * <li>{string=} [sortingIconColor='#666']: 現在ソート中であることを表現する矢印アイコンの色</li>
		 * </ul>
		 * </dd>
		 * </dl>
		 *
		 * @param {object} initParams 初期化パラメータ
		 * @return {Promise} 初期化完了を表す Promise オブジェクト
		 */
		init: function(initParams) {
			var that = this;

			return this.initPromise.then(function() {

				// デフォルト値のセット + HTML の解釈
				var params = that._makeGridParams(initParams);

				// パラメータチェック
				that._validateInitParams(params);

				// パラメータのセット
				that._params = params;

				// 子コントローラの初期化
				return that._initializeChildControllers();
			});
		},

		/**
		 * 行を選択します。
		 *
		 * @param {*} dataId 選択したい行の dataId
		 */
		selectData: function(dataId) {
			if (dataId == null) {
				this.throwError('dataId を指定してください');
			}

			this._converter.selectData(dataId);
		},

		/**
		 * 全ての行を選択します。
		 */
		selectAllData: function() {
			var length = this._dataSource.getTotalLength();
			var allData = this._dataSource.sliceCachedData(0, length);

			this._converter.selectMultiData(allData);
		},

		/**
		 * 行の選択を解除します。
		 *
		 * @param {*} dataId 選択を解除したい行の dataId
		 */
		unselectData: function(dataId) {
			if (dataId == null) {
				this.throwError('dataId を指定してください');
			}

			this._converter.unselectData(dataId);
		},

		/**
		 * 全ての行の選択を解除します。
		 */
		unselectAllData: function() {
			this._converter.unselectAllData();
		},

		/**
		 * 行の選択状態を取得します。
		 *
		 * @return {boolean} 選択されていれば true、そうでなければ false
		 */
		isSelectedData: function(dataId) {
			if (dataId == null) {
				this.throwError('dataId を指定してください');
			}

			return this._converter.isSelectedData(dataId);
		},

		/**
		 * 選択されているすべての行の dataId を取得します。
		 *
		 * @return {Array.<*>} 選択されているすべての行の dataId の配列
		 */
		getSelectedDataIds: function() {
			return this._converter.getSelectedDataIds();
		},

		/**
		 * ページを移動します。
		 *
		 * @param {number} pageNumber 移動先のページ番号
		 */
		movePage: function(pageNumber) {
			var msg;

			if (pageNumber == null) {
				this.throwError('pageNumber を指定してください');
			}
			if (typeof pageNumber !== 'number') {
				msg = 'pageNumber には number 型を指定してください; pageNumber = {0}';
				this.throwError(msg, pageNumber);
			}
			if (pageNumber !== Math.floor(pageNumber)) {
				msg = 'pageNumber には整数を指定してください; pageNumber = {0}';
				this.throwError(msg, pageNumber);
			}
			if (pageNumber <= 0) {
				msg = 'pageNumber には正の値を指定してください; pageNumber = {0}';
				this.throwError(msg, pageNumber);
			}

			this._gridLayoutController.beginLoad();
			this._pagingSource.movePage(pageNumber);
		},

		/**
		 * 現在のページ番号を取得します。
		 *
		 * @return {number} 現在のページ番号
		 */
		getCurrentPage: function() {
			return this._pagingSource.getCurrentPage();
		},

		getTotalPages: function() {
			return this._pagingSource.getTotalPages();
		},

		/**
		 * ソートします。
		 *
		 * @param {string=} propertyName ソートするプロパティ名（指定しなかった場合はソートの解除）
		 * @param {boolean=} [isDesc=false] ソート順が降順であるか否か（降順の場合 true、デフォルトは false）
		 */
		sort: function(propertyName, isDesc) {
			var msg;

			if (propertyName == null) {

				this._gridLayoutController.beginLoad();
				this._dataSource.changeSearchOptions({});

			} else {
				if (typeof propertyName !== 'string') {
					msg = 'propertyname は string 型を指定してください; propertyName = {0}';
					this.throwError(msg, propertyName);
				}

				if (isDesc != null && typeof isDesc !== 'boolean') {
					msg = 'isDesc は boolean 型を指定してください; isDesc = {0}';
					this.throwError(msg, isDesc);
				}

				if (!this._sortable[propertyName]) {
					msg = 'sortable でない列はソートできません; propertyName = {0}';
					this.throwError(msg, propertyName);
				}


				this._gridLayoutController.beginLoad();

				var order = isDesc ? 'desc' : 'asc';
				this._dataSource.changeSearchOptions({
					sort: [{
						property: propertyName,
						order: order
					}]
				});
			}
		},

		/**
		 * リクエストデータを変更します。
		 *
		 * @param {object} requestData リクエストデータ
		 */
		changeRequestData: function(requestData) {
			if (this._params.url == null) {
				var msg = '初期化パラメータに url を設定していない場合はこのメソッドは利用できません';
				this.throwError(msg);
			}

			this._dataSource.setCustomRequestData(requestData);
		},

		/**
		 * 列の幅を変更します。
		 *
		 * @param {string} widthKey 変更したい列の widthKey
		 * @param {number} width 列幅
		 */
		setColumnWidth: function(widthKey, width) {
			this._converter.setWidth(widthKey, width);
		},

		/**
		 * rowId からデータオブジェクトを取得します。 キャッシュされていない rowId を指定すると例外を投げます。
		 *
		 * @param {number} rowId 行ID
		 */
		getCachedData: function(rowId) {
			var msg;

			if (rowId == null) {
				this.throwError('rowId を指定してください');
			}
			if (typeof rowId !== 'number') {
				msg = 'rowId には number 型を指定してください; rowId = {0}';
				this.throwError(msg, rowId);
			}
			if (rowId !== Math.floor(rowId)) {
				msg = 'rowId には整数を指定してください; rowId = {0}';
				this.throwError(msg, rowId);
			}
			if (rowId < 0) {
				msg = 'rowId には非負の値を指定してください; rowId = {0}';
				this.throwError(msg, rowId);
			}
			return this._converter.getCachedOriginData(rowId);
		}
	};

	h5.core.expose(pagingGridController);

})(jQuery);


// ---- ScrollGridController ---- //

(function($) {
	'use strict';

	var COMMON_DEFAULT_INIT_PARAMS = h5.ui.components.datagrid.init.COMMON_DEFAULT_INIT_PARAMS;

	var scrollGridController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.datagrid.ScrollGridController
		 */
		__name: 'h5.ui.components.datagrid.ScrollGridController',


		// --- Property --- //

		_params: null,

		_sortable: null,

		_dataSource: null,

		_converter: null,

		_gridLayoutController: h5.ui.components.datagrid.GridLayoutController,

		_resizeColumnWidthTableController: h5.ui.components.datagrid.ResizeColumnWidthTableController,

		_sortTableController: h5.ui.components.datagrid.SortTableController,


		// --- Private Method --- //

		_makeGridParams: function(params) {
			return $.extend(true, {}, COMMON_DEFAULT_INIT_PARAMS, {
				enableMultiRowSelect: true,
				headerColumns: 0,
				gridWidth: 'auto',

				enableChangeColumnWidthUI: true,
				minColumnWidth: 20,
				maxColumnWidth: 500,

				enableSortUI: true,
				sortableIconColor: '#BBB',
				sortingIconColor: '#666'
			}, params);
		},


		_validateInitParams: function(params) {

			// 共通のチェック
			h5.ui.components.datagrid.init.validateCommonInitParams(params);

			var msgHeader = '初期パラメータが不正です: ';
			var msg;

			// columns の追加パラメータチェック
			for (var i = 0, len = params.columns.length; i < len; i++) {
				var column = params.columns[i];

				// columns[i].width のチェック
				if (column.width != null) {

					if (typeof column.width !== 'number') {
						msg = 'columns の要素の width は number 型である必要があります; columns[{0}].width = {1}';
						this.throwError(msgHeader + msg, i, column.width);
					}
					if (column.width !== Math.floor(column.width)) {
						msg = 'columns の要素の width は整数である必要があります; columns[{0}].width = {1}';
						this.throwError(msgHeader + msg, i, column.width);
					}
					if (column.width <= 0) {
						msg = 'columns の要素の width は正の数である必要があります; columns[{0}].width = {1}';
						this.throwError(msgHeader + msg, i, column.width);
					}
				}

				if (column.sortable != null && typeof column.sortable !== 'boolean') {
					msg = 'columns の要素の sortable は boolean 型である必要があります; columns[{0}].sortable = {1}';
					this.throwError(msgHeader + msg, i, column.sortable);
				}
			}


			// rowHeight
			if (params.rowHeight == null) {
				msg = 'rowHeight は必ず指定してください';
				this.throwError(msgHeader + msg, params.rowHeight);
			}
			if (typeof params.rowHeight !== 'number') {
				msg = 'rowHeight は number 型である必要があります; rowHeight = {0}';
				this.throwError(msgHeader + msg, params.rowHeight);
			}
			if (params.rowHeight !== Math.floor(params.rowHeight)) {
				msg = 'rowHeight は整数である必要があります; rowHeight = {0}';
				this.throwError(msgHeader + msg, params.rowHeight);
			}
			if (params.rowHeight <= 0) {
				msg = 'rowHeight は正の数である必要があります; rowHeight = {0}';
				this.throwError(msgHeader + msg, params.rowHeight);
			}

			// enableMultiSelect のチェック
			if (typeof params.enableMultiRowSelect !== 'boolean') {
				msg = 'enableMultiRowSelect は boolean 型である必要があります; enableMultiRowSelect = {0}';
				this.throwError(msgHeader + msg, params.enableMultiRowSelect);
			}

			// headerColumns のチェック
			if (typeof params.headerColumns !== 'number') {
				msg = 'headerColumns は number 型である必要があります; headerColumns = {0}';
				this.throwError(msgHeader + msg, params.headerColumns);
			}
			if (params.headerColumns !== Math.floor(params.headerColumns)) {
				msg = 'headerColumns は整数である必要があります; headerColumns = {0}';
				this.throwError(msgHeader + msg, params.headerColumns);
			}
			if (params.headerColumns < 0) {
				msg = 'headerColumns は非負の数である必要があります; headerColumns = {0}';
				this.throwError(msgHeader + msg, params.headerColumns);
			}

			// gridHeight のチェック
			if (params.gridHeight == null) {
				msg = 'gridHeight は必ず指定してください';
				this.throwError(msgHeader + msg);
			}
			if (typeof params.gridHeight !== 'number') {
				msg = 'gridHeight は  number 型である必要があります; gridHeight = {0}';
				this.throwError(msgHeader + msg, params.gridHeight);
			}
			if (params.gridHeight !== Math.floor(params.gridHeight)) {
				msg = 'gridHeight は整数である必要があります; gridHeight = {0}';
				this.throwError(msgHeader + msg, params.gridHeight);
			}
			if (params.gridHeight <= 0) {
				msg = 'gridHeight は正の数である必要があります; gridHeight = {0}';
				this.throwError(msgHeader + msg, params.gridHeight);
			}

			// gridWidth のチェック
			if (params.gridWidth !== 'auto') {
				if (typeof params.gridWidth !== 'number') {
					msg = 'gridWidth は \'auto\' または number 型である必要があります; gridWidth = {0}';
					this.throwError(msgHeader + msg, params.gridWidth);
				}
				if (params.gridWidth !== Math.floor(params.gridWidth)) {
					msg = 'gridWidth に number 型を指定する場合は整数である必要があります; gridWidth = {0}';
					this.throwError(msgHeader + msg, params.gridWidth);
				}
				if (params.gridWidth <= 0) {
					msg = 'gridWidth に number 型を指定する場合は正の数である必要があります; gridWidth = {0}';
					this.throwError(msgHeader + msg, params.gridWidth);
				}
			}

			// enableChangeColumnWidthUI
			if (typeof params.enableChangeColumnWidthUI !== 'boolean') {
				msg = 'enableChangeColumnWidthUI は boolean 型である必要があります; enableChangeColumnWidthUI = {0}';
				this.throwError(msgHeader + msg, params.enableChangeColumnWidthUI);
			}

			// minColumnWidth
			if (typeof params.minColumnWidth !== 'number') {
				msg = 'minColumnWidth は number 型である必要があります; minColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.minColumnWidth);
			}
			if (params.minColumnWidth !== Math.floor(params.minColumnWidth)) {
				msg = 'minColumnWidth は整数である必要があります; minColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.minColumnWidth);
			}
			if (params.minColumnWidth < 5) {
				msg = 'minColumnWidth は 5 より大きい数値である必要があります; minColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.minColumnWidth);
			}

			// maxColumnWidth
			if (typeof params.maxColumnWidth !== 'number') {
				msg = 'maxColumnWidth は number 型である必要があります; maxColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.maxColumnWidth);
			}
			if (params.maxColumnWidth !== Math.floor(params.maxColumnWidth)) {
				msg = 'maxColumnWidth は整数である必要があります; maxColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.maxColumnWidth);
			}
			if (params.maxColumnWidth <= params.minColumnWidth) {
				msg = 'maxColumnWidth は minColumnWidth より大きい値である必要があります; maxColumnWidth = {0}';
				this.throwError(msgHeader + msg, params.maxColumnWidth);
			}

			// enableSortUI
			if (typeof params.enableSortUI !== 'boolean') {
				msg = 'enableSortUI は boolean 型である必要があります; enableSortUI = {0}';
				this.throwError(msgHeader + msg, params.enableSortUI);
			}

			// sortableIconColor
			if (typeof params.sortableIconColor !== 'string') {
				msg = 'sortableIconColor は string 型である必要があります; sortableIconColor = {0}';
				this.throwError(msgHeader + msg, params.sortableIconColor);
			}

			// sortingIconColor
			if (typeof params.sortingIconColor !== 'string') {
				msg = 'sortingIconColor は string 型である必要があります; sortingIconColor = {0}';
				this.throwError(msgHeader + msg, params.sortingIconColor);
			}

		},

		_initializeChildControllers: function() {
			var params = this._params;

			if (params.url != null) {
				this._dataSource = h5.ui.components.virtualScroll.data.createLazyLoadDataSource(params.url,
						params.ajaxSettings, params.requestData);
			} else {
				this._dataSource = h5.ui.components.virtualScroll.data.createLocalDataSource(params.data);
			}

			var idKey = params.idKey;
			var rowHeight = params.rowHeight;
			var defaultColumnWidth = params.defaultColumnWidth;

			var selector;
			if (params.enableMultiRowSelect) {
				selector = h5.ui.components.datagrid.createMultiSelector();
			} else {
				selector = h5.ui.components.datagrid.createSingleSelector();
			}

			var headerRows = 1;
			var headerColumns = params.headerColumns;
			var headerTopLeftCellsHtml = null;
			var headerHeight = params.rowHeight + 1;
			var headerWidth = 1;

			var scrollBarWidth = h5.ui.components.virtualScroll.getScrollBarWidth();
			var gridHeight = params.gridHeight + scrollBarWidth;

			var gridWidth = 1;

			gridWidth += scrollBarWidth;

			var columns = [];
			var formatters = {};
			var columnsOption = {};

			this._sortable = {};

			for (var i = 0, len = params.columns.length; i < len; i++) {
				var column = params.columns[i];
				columns.push(column.propertyName);

				if (column.formatter != null) {
					var formatter = h5.ui.components.datagrid.init.wrapScrollFormatter(column.formatter);
					formatters[column.propertyName] = formatter;
				}
				var option = {};

				if (column.width != null) {
					option.width = column.width;
				}

				if (column.header != null) {
					option.header = column.header;
				}

				var sortable = !!column.sortable;
				this._sortable[column.propertyName] = sortable;
				option.sortable = sortable;

				var markable = !!column.markable;
				if (column.markable == null) {
					markable = true;
				}
				option.markable = markable;

				columnsOption[column.propertyName] = option;

				// width 計算
				var width = (column.width != null) ? column.width : params.defaultColumnWidth;

				gridWidth += width;
				if (i < headerColumns) {
					headerWidth += width;
				}
			}

			if (params.gridWidth !== 'auto') {
				gridWidth = params.gridWidth + scrollBarWidth;
			}

			this._converter = h5.ui.components.datagrid.createGridDataConverter({
				dataSource: this._dataSource,
				idKey: idKey,
				columns: columns,
				defaultRowHeight: rowHeight,
				defaultColumnWidth: defaultColumnWidth,
				selector: selector,
				columnsOption: columnsOption
			});

			var defaultFormatter = h5.ui.components.datagrid.init.wrapScrollFormatter(params.defaultFormatter);

			var vStrategy;
			if (params.verticalScrollStrategy === 'pixel') {
				vStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				vStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}

			var hStrategy;
			if (params.horizontalScrollStrategy === 'pixel') {
				hStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				hStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}

			if (!params.enableChangeColumnWidthUI) {
				this._resizeColumnWidthTableController.disableListeners();
			}
			this._resizeColumnWidthTableController.setMinWidth(params.minColumnWidth);
			this._resizeColumnWidthTableController.setMaxWidth(params.maxColumnWidth);

			if (!params.enableSortUI) {
				this._sortTableController.disableListeners();
			}

			this._sortTableController.setSortableIconColor(params.sortableIconColor);
			this._sortTableController.setSortingIconColor(params.sortingIconColor);


			var that = this;

			return this.readyPromise.then(function() {
				return that._gridLayoutController.readyPromise;
			}).then(function() {

				var $root = $(that.rootElement);
				$root.css('height', gridHeight);
				$root.css('width', gridWidth);

				var promise = that._gridLayoutController.init({
					defaultFormatter: defaultFormatter,
					formatters: formatters,
					converter: that._converter,
					verticalScrollStrategy: vStrategy,
					horizontalScrollStrategy: hStrategy,
					headerRows: headerRows,
					headerColumns: headerColumns,
					headerTopLeftCellsHtml: headerTopLeftCellsHtml,
					headerHeight: headerHeight,
					headerWidth: headerWidth
				});

				that._dataSource.changeSearchOptions({});

				return promise;
			});
		},


		// --- Life Cycle Method --- //

		__ready: function() {
			return this._gridLayoutController.readyPromise;
		},


		__dispose: function() {
			$(this.rootElement).remove();
		},


		// --- Event Handler --- //

		'{rootElement} changeColumnWidth': function(context) {
			var evArg = context.evArg;
			this.setColumnWidth(evArg.widthKey, evArg.width);
		},


		// --- Public Method --- //

		/**
		 * ComplexHeaderGridController を初期化する。
		 * <p>
		 * 初期化パラメータの詳細は以下の通り
		 * </p>
		 * <dl>
		 * <dt><strong>必須なパラメータ</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{string} idKey: 各データの dataId が格納されているプロパティ名</li>
		 * <li>{Array.&lt;{propertyName: string, formatter: function(object): string, width:
		 * number=, header: *, sortable: boolean}&gt;} columns: 各列の情報を並べたオブジェクト</li>
		 * <li>{number} rowHeight: 各行の高さ</li>
		 * <li>{number} gridHeight: グリッド全体の高さ</li>
		 * </ul>
		 * </dd>
		 * <dt><strong>元データ指定用パラメータ（data と url のどちらか一方を必ず指定する）</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{Array&lt;object&gt;=} [data]: データの配列</li>
		 * <li>{string=} [url]: データ取得先のサーバのURL</li>
		 * <li>{object=} [ajaxSettings]: データ取得の際の ajax 通信の設定（$.ajax に渡すオブジェクト）</li>
		 * <li>{object=} [requestData]: データ取得の際にリクエストに付けるデータ</li>
		 * </ul>
		 * </dd>
		 * <dt><strong>省略可能なパラメータ</strong></dt>
		 * <dd>
		 * <ul>
		 * <li>{undefined|function(object): string} [defaultFormatter]: デフォルトのフォーマッタ関数</li>
		 * <li>{boolean=} [enableMultiSelect=true]: 複数行を選択可能とするか否か</li>
		 * <li>{string=} [verticalScrollStrategy='pixel']: 縦のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{string=} [horizontalScrollStrategy='pixel']: 横のスクロール方法（'pixel' と 'index'
		 * のどちらかを指定する）</li>
		 * <li>{string=} [horizontalScrollStrategy='pixel']: 横のスクロール方法（'pixel' と 'index'
		 * のどちらかを指定する）</li>
		 * <li>{number=} [defaultColumnWidth=100]: デフォルトの列幅
		 * <li>{string=} [headerRowsHtml] ヘッダ行（右上）を表現する HTML 文字列</li>
		 * <li>{string=} [headerColumnsHtml]: ヘッダ列（左下）を表現する HTML 文字列</li>
		 * <li>{string=} [headerTopLeftCellsHtml]: ヘッダの左上部分を表現する HTML 文字列</li>
		 * <li>{string=} [rowSelector='tr:gt(0)']: 縦のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{string=} [columnSelector='tr:eq(0) > td']: 横のスクロール方法（'pixel' と 'index' のどちらかを指定する）</li>
		 * <li>{number=} [headerColumns=0]: 固定する列数</li>
		 * <li>{undefined|number|string} [gridWidth='auto']: グリッド全体の幅</li>
		 * <li>{boolean=} [enableChangeColumnWidthUI=true]: 列幅変更のためのUIを有効にするか</li>
		 * <li>{number=} [minColumnWidth=20]: UI で操作する際の最小の列幅</li>
		 * <li>{number=} [maxColumnWidth=500]: UI で操作する際の最大の列幅</li>
		 * <li>{boolean=} [enableSortUI=true]: ソートのためのUIを有効にするか</li>
		 * <li>{string=} [sortableIconColor='#BBB']: ソート可能なことを表現する矢印アイコンの色</li>
		 * <li>{string=} [sortingIconColor='#666']: 現在ソート中であることを表現する矢印アイコンの色</li>
		 * </ul>
		 * </dd>
		 * </dl>
		 *
		 * @param {object} initParams 初期化パラメータ
		 * @return {Promise} 初期化完了を表す Promise オブジェクト
		 */
		init: function(initParams) {
			var that = this;

			return this.initPromise.then(function() {

				// デフォルト値のセット + HTML の解釈
				var params = that._makeGridParams(initParams);

				// パラメータチェック
				that._validateInitParams(params);

				// パラメータのセット
				that._params = params;

				// 子コントローラの初期化
				return that._initializeChildControllers();
			});
		},

		/**
		 * 行を選択します。
		 *
		 * @param {*} dataId 選択したい行の dataId
		 */
		selectData: function(dataId) {
			if (dataId == null) {
				this.throwError('dataId を指定してください');
			}

			this._converter.selectData(dataId);
		},

		/**
		 * 全ての行を選択します。
		 */
		selectAllData: function() {
			var length = this._dataSource.getTotalLength();
			var allData = this._dataSource.sliceCachedData(0, length);

			this._converter.selectMultiData(allData);
		},

		/**
		 * 行の選択を解除します。
		 *
		 * @param {*} dataId 選択を解除したい行の dataId
		 */
		unselectData: function(dataId) {
			if (dataId == null) {
				this.throwError('dataId を指定してください');
			}

			this._converter.unselectData(dataId);
		},

		/**
		 * 全ての行の選択を解除します。
		 */
		unselectAllData: function() {
			this._converter.unselectAllData();
		},

		/**
		 * 行の選択状態を取得します。
		 *
		 * @return {boolean} 選択されていれば true、そうでなければ false
		 */
		isSelectedData: function(dataId) {
			if (dataId == null) {
				this.throwError('dataId を指定してください');
			}

			return this._converter.isSelectedData(dataId);
		},

		/**
		 * 選択されているすべての行の dataId を取得します。
		 *
		 * @return {Array.<*>} 選択されているすべての行の dataId の配列
		 */
		getSelectedDataIds: function() {
			return this._converter.getSelectedDataIds();
		},

		/**
		 * ソートします。
		 *
		 * @param {string=} propertyName ソートするプロパティ名（指定しなかった場合はソートの解除）
		 * @param {boolean=} [isDesc=false] ソート順が降順であるか否か（降順の場合 true、デフォルトは false）
		 */
		sort: function(propertyName, isDesc) {
			var msg;

			if (propertyName == null) {

				this._gridLayoutController.beginLoad();
				this._dataSource.changeSearchOptions({});

			} else {
				if (typeof propertyName !== 'string') {
					msg = 'propertyname は string 型を指定してください; propertyName = {0}';
					this.throwError(msg, propertyName);
				}

				if (isDesc != null && typeof isDesc !== 'boolean') {
					msg = 'isDesc は boolean 型を指定してください; isDesc = {0}';
					this.throwError(msg, isDesc);
				}

				if (!this._sortable[propertyName]) {
					msg = 'sortable でない列はソートできません; propertyName = {0}';
					this.throwError(msg, propertyName);
				}

				this._gridLayoutController.beginLoad();

				var order = isDesc ? 'desc' : 'asc';
				this._dataSource.changeSearchOptions({
					sort: [{
						property: propertyName,
						order: order
					}]
				});
			}
		},

		/**
		 * リクエストデータを変更する
		 *
		 * @param {object} requestData リクエストデータ
		 */
		changeRequestData: function(requestData) {
			if (this._params.url == null) {
				var msg = '初期化パラメータに url を設定していない場合はこのメソッドは利用できません';
				this.throwError(msg);
			}

			this._dataSource.setCustomRequestData(requestData);
		},

		/**
		 * 列の幅を変更する
		 *
		 * @param widthKey 変更したい列の widthKey
		 * @param width 列幅
		 */
		setColumnWidth: function(widthKey, width) {
			this._converter.setWidth(widthKey, width);
		},

		/**
		 * rowId からデータオブジェクトを取得します。 キャッシュされていない rowId を指定すると例外を投げます。
		 *
		 * @param {number} rowId 行ID
		 */
		getCachedData: function(rowId) {
			var msg;

			if (rowId == null) {
				this.throwError('rowId を指定してください');
			}
			if (typeof rowId !== 'number') {
				msg = 'rowId には number 型を指定してください; rowId = {0}';
				this.throwError(msg, rowId);
			}
			if (rowId !== Math.floor(rowId)) {
				msg = 'rowId には整数を指定してください; rowId = {0}';
				this.throwError(msg, rowId);
			}
			if (rowId < 0) {
				msg = 'rowId には非負の値を指定してください; rowId = {0}';
				this.throwError(msg, rowId);
			}
			return this._converter.getCachedOriginData(rowId);
		},

		resize: function() {
			this._gridLayoutController.resize();
		},

		getColumns: function() {
			return this._converter.getColumns();
		},

		setColumns: function(columns) {
			this._converter.setColumns(columns);
		},

		editData: function(dataId, propertyName, value) {
			this._converter.editData(dataId, propertyName, value);
		},

		getModified: function() {
			return this._converter.getModified();
		},

		clearModified: function() {
			this._converter.clearModified();
		}
	};

	h5.core.expose(scrollGridController);

})(jQuery);



//---- HorizontalScrollGridController ---- //

(function($) {
	'use strict';

	var COMMON_DEFAULT_INIT_PARAMS = h5.ui.components.datagrid.init.COMMON_DEFAULT_INIT_PARAMS;

	var horizontalScrollGridController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.datagrid.HorizontalScrollGridController
		 */
		__name: 'h5.ui.components.datagrid.HorizontalScrollGridController',


		// --- Property --- //

		_params: null,

		_sortable: null,

		_dataSource: null,

		_converter: null,

		_gridLayoutController: h5.ui.components.datagrid.GridLayoutController,


		// --- Private Method --- //

		_makeGridParams: function(params) {
			return $.extend(true, {}, COMMON_DEFAULT_INIT_PARAMS, {
				headerRows: 0,
				defaultRowHeight: 100
			}, params);
		},


		_validateInitParams: function(params) {

			// 共通のチェック
			h5.ui.components.datagrid.init.validateCommonInitParams(params);

			var msgHeader = '初期パラメータが不正です: ';
			var msg;

			// rows の追加パラメータチェック
			for (var i = 0, len = params.rows.length; i < len; i++) {
				var row = params.rows[i];

				// rows[i].height のチェック
				if (row.height != null) {

					if (typeof row.height !== 'number') {
						msg = 'rows の要素の height は number 型である必要があります; rows[{0}].height = {1}';
						this.throwError(msgHeader + msg, i, row.height);
					}
					if (row.height !== Math.floor(row.height)) {
						msg = 'rows の要素の height は整数である必要があります; rows[{0}].height = {1}';
						this.throwError(msgHeader + msg, i, row.height);
					}
					if (row.height <= 0) {
						msg = 'rows の要素の height は正の数である必要があります; rows[{0}].height = {1}';
						this.throwError(msgHeader + msg, i, row.height);
					}
				}
			}


			// columnWidth
			if (params.columnWidth == null) {
				msg = 'columnWidth は必ず指定してください';
				this.throwError(msgHeader + msg, params.columnWidth);
			}
			if (typeof params.columnWidth !== 'number') {
				msg = 'columnWidth は number 型である必要があります; columnWidth = {0}';
				this.throwError(msgHeader + msg, params.columnWidth);
			}
			if (params.columnWidth !== Math.floor(params.columnWidth)) {
				msg = 'columnWidth は整数である必要があります; columnWidth = {0}';
				this.throwError(msgHeader + msg, params.columnWidth);
			}
			if (params.columnWidth <= 0) {
				msg = 'columnWidth は正の数である必要があります; columnWidth = {0}';
				this.throwError(msgHeader + msg, params.columnWidth);
			}

			// headerRows のチェック
			if (typeof params.headerRows !== 'number') {
				msg = 'headerRows は number 型である必要があります; headerRows = {0}';
				this.throwError(msgHeader + msg, params.headerRows);
			}
			if (params.headerRows !== Math.floor(params.headerRows)) {
				msg = 'headerRows は整数である必要があります; headerRows = {0}';
				this.throwError(msgHeader + msg, params.headerRows);
			}
			if (params.headerRows < 0) {
				msg = 'headerRows は非負の数である必要があります; headerRows = {0}';
				this.throwError(msgHeader + msg, params.headerRows);
			}

		},

		_initializeChildControllers: function() {
			var params = this._params;

			if (params.url != null) {
				this._dataSource = h5.ui.components.virtualScroll.data.createLazyLoadDataSource(params.url,
						params.ajaxSettings, params.requestData);
			} else {
				this._dataSource = h5.ui.components.virtualScroll.data.createLocalDataSource(params.data);
			}

			var idKey = params.idKey;
			var columnWidth = params.columnWidth;
			var defaultRowHeight = params.defaultRowHeight;

			var selector = h5.ui.components.datagrid.createSingleSelector();

			var headerRows = params.headerRows;
			var headerColumns = 1;
			var headerTopLeftCellsHtml = null;
			var headerHeight = 1;
			var headerWidth = params.columnWidth + 1;

			var rows = [];
			var formatters = {};
			var rowsOption = {};

			this._sortable = {};

			for (var i = 0, len = params.rows.length; i < len; i++) {
				var row = params.rows[i];
				rows.push(row.propertyName);

				if (row.formatter != null) {
					var formatter = h5.ui.components.datagrid.init.wrapScrollFormatter(row.formatter);
					formatters[row.propertyName] = formatter;
				}
				var option = {};

				if (row.height != null) {
					option.height = row.height;
				}

				if (row.header != null) {
					option.header = row.header;
				}

				rowsOption[row.propertyName] = option;

				// height 計算
				var height = (row.height != null) ? row.height : params.defaultRowHeight;

				if (i < headerRows) {
					headerHeight += height;
				}
			}

			this._converter = h5.ui.components.datagrid.createGridHorizontalDataConverter({
				dataSource: this._dataSource,
				idKey: idKey,
				rows: rows,
				defaultRowHeight: defaultRowHeight,
				defaultColumnWidth: columnWidth,
				selector: selector,
				rowsOption: rowsOption
			});

			var defaultFormatter = h5.ui.components.datagrid.init.wrapScrollFormatter(params.defaultFormatter);

			var vStrategy;
			if (params.verticalScrollStrategy === 'pixel') {
				vStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				vStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}

			var hStrategy;
			if (params.horizontalScrollStrategy === 'pixel') {
				hStrategy = h5.ui.components.virtualScroll.createPixelBaseScrollStrategy();
			} else {
				hStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();
			}

			var that = this;

			return this.readyPromise.then(function() {
				return that._gridLayoutController.readyPromise;
			}).then(function() {

				var promise = that._gridLayoutController.init({
					defaultFormatter: defaultFormatter,
					formatters: formatters,
					converter: that._converter,
					verticalScrollStrategy: vStrategy,
					horizontalScrollStrategy: hStrategy,
					headerRows: headerRows,
					headerColumns: headerColumns,
					headerTopLeftCellsHtml: headerTopLeftCellsHtml,
					headerHeight: headerHeight,
					headerWidth: headerWidth
				});

				that._dataSource.changeSearchOptions({});

				return promise;
			});
		},


		// --- Life Cycle Method --- //

		__ready: function() {
			return this._gridLayoutController.readyPromise;
		},


		__dispose: function() {
			$(this.rootElement).remove();
		},


		// --- Event Handler --- //


		// --- Public Method --- //

		init: function(initParams) {
			var that = this;

			return this.initPromise.then(function() {

				// デフォルト値のセット + HTML の解釈
				var params = that._makeGridParams(initParams);

				// パラメータチェック
				that._validateInitParams(params);

				// パラメータのセット
				that._params = params;

				// 子コントローラの初期化
				return that._initializeChildControllers();
			});
		},

		/**
		 * リクエストデータを変更する
		 *
		 * @param {object} requestData リクエストデータ
		 */
		changeRequestData: function(requestData) {
			if (this._params.url == null) {
				var msg = '初期化パラメータに url を設定していない場合はこのメソッドは利用できません';
				this.throwError(msg);
			}

			this._dataSource.setCustomRequestData(requestData);
		},


		resize: function() {
			this._gridLayoutController.resize();
		},

		getRows: function() {
			return this._converter.getRows();
		},

		setRows: function(rows) {
			this._converter.setRows(rows);
		},

		editData: function(dataId, propertyName, value) {
			this._converter.editData(dataId, propertyName, value);
		},

		getModified: function() {
			return this._converter.getModified();
		},

		clearModified: function() {
			this._converter.clearModified();
		}
	};

	h5.core.expose(horizontalScrollGridController);

})(jQuery);