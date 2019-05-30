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

/*jshint jquery: true, forin: false */
/*global h5 */

// ---- EventDispatcher ---- //
(function($) {
	'use strict';

	function EventDispatcher() {
	// コンストラクタ
	}

	EventDispatcher.prototype.hasEventListener = function(type, listener) {
		if (!this.__listeners) {
			return false;
		}
		var l = this.__listeners[type];
		if (!l || !this.__listeners.hasOwnProperty(type)) {
			return false;
		}

		for (var i = 0, count = l.length; i < count; i++) {
			if (l[i] === listener) {
				return true;
			}
		}
		return false;
	};

	EventDispatcher.prototype.addEventListener = function(type, listener) {
		// 引数チェック
		if (arguments.length !== 2 || typeof type !== 'string' || !$.isFunction(listener)) {
			throw new Error('不正な引数です');
		}
		if (this.hasEventListener(type, listener)) {
			return;
		}

		if (!this.__listeners) {
			this.__listeners = {};
		}

		if (!(this.__listeners.hasOwnProperty(type))) {
			this.__listeners[type] = [];
		}

		this.__listeners[type].push(listener);
	};

	EventDispatcher.prototype.removeEventListener = function(type, listener) {
		if (!this.hasEventListener(type, listener)) {
			return;
		}

		var l = this.__listeners[type];

		for (var i = 0, count = l.length; i < count; i++) {
			if (l[i] === listener) {
				l.splice(i, 1);
				return;
			}
		}
	};

	EventDispatcher.prototype.dispatchEvent = function(event) {
		if (!this.__listeners) {
			return;
		}

		var l = this.__listeners[event.type];
		if (!l) {
			return;
		}

		if (!event.target) {
			event.target = this;
		}

		var isDefaultPrevented = false;

		event.preventDefault = function() {
			isDefaultPrevented = true;
		};

		for (var i = 0, count = l.length; i < count; i++) {
			l[i].call(event.target, event);
		}

		return isDefaultPrevented;
	};

	EventDispatcher.prototype.clearEventListeners = function() {
		this.__listeners = null;
	};

	h5.u.obj.expose('h5.ui.components.virtualScroll.data', {

		/**
		 * @memberOf h5.ui.components.virtualScroll.data
		 */
		EventDispatcher: EventDispatcher
	});

})(jQuery);



// ----- DataSource ----- //
(function($) {
	'use strict';

	// ---- Cache ---- //

	var format = h5.u.str.format;

	var EventDispatcher = h5.ui.components.virtualScroll.data.EventDispatcher;


	// ---- Function ---- //

	var convertRange = function(start, end, totalLength) {
		var msg;
		if (start != null && typeof start !== 'number') {
			msg = '不正な引数です; start には number 型を指定してください';
			throw new Error(msg);
		}
		if (end != null && typeof end !== 'number') {
			msg = '不正な引数です; end には number 型を指定してください';
			throw new Error(msg);
		}

		var startValue = start;
		var endValue = end;

		if (totalLength == null) {
			return {
				start: 0,
				end: 0
			};
		}

		if (startValue == null) {
			startValue = 0;
		} else if (startValue < -totalLength) {
			startValue = 0;
		} else if (startValue < 0) {
			startValue = startValue + totalLength;
		}

		if (endValue == null) {
			endValue = totalLength;
		} else if (endValue < -totalLength) {
			endValue = 0;
		} else if (endValue < 0) {
			endValue = endValue + totalLength;
		}

		return {
			start: startValue,
			end: endValue
		};
	};


	// ---- LocalDataSource ---- //

	var LocalDataSource = function(baseData) {
		this.setBaseData(baseData);
	};

	$.extend(LocalDataSource.prototype, new EventDispatcher(), {

		// --- Property --- //

		_baseData: null,

		_searched: null,

		_searchOptions: null,

		_filters: null,

		_isReady: true,


		// --- Private Method --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.data.LocalDataSource
		 */
		_search: function() {
			if (!this._searchOptions) {
				this._searched = this._baseData;
				return;
			}


			var searched = this._searched = [];

			var filterOptions = this._searchOptions.filter || {};

			var len = this._baseData.length;

			for (var i = 0; i < len; i += 1) {

				var data = this._baseData[i];

				var skip = false;

				for ( var name in filterOptions) {
					var filterFunc = this._filters[name];
					if (filterFunc == null) {
						var msg = format('マッチする filter が存在しません; filterName = {0}', name);
						throw new Error(msg);
					}
					if (!filterFunc(filterOptions[name], data)) {
						skip = true;
						break;
					}
				}

				if (!skip) {
					searched.push(data);
				}
			}

			var sorts = this._searchOptions.sort;

			if (!sorts) {
				return;
			}

			searched.sort(function(x, y) {
				var len = sorts.length;

				for (var i = 0; i < len; i += 1) {
					var property = sorts[i].property;
					var isDesc = sorts[i].order === 'desc';

					if (x[property] < y[property]) {
						return isDesc ? 1 : -1;
					}
					if (y[property] < x[property]) {
						return isDesc ? -1 : 1;
					}
				}
				return 0;
			});
		},


		// --- Public Method --- //

		getBaseData: function() {
			return this._baseData.slice();
		},

		/**
		 * 使用するデータのリストを設定する。検索を行い、データが変更されたことを示すchangeSourceイベントをあげる。
		 *
		 * @param {Array} 使用するデータのリスト
		 * @memberOf h5.ui.components.virtualScroll.data.LocalDataSource
		 */
		setBaseData: function(baseData) {
			if (!$.isArray(baseData)) {
				var msg = format('不正な引数です; baseData = {0}', baseData);
				throw new Error(msg);
			}

			this._baseData = baseData.slice();

			this._search();
			this.dispatchEvent({
				type: 'changeSource'
			});
		},

		/**
		 * 検索条件を指定する。検索条件をセットすると、新たに検索を行い、データが変更されたことを示すchangeSourceイベントをあげる。
		 *
		 * @param {Object} searchOptions 検索条件<br>
		 * @param {Object} [searchOptions.filter] 絞込条件。絞込を行うためのキーをプロパティ名とし、そのときに使用する値をvalueとする。
		 * @param {Array} [searchOptions.sort]
		 *            ソート条件。配列内のオブジェクトは、ソート項目を指定するpropertyと、昇順、降順を表すorderを持つ。ソートは配列の前から順番に行われる。
		 * @memberOf h5.ui.components.virtualScroll.data.LocalDataSource
		 */
		changeSearchOptions: function(searchOptions) {
			if (searchOptions != null && !$.isPlainObject(searchOptions)) {
				var msg = '不正な引数です; searchOptions には object 型を指定してください';
				throw new Error(msg);
			}

			this._searchOptions = searchOptions;
			this._search();
			this.dispatchEvent({
				type: 'changeSource'
			});
		},

		getSearchOptions: function() {
			return $.extend(true, {}, this._searchOptions);
		},

		/**
		 * 絞込関数を登録する。searchOptionで指定したfilterのプロパティ名で、ここで登録した関数を使用して絞込を行う。
		 *
		 * @param {String} key 絞込のキー
		 * @param {Function} filterFunction
		 *            絞込関数。引数にsearchOptionのfilterで指定した値と、各行のデータを持つ。booleanを返し、trueの場合、絞込にマッチしたとする。
		 * @memberOf h5.ui.components.virtualScroll.data.LocalDataSource
		 */
		setFilterFunction: function(key, filterFunction) {

			// 引数チェック
			if (key == null) {
				throw new Error('不正な引数です; key は必ず指定してください');
			}
			if (typeof key !== 'string') {
				throw new Error('不正な引数です; key には string 型を指定してください');
			}
			if (filterFunction == null) {
				throw new Error('不正な引数です; filterFunction は必ず指定してください');
			}
			if (!$.isFunction(filterFunction)) {
				throw new Error('不正な引数です; filterFunction には function 型を指定してください');
			}

			// 関数の実装
			if (this._filters === null) {
				this._filters = {};
			}

			this._filters[key] = filterFunction;
		},

		/**
		 * 検索結果の総件数を返す
		 *
		 * @returns {Number} 検索結果の総件数
		 */
		getTotalLength: function() {
			return this._searched.length;
		},

		/**
		 * 指定した範囲内のデータがキャッシュされているかを返す。
		 *
		 * @param start 開始インデックス
		 * @param end 終了インデックス
		 * @returns {Boolean} キャッシュされているか否か
		 */
		isCached: function(start, end) {
			var range = convertRange(start, end, this.getTotalLength());

			if (range.end <= range.start) {
				return true;
			}
			if (this.getTotalLength() < range.end) {
				return false;
			}
			return true;
		},

		/**
		 * 指定した範囲のデータを非同期に取得する。
		 *
		 * @param {Number} start 開始インデックス
		 * @param {Number} end 終了インデックス
		 * @returns {Object} Promiseオブジェクト。resolve時に、取得した結果のリストを渡す。
		 */
		sliceAsync: function(start, end) {
			var range = convertRange(start, end, this.getTotalLength());

			var deferred = h5.async.deferred();

			var sliced = this._searched.slice(range.start, range.end);
			deferred.resolve(sliced);

			return deferred.promise();
		},

		/**
		 * 指定した範囲のデータを同期的に取得する。 cache に入っていない範囲を含む場合は例外を投げる。
		 *
		 * @param {Number} start 開始インデックス
		 * @param {Number} end 終了インデックス
		 * @returns {Object[]} 取得した結果のリスト
		 */
		sliceCachedData: function(start, end) {
			var range = convertRange(start, end, this.getTotalLength());

			if (!this.isCached(range.start, range.end)) {
				var msg = '指定した範囲にキャッシュされていないデータが含まれています; start = {0}, end = {1}';

				throw new Error(format(msg, start, end));
			}

			return this._searched.slice(range.start, range.end);
		},

		/**
		 * 指定したインデックスのデータを同期的に取得する。 cache に入っていない場合は例外を投げる。
		 *
		 * @param {Number} index インデックス
		 * @returns {Object} 取得したデータ
		 */
		getCachedData: function(index) {
			var msg;

			if (index == null) {
				msg = '不正な引数です; index は必ず指定してください';
				throw new Error(msg);
			}
			if (typeof index !== 'number') {
				msg = '不正な引数です; index には number 型を指定してください';
				throw new Error(msg);
			}
			if (Math.floor(index) !== index) {
				msg = '不正な引数です; index には整数を指定してください';
				throw new Error(msg);
			}
			if (index < 0) {
				msg = '不正な引数です; index には非負の値を指定してください';
				throw new Error(msg);
			}
			if (this.getTotalLength() <= index) {
				msg = '不正な引数です; index には totalLength 未満の値を指定してください';
				throw new Error(msg);
			}

			return this._searched[index];
		},

		/**
		 * 利用可能となったかを返す。
		 *
		 * @returns {boolean} 利用可能となったか
		 */
		isReady: function() {
			return this._isReady;
		},

		/**
		 * 廃棄する。
		 */
		dispose: function() {
			this.clearEventListeners();

			for ( var key in this) {
				if (this.hasOwnProperty(key)) {
					this[key] = null;
				}
			}
		}

	});


	// ---- LazyLoadDataSource ---- //

	var LAZY_LOAD_DEFAULT_AJAX_SETTING = {
		dataType: 'json'
	};

	var LAZY_LOAD_DEFUALT_NUM_PER_PAGE = 50;

	var LazyLoadDataSource = function(url, ajaxSettings, customRequestData) {
		var msg;

		if (url == null) {
			msg = '不正な引数です; url は必ず指定してください';
			throw new Error(msg);
		}

		this._url = url;
		this._ajaxSettings = $.extend({}, ajaxSettings);
		this._customRequestData = customRequestData;
		this._cachedData = {};
	};

	$.extend(LazyLoadDataSource.prototype, new EventDispatcher(), {

		/**
		 * @memberOf h5.ui.components.virtualScroll.data.lazyLoadDataSource
		 */
		__name: 'h5.ui.components.virtualScroll.data.lazyLoadDataSource',

		// --- Property --- //

		_url: null,

		_ajaxSettings: null,

		_postData: null,

		_customRequestData: null,


		// TODO: 最適化の余地あり
		// キャッシュデータは、実データと、自分より大きいインデックスで、確実にキャッシュされているインデックスを覚えている
		_cachedData: null,

		_totalLength: 0,

		_searchOptions: null,

		_isFirstLoad: true,

		_numPerPage: LAZY_LOAD_DEFUALT_NUM_PER_PAGE,

		_isActive: true,

		_isReady: false,


		// --- Private Method --- //

		_search: function(start, end) {
			var that = this;

			var startPage = Math.floor(start / this._numPerPage);
			var endPage = Math.floor((end - 1) / this._numPerPage) + 1;

			var startIndex = startPage * this._numPerPage;
			var endIndex = endPage * this._numPerPage;

			var sortData = this._getSortData();

			var requestData = $.extend({}, this._customRequestData, {
				start: startIndex,
				end: endIndex,
				requireTotalCount: this._isFirstLoad
			}, sortData, this._postData);

			var settings = $.extend({}, LAZY_LOAD_DEFAULT_AJAX_SETTING, this._ajaxSettings, {
				data: requestData
			});


			return h5.ajax(this._url, settings).then(function(result) {

				// Active でないときは reject する
				if (!that._isActive) {
					var rejectedDeferred = h5.async.deferred();
					rejectedDeferred.reject('DataSource is not Active');
					return rejectedDeferred.promise();
				}

				that._addToCache(result.list, startIndex);

				if (that._isFirstLoad) {
					that._isFirstLoad = false;
					that._totalLength = result.totalCount;
					that._isReady = true;
					that.dispatchEvent({
						type: 'changeSource'
					});
				}
			});
		},

		_addToCache: function(list, startIndex) {
			var len = list.length;
			if (len === 0) {
				return;
			}
			var lastIndex = startIndex + len - 1;

			var preData = this._cachedData[startIndex - 1];
			if (preData) {
				preData.cachedIndex = lastIndex;
			}

			// 確実にキャッシュしているデータのindexを覚えさせおく
			for (var i = 0; i < len; i++) {
				var record = list[i];
				this._cachedData[i + startIndex] = {
					record: record,
					cachedIndex: lastIndex
				};
			}
		},

		// TODO: 最適化の余地あり
		_getCachedData: function(start, end) {
			var list = [];
			for (var i = start; i < end; i++) {
				var cache = this._cachedData[i];
				if (cache != null) {
					list.push(cache.record);
				}
			}
			return list;
		},

		_getSortData: function() {
			if (this._searchOptions == null) {
				return null;
			}
			if (this._searchOptions.sort == null) {
				return null;
			}

			var sortArray = this._searchOptions.sort;
			var sortLen = sortArray.length;
			if (sortLen === 0) {
				return null;
			}

			var ret = [];
			for (var i = 0; i < sortLen; i++) {
				var sort = sortArray[i];
				ret.push({
					sortKey: sort.property,
					sortOrder: sort.order
				});
			}
			if (sortLen === 1) {
				return ret[0];
			}
			return ret;
		},

		_setFilter: function(filter) {
			this._postData = filter;
		},

		_resetCache: function() {
			this._isFirstLoad = true;
			this._cachedData = {};
			this._search(0, 1);
		},

		// --- Public Method --- //

		/**
		 * 検索条件を指定する。検索条件をセットすると、新たに検索を行う。
		 *
		 * @param {Object} searchOptions 検索条件<br>
		 * @param {Object} [searchOptions.filter] 絞込条件。絞込を行うためのキーをプロパティ名とし、そのときに使用する値をvalueとする。
		 * @param {Array} [searchOptions.sort]
		 *            ソート条件。配列内のオブジェクトは、ソート項目を指定するpropertyと、昇順、降順を表すorderを持つ。ソートは配列の前から順番に行われる。
		 */
		changeSearchOptions: function(searchOptions) {
			var msg;
			if (searchOptions != null && !$.isPlainObject(searchOptions)) {
				msg = '不正な引数です; searchOptions には object 型を指定してください';
				throw new Error(msg);
			}

			this._searchOptions = searchOptions;
			if (searchOptions == null) {
				this._searchOptions = {};
			}

			if (this._searchOptions.cachePageSize != null) {
				var cachePageSize = this._searchOptions.cachePageSize;
				if (typeof cachePageSize !== 'number') {
					msg = '不正な引数です; searchOptions.cachePageSize には number 型を指定してください';
					throw new Error(msg);
				}
				if (Math.floor(cachePageSize) !== cachePageSize) {
					msg = '不正な引数です; searchOptions.cachePageSize には整数を指定してください';
					throw new Error(msg);
				}
				if (cachePageSize < 0) {
					msg = '不正な引数です; searchOptions.cachePageSize には正の数を指定してください';
					throw new Error(msg);
				}
				this._numPerPage = this._searchOptions.cachePageSize;
			} else {
				this._numPerPage = LAZY_LOAD_DEFUALT_NUM_PER_PAGE;
			}

			this._setFilter(this._searchOptions.filter);

			this._resetCache();
		},

		getSearchOptions: function() {
			return $.extend(true, {}, this._searchOptions);
		},

		setAjaxSettings: function(ajaxSettings) {
			if (ajaxSettings != null && !$.isPlainObject(ajaxSettings)) {
				var msg = '不正な引数です; ajaxSettings には object 型を指定してください';
				throw new Error(msg);
			}

			this._ajaxSettings = ajaxSettings;
			this._resetCache();
		},

		setCustomRequestData: function(customRequestData) {
			if (customRequestData != null && !$.isPlainObject(customRequestData)) {
				var msg = '不正な引数です; customRequestData には object 型を指定してください';
				throw new Error(msg);
			}

			this._customRequestData = customRequestData;
			this._resetCache();
		},

		/**
		 * 検索結果の総件数を返す
		 *
		 * @returns {Number} 検索結果の総件数
		 */
		getTotalLength: function() {
			return this._totalLength;
		},

		/**
		 * 指定した範囲内のデータがキャッシュされているかを返す。
		 *
		 * @param start 開始インデックス
		 * @param end 終了インデックス
		 * @returns {Boolean} キャッシュされているか否か
		 */
		isCached: function(start, end) {
			var range = convertRange(start, end, this._totalLength);

			if (range.end <= range.start) {
				return true;
			}

			var startData = this._cachedData[range.start];
			if (!startData) {
				return false;
			}
			// cachedIndexまでは必ずデータがキャッシュされている
			var cachedIndex = startData.cachedIndex;
			while (cachedIndex < range.end - 1) {
				var data = this._cachedData[cachedIndex];
				if (data.cachedIndex === cachedIndex) {
					// 自分のインデックスを指しているときは、それ以上のデータは存在しない
					return false;
				}
				cachedIndex = data.cachedIndex;
			}
			// endより先のインデックスを指すデータがあるので、start～end-1までキャッシュされている
			return true;
		},

		/**
		 * 指定した範囲のデータを非同期に取得する。
		 *
		 * @param {Number} start 開始インデックス
		 * @param {Number} end 終了インデックス
		 * @returns {Object} Promiseオブジェクト。resolve時に、取得した結果のリストを渡す。
		 */
		sliceAsync: function(start, end) {
			var range = convertRange(start, end, this._totalLength);

			var deferred = h5.async.deferred();

			if (this.isCached(range.start, range.end)) {
				deferred.resolve(this._getCachedData(range.start, range.end));
				return deferred.promise();
			}

			var that = this;
			this._search(range.start, range.end).done(function() {
				deferred.resolve(that._getCachedData(range.start, range.end));
			}).fail(function(jqXHR, textStatus, errorThrown) {
				deferred.reject(jqXHR, textStatus, errorThrown);
			});

			return deferred.promise();
		},

		/**
		 * 指定した範囲のデータを同期的に取得する。 cache に入っていない範囲を含む場合は例外を投げる。
		 *
		 * @param {Number} start 開始インデックス
		 * @param {Number} end 終了インデックス
		 * @returns {Object[]} 取得した結果のリスト
		 */
		sliceCachedData: function(start, end) {
			var range = convertRange(start, end, this._totalLength);

			if (!this.isCached(range.start, range.end)) {
				var msg = '指定した範囲にキャッシュされていないデータが含まれています; start = {0}, end = {1}';

				throw new Error(format(msg, start, end));
			}

			return this._getCachedData(range.start, range.end);
		},

		/**
		 * 指定したインデックスのデータを同期的に取得する。 cache に入っていない場合は例外を投げる。
		 *
		 * @param {Number} index インデックス
		 * @returns {Object} 取得したデータ
		 */
		getCachedData: function(index) {
			var msg;

			if (index == null) {
				msg = '不正な引数です; index は必ず指定してください';
				throw new Error(msg);
			}
			if (typeof index !== 'number') {
				msg = '不正な引数です; index には number 型を指定してください';
				throw new Error(msg);
			}
			if (Math.floor(index) !== index) {
				msg = '不正な引数です; index には整数を指定してください';
				throw new Error(msg);
			}
			if (index < 0) {
				msg = '不正な引数です; index には非負の値を指定してください';
				throw new Error(msg);
			}
			if (this.getTotalLength() <= index) {
				msg = '不正な引数です; index には totalLength 未満の値を指定してください';
				throw new Error(msg);
			}

			if (!this.isCached(index, index + 1)) {
				msg = '指定したインデックスのデータはキャッシュされていません; index = {0}';
				throw new Error(msg, index);
			}
			return this._getCachedData(index, index + 1)[0];
		},

		/**
		 * 利用可能となったかを返す。
		 *
		 * @returns {boolean} 利用可能となったか
		 */
		isReady: function() {
			return this._isReady;
		},

		/**
		 * 登録したイベントハンドラをクリアして破棄できるようにする。
		 */
		dispose: function() {
			this.clearEventListeners();

			for ( var key in this) {
				if (this.hasOwnProperty(key)) {
					this[key] = null;
				}
			}

			this._isActive = false;
		}

	});


	// ---- Expose ---- //

	var createLocalDataSource = function(baseData) {
		return new LocalDataSource(baseData);
	};

	var createLazyLoadDataSource = function(url, ajaxSettings, customRequestData) {
		return new LazyLoadDataSource(url, ajaxSettings, customRequestData);
	};

	h5.u.obj.expose('h5.ui.components.virtualScroll.data', {

		/**
		 * @memberOf h5.ui.components.virtualScroll.data
		 */
		createLocalDataSource: createLocalDataSource,

		/**
		 * 遅延取得するデータソースを生成する。指定した範囲のデータをサーバから取得する。
		 * 取得したデータはローカルにキャッシュし、取得しようとしたデータがキャッシュされていれば、サーバには通信を行わず、ローカルのデータを使用する。
		 * サーバからの取得は、実際には、指定データに前後の余裕を持たせた分だけ取得を行う。
		 *
		 * @memberOf h5.ui.components.virtualScroll.data
		 */
		createLazyLoadDataSource: createLazyLoadDataSource
	});

})(jQuery);