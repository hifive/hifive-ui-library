/*
 * Copyright (C) 2012-2015 NS Solutions Corporation
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
(function($) {

	var LINE_ELM_ID_FORMAT = 'line_{0}';
	var RECT_ELM_ID_FORMAT = 'rect_{0}_{1}';
	var PIE_ELM_ID_FORMAT = 'pie_{0}_{1}';

	var VERT_LINE_ELM_ID_FORMAT = 'vert_line_{0}';
	var X_LABEL_ELM_ID_FORMAT = 'x_label_{0}';

	var TOOLTIP_TIME_FORMAT = '{0}-{1}';
	var TOOLTIP_OPEN_CLOSE_FORMAT = 'Open/Close= {0}/{1}';
	var TOOLTIP_HIGH_LOW_FORMAT = 'High/Low= {0}/{1}';

	var PATH_LINE_FORMAT = 'L {0} {1} ';

	var CHARACTER_HEIGHT = 11; // テキスト要素は下に位置を合わせるため、上に位置を合わせるときにこの定数を足す

	/** X軸のラベル領域のデフォルトの高さ */
	var DEFAULT_X_LABEL_HEIGHT = 32;
	/** Y軸のラベル領域のデフォルトの幅 */
	var DEFAULT_Y_LABEL_WIDTH = 120;

	/** Y軸のラベルのマージンのデフォルト */
	var DEFAULT_Y_LABEL_MARGIN_RIGHT = 5;
	var DEFAULT_Y_LABEL_MARGIN_LEFT = 0;

	/** X軸のラベルのマージンのデフォルト */
	var DEFAULT_X_LABEL_MARGIN_TOP = 0;
	var DEFAULT_X_LABEL_MARGIN_BOTTOM = 0;

	/** チャートのマージンのデフォルト */
	var DEFAULT_CHART_MARGIN_TOP = 10;
	var DEFAULT_CHART_MARGIN_BOTTOM = 0;
	var DEFAULT_CHART_MARGIN_LEFT = 0;
	var DEFAULT_CHART_MARGIN_RIGHT = 0;

	var TOOLTIP_MARGIN = {
		TOP: 10,
		LEFT: 10
	};

	// ツールチップのpaddingのデフォルト値
	var DEFAULT_TOOLTIP_PADDING_TOP = 5;
	var DEFAULT_TOOLTIP_PADDING_BOTTOM = 5;
	var DEFAULT_TOOLTIP_PADDING_LEFT = 8;
	var DEFAULT_TOOLTIP_PADDING_RIGHT = 8;

	var SERIES_PREFIX = '_series';

	var STACKED_CHART_TYPES = ['stacked_line', 'stacked_bar'];


	// 変数のインポート
	var h5format = h5.u.str.format;
	var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
			|| function(func) {
				window.setTimeout(func, 15);
			};

	var graphicRenderer = h5.ui.components.chart.GraphicRenderer;

	var chartDataModelManager = h5.core.data.createManager('ChartDataManager');

	/**
	 * chartの設定に関するデータアイテム
	 */
	var chartSettingsSchema = {

		rangeMin: {
			type: 'number'
		},
		rangeMax: {
			type: 'number'
		},

		/**
		 * y軸の最小値
		 */
		minVal: {
			type: 'number',
			defaultValue: Infinity
		},
		/**
		 * y軸の最大値
		 */
		maxVal: {
			type: 'number',
			defaultValue: -Infinity
		},
		/**
		 * candleの中心のx軸方向の間隔
		 */
		dx: {
			depend: {
				on: ['dispDataSize', 'width'],
				calc: function() {
					return this.get('width') / this.get('dispDataSize');
				}
			}
		},
		dispDataSize: {
			type: 'integer'
		},
		vertLineNum: {
			type: 'integer'
		},
		horizLineNum: {
			type: 'integer'
		},
		keepDataSize: {
			type: 'integer'
		},

		movedNum: {
			type: 'integer',
			defaultValue: 0
		},

		/**
		 * 描画領域の高さ
		 */
		height: {
			type: 'number'
		},
		/**
		 * 描画領域の幅
		 */
		width: {
			type: 'number'
		},

		translateX: {
			defalutValue: 0
		},

		timeInterval: {
			type: 'integer'
		},
		/**
		 * 補助線の色
		 */
		additionalLineColor: {
			type: 'string'
		}
	};


	// DataSourceから発生するイベント内で持つ更新情報のプロパティ名
	var EVENT_PROP_NAMES = ['add', 'remove', 'change'];

	/**
	 * グループ内でのY座標の位置を計算します
	 * 
	 * @param val 値
	 * @param rangeMin 領域の最小値
	 * @param rangeMax 領域の最大値
	 * @param height Y軸の高さ
	 * @returns {Number} 値が対応するY座標
	 */
	function calcYPos(val, rangeMin, rangeMax, height) {
		return -(val * 1000 - rangeMin * 1000) / (rangeMax * 1000 - rangeMin * 1000) * height
				+ height;
	}

	/**
	 * ２つの値からグループ内でのY座標の位置の差を計算します
	 * 
	 * @param val1 値1
	 * @param val2 値2
	 * @param rangeMin 領域の最小値
	 * @param rangeMax 領域の最大値
	 * @param height Y軸の高さ
	 * @returns {Number} Y座標の位置の差
	 */
	function calcYDiff(val1, val2, rangeMin, rangeMax, height) {
		return Math.abs(val1 * 1000 - val2 * 1000) / (rangeMax * 1000 - rangeMin * 1000) * height;
	}

	function sortById(items) {
		var ret = [];
		for (var i = 0, iLen = items.length; i < iLen; i++) {
			var item = items[i];
			var id = item.get('id');
			var inserted = false;
			for (var j = 0, jLen = ret.length; j < jLen; j++) {
				if (id < ret[j].get('id')) {
					ret.splice(j, 0, item);
					inserted = true;
					break;
				}
			}
			if (!inserted) {
				ret.push(item);
			}
		}
		return ret;
	}

	/**
	 * 指定したマージンの値を取得します
	 * 
	 * @param {Object} obj マージンのプロパティを持つオブジェクト
	 * @param {String} type margin/paddingのいずれか
	 * @param {String} prop Top/Bottom/Left/Rightのいずれか
	 * @returns マージンの値
	 */
	function getMarginOrPadding(obj, type, prop) {
		if (obj == null) {
			return null;
		}
		if (obj[type + prop] != null) {
			return obj[type + prop];
		}

		return obj[type] || null;
	}

	/**
	 * コンテキストを自分自身にした関数を取得します
	 * 
	 * @param {Function} func 関数
	 * @returns コンテキストを自分自身にした関数
	 */
	function own(func) {
		var that = this;
		return function(/* var_args */) {
			return func.apply(that, arguments);
		};
	}


	/**
	 * データソースを管理するクラス
	 * 
	 * @class
	 * @name DataSourceManager
	 */
	function DataSourceManager() {
		this._count = 0;
		this._map = {};

		for ( var modelName in chartDataModelManager.models) {
			chartDataModelManager.dropModel(modelName);
		}

		this._isInUpdate = false;
		this._updateLog = {};
	}

	DataSourceManager.prototype = {
		/**
		 * コンテキストを自分自身にした関数を取得します
		 * 
		 * @param {Function} func 関数
		 * @returns {Function} コンテキストを自分自身にした関数
		 * @memberOf DataSourceManager
		 */
		own: own,

		/**
		 * データソースの一覧を取得します
		 * 
		 * @returns {Object} データソースの一覧
		 * @memberOf DataSourceManager
		 */
		getAllDataSources: function() {
			return this._map;
		},

		/**
		 * 積み上げた値を取得します
		 * 
		 * @param {Number} id 積み上げるデータのID
		 * @param {Number} yProp y軸方向のデータのオブジェクト内のプロパティ名
		 * @param {Number} number 所属する系列の番号
		 * @returns {Object} idと積み上げた値を持つオブジェクト
		 * @memberOf DataSourceManager
		 */
		getStackedData: function(id, yProp, number) {
			var stackedVal = 0;
			for ( var name in this._map) {
				var dataSource = this._map[name];
				if (dataSource.number < number) {
					stackedVal += dataSource.get(id)[yProp];
				}
			}

			var ret = {};
			ret.id = id;
			ret[yProp] = stackedVal;
			return ret;
		},

		/**
		 * データソースを生成します
		 * 
		 * @param {Object} seriesSetting 系列の設定情報
		 * @returns {DataSource} データソース
		 * @memberOf DataSourceManager
		 */
		createDataSource: function(seriesSetting) {
			var name = seriesSetting.name;
			var dataSource = new DataSource(name, this._count, seriesSetting.keepDataSize);
			dataSource.manager = this;
			dataSource.addEventListener('dataChange', this.own(this._addUpdateEventListener));
			this._map[name] = dataSource;
			this._count++;
			return dataSource;
		},

		/**
		 * データソースを削除します
		 * 
		 * @param {String} name 削除するデータソースの系列名
		 * @returns {DataSource} データソース
		 * @memberOf DataSourceManager
		 */
		removeDataSource: function(name) {
			delete this._map[name];
		},

		/**
		 * データソースを取得します
		 * 
		 * @param {String} name 取得するデータソースの系列名
		 * @returns {DataSource} データソース
		 * @memberOf DataSourceManager
		 */
		getDataSource: function(name) {
			return this._map[name];
		},

		/**
		 * 描画範囲内の最大値と最小値を取得します
		 * 
		 * @param {Number} rightEndId 描画範囲の右端のID
		 * @param {Number} dispDataSize 表示数
		 * @returns {Object} [obj] {Number} [obj.maxVal] 最大値 {Number} [obj.minVal] 最小値
		 * @memberOf DataSourceManager
		 */
		getMaxAndMinVals: function(rightEndId, dispDataSize) {
			var dataSources = this._map;

			var maxAndMinVals = {
				maxVal: -Infinity,
				minVal: Infinity
			};
			for ( var name in dataSources) {
				var vals = dataSources[name].getMaxAndMinVals(rightEndId, dispDataSize);
				maxAndMinVals = {
					maxVal: Math.max(vals.maxVal, maxAndMinVals.maxVal),
					minVal: Math.min(vals.minVal, maxAndMinVals.minVal)
				};
			}
			return maxAndMinVals;
		},

		/**
		 * アップデートセッションを開始します
		 * 
		 * @memberOf DataSourceManager
		 */
		beginUpdate: function() {
			this._isInUpdate = true;
		},

		/**
		 * アップデートセッション中にアップデートイベントを登録する
		 * 
		 * @param {Event} イベントオブジェクト
		 * @memberOf DataSourceManager
		 */
		_addUpdateEventListener: function(ev) {
			if (!this._isInUpdate) {
				return;
			}

			if (!this._updateLog[ev.target.name]) {
				this._updateLog[ev.target.name] = {
					type: 'dataChange',
					target: ev.target
				};
			}
			for (var i = 0, len = EVENT_PROP_NAMES.length; i < len; i++) {
				var type = EVENT_PROP_NAMES[i];
				if (!this._updateLog[ev.target.name][type]) {
					this._updateLog[ev.target.name][type] = [];
				}
				var data = ev[type];
				for (var i = 0, len = data.length; i < len; i++) {
					this._updateLog[ev.target.name][type].push(data[i]);
				}
			}
			ev.stopImmediatePropagation();
		},

		/**
		 * アップデートセッション中であるかを返します
		 * 
		 * @memberOf DataSourceManager
		 * @returns {Boolean} アップデートセッション中であるか
		 */
		isInUpdate: function() {
			return this._isInUpdate;
		},

		/**
		 * アップデートセッション中に起こったイベントを一斉に発火します
		 * 
		 * @memberOf DataSourceManager
		 */
		endUpdate: function() {
			if (!this._isInUpdate) {
				return;
			}

			this._isInUpdate = false;

			for ( var name in this._updateLog) {
				this._map[name].dispatchEvent(this._updateLog[name]);
			}

			this._updateLog = {};
		}
	};

	/**
	 * データソース
	 * 
	 * @param {String} name 系列名
	 * @param {Number} number 系列にシーケンシャルに渡される番号
	 * @param {Number} maxSize データソースが保存する最大データ数
	 * @class DataSource
	 */
	function DataSource(name, number, maxSize) {
		this.name = name;
		this.number = number;
		this._maxSize = maxSize;
		this.dataMap = {};
		this.length = 0;
		this.sequence = 0;
	}

	DataSource.prototype = {
		/**
		 * コンテキストを自分自身にした関数を取得します
		 * 
		 * @memberOf DataSource
		 * @param {Function} func 関数
		 * @returns {Function} コンテキストを自分自身にした関数
		 */
		own: own,

		/**
		 * データを読み込む。系列の設定で指定されている場合はそれを利用します
		 * 
		 * @param series {Object} 系列の設定オブジェクト
		 * @memberOf DataSource
		 */
		loadData: function(series) {
			var dfd = $.Deferred();

			if (series.data == null) {
				// 初期表示データの取得
				var that = this;
				h5.ajax({
					type: 'GET',
					dataType: 'text',
					url: series.url
				}).done(function(data) {
					that._initData(data);
					dfd.resolve(that.toArray());
				});
			} else {
				this._initData(series.data);
				dfd.resolve(this.toArray());
			}
			return dfd.promise();
		},

		_initData: function(data) {
			var newData = this._sliceAtMaxSize(data);
			this.sequence = h5.core.data
					.createSequence(Math.max(newData.length - data.length, 0) + 1);
			var len = data.length;

			this.manager.beginUpdate();
			while (this.sequence.current() <= len) {
				this.add(newData[this.sequence.current() - 1]);
			}
			this.manager.endUpdate();
		},

		_sliceAtMaxSize: function(data) {
			if (!this._maxSize) {
				return data;
			}
			return data.slice(Math.max(0, data.length - this._maxSize));
		},

		/**
		 * 指定したIDのデータを取得します
		 * 
		 * @param {Number} id 取得するデータのID
		 * @param {Number} 指定したIDのデータ
		 * @memberOf DataSource
		 */
		get: function(id) {
			return this.dataMap[id];
		},

		/**
		 * データを追加します
		 * 
		 * @param {Object} 追加するデータ
		 * @memberOf DataSource
		 */
		add: function(data) {
			var id = this.sequence.next();
			var d = $.extend(true, {}, data);
			d.id = id;
			this.dataMap[id] = d;
			this.length++;

			if (this.length > this.dataSize) {
				this.remove(id - this.dataSize);
			}

			var event = {
				type: 'dataChange',
				add: [d],
				target: this
			};

			this.dispatchEvent(event);

			return id;
		},

		/**
		 * 指定したIDのデータを削除します
		 * 
		 * @param {Number} 削除するデータのID
		 * @memberOf DataSource
		 */
		remove: function(id) {
			var data = this.dataMap[id];
			if (!data) {
				delete this.dataMap[id];
				this.length--;
			}
		},

		/**
		 * データソースが持つデータを配列の形式で取得します
		 * 
		 * @memberOf DataSource
		 * @returns {Array} 配列形式のデータ
		 */
		toArray: function() {
			var arr = [];
			var current = this.sequence.current();
			for (var i = current - this.length; i < current; i++) {
				arr.push(this.dataMap[i]);
			}
			return arr;
		},

		/**
		 * 積み上げでの対応するデータオブジェクトを取得します
		 * 
		 * @param {DataItem} item 対応するデータアイテム
		 * @returns {Object} 積み上げた結果のデータオブジェクト
		 * @memberOf DataSource
		 */
		getStackedData: function(id, yProp) {
			return this.manager.getStackedData(id, yProp, this.number);
		},

		/**
		 * 描画範囲内の最大値と最小値を取得します
		 * 
		 * @param {Number} rightEndId 描画範囲の右端のID
		 * @param {Number} dispDataSize 表示数
		 * @returns {Object} [obj] {Number} [obj.maxVal] 最大値 {Number} [obj.minVal] 最小値
		 * @memberOf DataSource
		 */
		getMaxAndMinVals: function(highProp, lowProp, dispDataSize, movedNum) {
			var maxVal = -Infinity;
			var minVal = Infinity;

			var current = this.sequence.current() - movedNum;
			var obj = null;
			// 表示対象の中で、最大・最小を求める
			for (var i = current - dispDataSize + 1; i <= current; i++) {
				obj = this.dataMap[i];
				if (obj == null) {
					continue;
				}

				var high = obj[highProp];
				var low = obj[lowProp];


				if (high != null && high > maxVal) {
					maxVal = high;
				}
				if (low != null && low < minVal) {
					minVal = low;
				}
			}

			// 			if (maxVal == -Infinity || minVal == Infinity) {
			// 				throw new Error('最大値と最小値の計算結果が不正です');
			// 			}

			return {
				maxVal: maxVal,
				minVal: minVal
			};
		}
	};

	h5.mixin.eventDispatcher.mix(DataSource.prototype);


	var rendererNum = 0;

	/**
	 * チャート描画用のデータソース
	 * 
	 * @param {DataSource} dataSource データソース
	 * @param {Object} seriesSetting 系列の設定
	 * @param {ChartSetting} chartSetting チャート全体の設定
	 * @class ChartDataSource
	 */
	function ChartDataSource(dataSource, seriesSetting, chartSetting, schema) {
		this.dataSource = dataSource;
		this.name = dataSource.name;
		this.seriesSetting = seriesSetting;
		this._chartSetting = chartSetting;

		this.xLabelArray = null;

		this.setPropNames(seriesSetting.type, seriesSetting.propNames);

		this.chartModel = chartDataModelManager.createModel({
			name: 'chartModel_' + rendererNum + '_' + this.name,
			schema: schema
		});

		rendererNum++;

		// イベントリスナの追加
		dataSource.addEventListener('dataChange', this.own(this._addEventListener));
	}

	ChartDataSource.prototype = {
		/**
		 * コンテキストを自分自身にした関数を取得します
		 * 
		 * @memberOf ChartDataSource
		 * @param {Function} func 関数
		 * @returns {Function} コンテキストを自分自身にした関数
		 */
		own: own,

		/**
		 * データを読み込む。系列の設定で指定されている場合はそれを利用します
		 * 
		 * @param series {Object} 系列の設定オブジェクト
		 * @memberOf ChartDataSource
		 */
		loadData: function(series) {
			// TODO: ロジック化すべきか？
			var that = this;
			this.dataSource.loadData(series).done(function(data) {
				if (that._chartSetting.get('dispDataSize') == null) {
					that._chartSetting.set('dispDataSize', that.dataSource.length);
				}
			});
		},

		/**
		 * 種別ごとにプロパティマップをセットします
		 * 
		 * @param {String} type チャートの種別
		 * @param {Object} propNames 使用するプロパティの対応マップ
		 * @memberOf ChartDataSource
		 */
		setPropNames: function(type, propNames) {
			this._type = type.toLowerCase();
			this.propNames = propNames || {};
			switch (this._type) {
			case 'ohlc':
				this.propNames = propNames || {};
				this.highProp = this.propNames.high || 'high';
				this.lowProp = this.propNames.low || 'low';
				this.xProp = this.propNames.time || 'time';
				break;
			case 'stacked_line':
			case 'line':
				this.propNames = propNames || {
					x: 'x',
					y: 'y'
				};
				this.xProp = this.propNames.x || 'x';
				this.highProp = 'y';
				this.lowProp = 'y';
				break;
			case 'stacked_bar':
			case 'bar':
				this.propNames = propNames || {};
				this.xProp = this.propNames.x || 'x';
				this.highProp = 'y';
				break;
			default:
				break;
			}
		},

		/**
		 * 指定したIDのデータオブジェクトを取得します
		 * 
		 * @param {Number} id データID
		 * @return {Object} データオブジェクト
		 * @memberOf ChartDataSource
		 */
		getDataObj: function(id) {
			var obj = this.dataSource.get(id);
			if (!obj) {
				return null;
			}
			for ( var name in obj) {
				// propNamesに従ってobjのプロパティを書き換える
				if (this.propNames[name] && this.propNames[name] != name) {
					obj[this.propNames[name]] = obj[name];
					delete obj[name];
				}
			}
			return obj;
		},

		/**
		 * 指定したIDのデータアイテムを取得します
		 * 
		 * @param {Number} id データID
		 * @return {ChartDataItem} チャートデータアイテム
		 * @memberOf ChartDataSource
		 */
		get: function(id) {
			return this.chartModel.get(id);
		},

		/**
		 * すべてのアイテムのマップを取得します
		 * 
		 * @return {Object} すべてのアイテムのマップ
		 * @memberOf ChartDataSource
		 */
		getItems: function() {
			return this.chartModel.items;
		},

		/**
		 * すべてのアイテムの配列を取得します
		 * 
		 * @return {Object} すべてのアイテムの配列
		 * @memberOf ChartDataSource
		 */
		toArray: function() {
			return this.chartModel.toArray();
		},

		/**
		 * データオブジェクトを作成します
		 * 
		 * @param {Object|Array} データオブジェクトまたはその配列
		 * @return {ChartItem|ChartItem[]} チャートデータアイテムまたはその配列
		 * @memberOf ChartDataSource
		 */
		create: function(obj) {
			return this.chartModel.create(obj);
		},

		/**
		 * 指定したIDのデータオブジェクトを削除します
		 * 
		 * @param {Number} id データID
		 * @memberOf ChartDataSource
		 */
		remove: function(id) {
			if (this.chartModel.get(id)) {
				this.dispatchEvent({
					type: 'dataChange',
					remove: [this.getDataObj(id)],
					target: this
				});
				this.chartModel.remove(id);
			}
		},

		/**
		 * 保持するデータアイテムをすべて削除します
		 * 
		 * @param {Number} id データID
		 * @memberOf ChartDataSource
		 */
		removeAll: function() {
			this.chartModel.removeAll();
		},

		_calcDataObj: function(data, prop) {
			var ret = [];

			var chartSetting = this._chartSetting;
			var dispDataSize = chartSetting.get('dispDataSize');
			var minVal = Infinity;
			var maxVal = -Infinity;

			for (var i = 0, len = data.length; i < len; i++) {
				var obj = this._toData(data[i], prop);
				var id = data[i].id;
				ret.push(obj);
				if (len - dispDataSize <= id) {
					var lowVal = this._getStackedVal(obj, this.propNames[this.lowProp]
							|| this.lowProp);
					if (lowVal != null) {
						minVal = Math.min(minVal, lowVal);
					}
					var highVal = this._getStackedVal(obj, this.propNames[this.highProp]
							|| this.highProp);
					if (highVal != null) {
						maxVal = Math.max(maxVal, highVal);
					}
				}
			}

			if (!this.seriesSetting.axis || !this.seriesSetting.axis.yaixs
					|| this.seriesSetting.axis.yaxis.autoScale !== false) {
				chartSetting.set({
					minVal: Math.min(minVal, chartSetting.get('minVal')),
					maxVal: Math.max(maxVal, chartSetting.get('maxVal'))
				});
			}

			return ret;
		},

		_getStackedVal: function(obj, propName) {
			if (obj[propName] == null) {
				// 存在しないプロパティを指定時はnullを返す
				return null;
			}

			if ($.inArray(this._type, STACKED_CHART_TYPES) === -1) {
				return obj[propName];
			}
			var stackedData = this.dataSource.getStackedData(obj.id, propName);
			return obj[propName] + stackedData[propName];
		},

		_toData: function(data, prop) {
			var ret = {
				id: data.id
			};

			if (!prop) {
				return $.extend(ret, data);
			}

			for ( var name in data) {
				var propName = name;
				ret[propName] = data[name];
				for ( var key in prop) {
					if (prop[key] === name) {
						propName = key;
						ret[key] = data[name];
						break;
					}
				}
			}
			return ret;
		},

		_addEventListener: function(ev) {
			var arr = this._calcDataObj(ev.add, this.propNames);

			this.dispatchEvent({
				type: 'dataChange',
				add: arr,
				target: this
			});
		},

		/**
		 * 指定したデータオブジェクトのx軸のデータの値を取得します
		 * 
		 * @param {Number|DataItem} idOrItem アイテムまたはそのID
		 * @returns {Any} x軸のデータの値
		 * @memberOf ChartDataSource
		 */
		getXVal: function(idOrObj) {
			if (idOrItem == null) {
				return null;
			}
			var obj;
			if (idOrObj instanceof Object) {
				obj = idOrObj;
			} else {
				obj = this.getDataObj(idOrItem);
			}
			return obj[this.xProp];
		},

		/**
		 * 描画範囲内の最大値と最小値を取得します
		 * 
		 * @param {Number} dispDataSize 表示数
		 * @param {Number} moveNum 右端からのチャートの移動数
		 * @memberOf ChartDataSource
		 */
		getMaxAndMinVals: function(dispDataSize, movedNum) {
			var highProp = this.propNames[this.highProp] || this.highProp;
			var lowProp = this.propNames[this.lowProp] || this.lowProp;

			return this.dataSource.getMaxAndMinVals(highProp, lowProp, dispDataSize, movedNum);
		},

		getMaxAndMinValsOf: function(obj) {
			var highProp = this.propNames[this.highProp] || this.highProp;
			var lowProp = this.propNames[this.lowProp] || this.lowProp;

			return {
				maxVal: obj[highProp],
				minVal: obj[lowProp]
			};
		}
	};

	h5.mixin.eventDispatcher.mix(ChartDataSource.prototype);

	// チャートレンダラ―の定義

	function getDefaultTooltip(data) {
		var time = h5format(TOOLTIP_TIME_FORMAT, data.openTime, data.closeTime);
		var open_close = h5format(TOOLTIP_OPEN_CLOSE_FORMAT, data.open, data.close);
		var high_low = h5format(TOOLTIP_HIGH_LOW_FORMAT, data.high, data.low);
		return time + '<br>' + open_close + '<br>' + high_low;
	}

	function calcY(item, prop, preRendererChartModel, height, rate) {
		if (rate == null) {
			rate = 1;
		}

		var preY;
		if (!preRendererChartModel) {
			preY = height;
		} else {
			preY = preRendererChartModel.get(item.get('id')).get(prop);
		}

		return (1 - rate) * preY + rate * item.get(prop);
	}


	/**
	 * チャートレンダラ―を生成します。
	 * 
	 * @private
	 * @param {Element} rootElement このラインチャートのルート要素
	 * @param {DataSource} dataSource このラインチャートのデータソース
	 * @param {Object} chartSetting 設定
	 * @param {Object} seriesSetting この種別の設定
	 * @param {Object} schema 各種別ごとのスキーマ
	 * @param {Object} prototype 系列ごとに拡張するプロトタイプ
	 * @returns {ChartRenderer}
	 */
	function createChartRenderer(rootElement, dataSource, chartSetting, seriesSetting, schema,
			prototype) {

		/**
		 * チャートレンダラ―の基底クラス
		 */
		function ChartRendererBase(rootElement, dataSource, chartSetting, seriesSetting, schema) {
			this.chartDataSource = new ChartDataSource(dataSource, seriesSetting, chartSetting,
					schema);
			this.name = this.chartDataSource.name;
			this.chartSetting = chartSetting;
			this.rootElement = rootElement;
			this.seriesSetting = seriesSetting;
			this.isReadyToAdd = false;

			if (!graphicRenderer.isSvg) {
				this.COORDSIZE = this.chartSetting.get('width') + ' '
						+ this.chartSetting.get('height');
			}

			this.chartDataSource.chartModel.addEventListener('itemsChange', this
					.own(this._chartModelChangeListener));

			this._leftEndChartItemId = Infinity;

			if (this.seriesSetting.mouseover) {
				this._setTooltipSetting(this.seriesSetting.mouseover.tooltip);
			}

			// イベントリスナの追加
			this.chartDataSource.addEventListener('dataChange', this.own(this._addEventListener));
		}

		ChartRendererBase.prototype = {
			/**
			 * コンテキストを自分自身にした関数を取得します
			 * 
			 * @memberOf ChartRenderer
			 * @param {Function} func 関数
			 * @returns {Function} コンテキストを自分自身にした関数
			 */
			own: own,

			_setTooltipSetting: function(tooltip) {
				if (tooltip == null) {
					return;
				}

				if (tooltip === false) {
					this._tooltipSetting = false;
					return;
				}

				var setting = $.extend({}, tooltip, true);

				setting.paddingLeft = getMarginOrPadding(tooltip, 'padding', 'Left');
				if (setting.paddingLeft == null) {
					setting.paddingLeft = DEFAULT_TOOLTIP_PADDING_LEFT;
				}
				setting.paddingRight = getMarginOrPadding(tooltip, 'padding', 'Right');
				if (setting.paddingRight == null) {
					setting.paddingRight = DEFAULT_TOOLTIP_PADDING_RIGHT;
				}
				setting.paddingTop = getMarginOrPadding(tooltip, 'padding', 'Top');
				if (setting.paddingTop == null) {
					setting.paddingTop = DEFAULT_TOOLTIP_PADDING_TOP;
				}
				setting.paddingBottom = getMarginOrPadding(tooltip, 'padding', 'Bottom');
				if (setting.paddingBottom == null) {
					setting.paddingBottom = DEFAULT_TOOLTIP_PADDING_BOTTOM;
				}

				setting.tooltipWidth = tooltip.width;
				setting.tooltipHeight = tooltip.height;

				setting.showTooltip = tooltip.content || getDefaultTooltip;

				this._tooltipSetting = setting;
			},

			/**
			 * データをこの系列に追加します
			 * 
			 * @param {Object} data データオブジェクト
			 * @memberOf ChartRendererBase
			 */
			addData: function(data) {
				// データを1つ分受け取って、チャートを更新する
				this.chartDataSource.dataSource.add(data);
			},

			_addEventListener: function(ev) {
				if (!ev.add || ev.add.length != 1) {
					return;
				}

				var obj = ev.add[0];
				this.updateChart(obj);

				this.chartDataSource.dataSource.remove(obj.id
						- this.chartSetting.get('keepDataSize'));
			},

			/**
			 * チャートを更新します
			 * 
			 * @param {Object} addedData 追加されたデータ
			 * @param {Number} removedItemId 削除されたアイテムのID
			 * @param {Boolean} isRightEndRemove 右端のデータが削除されたか
			 * @memberOf ChartRendererBase
			 */
			updateChart: function(addedData, removedItemId, isRightEndRemove) {
				// ローソク情報を計算する
				var chartItem = this.createChartDataItem(addedData);

				this.getXLabelArray();

				// チャートのローソクを更新する
				var dispDataSize = this.chartSetting.get('dispDataSize');
				if (removedItemId == null) {
					// 表示範囲の左端のIDを取得
					removedItemId = addedData.id - dispDataSize - this.chartSetting.get('movedNum');
					isRightEndRemove = false;
				}

				if (removedItemId >= 0) {
					this.chartDataSource.remove(removedItemId);
					this._removeChartElm(removedItemId);
				}
				this._appendChart([chartItem]);
			},


			/**
			 * 各データのY座標の値を更新します
			 * 
			 * @memberOf ChartRendererBase
			 */
			updateYVal: function() {
				chartDataModelManager.beginUpdate();
				for ( var id in this.chartDataSource.getItems()) {
					var intId = parseInt(id);
					// 描画範囲のローソクは座標情報を計算する
					var obj = this.chartDataSource.getDataObj(intId);
					var chartItem = this.chartDataSource.get(obj.id);
					if (chartItem != null) {
						chartItem.set(this.toData(obj, id));
					}
				}
				chartDataModelManager.endUpdate();
			},

			_removeChartElm: function(id) {
				var $root = $(this.rootElement);

				this.chartDataSource.remove(id);

				$(this.rootElement).trigger('removeTooltip', id);

				// TODO: ID体系、DOM構成見直し. ローソクには同じクラス名あてたほうがよいかも。
				$root.find('#' + h5format(LINE_ELM_ID_FORMAT, id)).remove();
				$root.find('#' + h5format(RECT_ELM_ID_FORMAT, id, this.name)).remove();
				$root.find('#' + h5format(VERT_LINE_ELM_ID_FORMAT, id)).remove();
				$root.find('#' + h5format(X_LABEL_ELM_ID_FORMAT, id)).remove();
			},

			/**
			 * マウスオーバーした位置のデータIDを取得します
			 * 
			 * @param {Object} context イベントコンテキスト
			 * @param {String} type 種別
			 * @param {Object} correction 補正項
			 * @returns {Number} マウスオーバーした要素のID
			 * @memberOf ChartRendererBase
			 */
			getTargetId: function(context, type, correction) {
				if (graphicRenderer.isSvg && type !== 'line') {
					return context.event.target.id.split('_')[1];
				}
				var ev = context.event;
				var t = ev.currentTarget;

				var top = t.offsetTop || t.clientTop;
				var left = t.offsetLeft || t.clientLeft;

				if (graphicRenderer.isSvg && !h5.env.ua.isIE) {
					top -= correction.top;
					left -= correction.left;
				}

				var oy = ev.offsetY;
				var ox = ev.offsetX;

				var items = this.chartDataSource.toArray();
				for (var i = items.length - 1; 0 <= i; i--) {
					var r = this._getRectPos(items[i]);
					if (r.sx - left <= ox && ox <= r.ex - left && r.sy - top - 1 <= oy
							&& oy <= r.ey - top + 1) {
						return items[i].get('id');
					}
				}
			},

			/**
			 * ツールチップを表示します
			 * 
			 * @param {Number} tooltipId ツールチップを表示するデータのID
			 * @param {jQuery} $tooltip ツールチップ要素のjQueryオブジェクト
			 * @memberOf ChartRendererBase
			 */
			showToolTip: function(tooltipId, $tooltip) {
				if (!this._tooltipSetting) {
					return;
				}

				var chartItem = this.chartDataSource.get(tooltipId);

				if (chartItem == null) {
					return;
				}

				$tooltip.empty();

				var obj = this.chartDataSource.getDataObj(tooltipId);
				var content = this._tooltipSetting.showTooltip(obj);

				var elem = graphicRenderer.createTextElm(content, null, null, '#000', {
					'font-size': 11
				});
				graphicRenderer.css(elem, {
					'white-space': 'nowrap'
				});

				var $elem = $(elem);
				$tooltip.append($elem);

				var tooltipWidth = this._tooltipSetting.width;
				if (tooltipWidth == null) {
					tooltipWidth = graphicRenderer.getWidthOf(elem)
							+ this._tooltipSetting.paddingLeft + this._tooltipSetting.paddingRight;
				}
				var tooltipHeight = this._tooltipSetting.height;
				if (tooltipHeight == null) {
					tooltipHeight = graphicRenderer.getHeightOf(elem)
							+ this._tooltipSetting.paddingTop + this._tooltipSetting.paddingBottom;
				}

				$elem.remove();

				var coord = this._getCentralPos(chartItem);
				if (coord.x + tooltipWidth + TOOLTIP_MARGIN.LEFT > -this.chartSetting
						.get('translateX')
						+ this.chartSetting.get('width')) {
					coord.x -= (tooltipWidth + TOOLTIP_MARGIN.LEFT);
				} else {
					coord.x += TOOLTIP_MARGIN.LEFT;
				}

				if (coord.y + tooltipHeight + TOOLTIP_MARGIN.TOP > this.chartSetting.get('height')) {
					coord.y -= (tooltipHeight + TOOLTIP_MARGIN.TOP);
				} else {
					coord.y += TOOLTIP_MARGIN.TOP;
				}

				graphicRenderer.appendRectElm(coord.x, coord.y, tooltipWidth, tooltipHeight,
						'#eee', null, $tooltip);

				var textX = coord.x + this._tooltipSetting.paddingLeft;
				var textY = coord.y + this._tooltipSetting.paddingTop;
				if (graphicRenderer.isSvg) {
					textY += CHARACTER_HEIGHT; // textがrectから+11ずれる
				}
				graphicRenderer.setTextPosition(elem, textX, textY);
				$tooltip.append(elem);

				this._appendHighLight(chartItem, $tooltip);
				this._showAdditionalLine(tooltipId, $tooltip);
			},


			_showAdditionalLine: function(tooltipId, $tooltip) {
				var chartItem = this.chartDataSource.get(tooltipId);
				var pos = this._getCentralPos(chartItem);
				var lineColor = this.chartSetting.get('additionalLineColor');

				// Y軸に補助線を引く
				$tooltip.prepend(this._createTooltipHorizeLine(tooltipId));
				// X軸に補助線を引く
				$tooltip.prepend(graphicRenderer.createLineElm(pos.x, 0, pos.x, this.chartSetting
						.get('height'), lineColor, {
					'class': 'tooltipVertLine'
				}));
			},

			/**
			 * ツールチップの描画を更新します
			 * 
			 * @param {Number} tooltipId ツールチップを表示するデータのID
			 * @param {jQuery} $tooltip ツールチップ要素のjQueryオブジェクト
			 * @memberOf ChartRendererBase
			 */
			updateTooltip: function(tooltipId, $tooltip) {
				if (!this._tooltipSetting) {
					return;
				}

				// Y軸の補助線を更新
				$tooltip.find('.tooltipHorizeLine').replaceWith(
						this._createTooltipHorizeLine(tooltipId));
			},

			_createTooltipHorizeLine: function(tooltipId) {
				var chartItem = this.chartDataSource.get(tooltipId);
				var pos = this._getCentralPos(chartItem);
				var startX = Math.abs(this.chartSetting.get('translateX'));
				var lineColor = this.chartSetting.get('additionalLineColor');
				return graphicRenderer.createLineElm(startX, pos.y, startX
						+ this.chartSetting.get('width'), pos.y, lineColor, {
					'class': 'tooltipHorizeLine'
				});
			},


			/**
			 * X軸のラベルの配列を取得します
			 * 
			 * @returns {Array} X軸のラベルの配列
			 * @memberOf ChartRendererBase
			 */
			getXLabelArray: function() {
				var vertLineNum = this.chartSetting.get('vertLineNum');

				if (vertLineNum === 0) {
					return;
				}

				if (this.xLabelArray == null) {
					this.xLabelArray = h5.core.data.createObservableArray();
				} else if (this.xLabelArray.length - 1 != vertLineNum) {
					this.xLabelArray.copyFrom([]);
				}

				var rightItemId = this.chartDataSource.dataSource.sequence.current() - 1;

				var dispSizeNum = this.chartSetting.get('dispDataSize');

				var itemInterval = (dispSizeNum - 1) / vertLineNum;
				var id = rightItemId - dispSizeNum + 1;
				for (var i = 0; i <= vertLineNum; i++) {
					var item = this.chartDataSource.getDataObj(id);
					id += itemInterval;
					this.xLabelArray.set(i, {
						value: item ? item[this.chartDataSource.xProp] : '', // 表示するデータがなければ空文字
						item: item
					});
				}

				return this.xLabelArray;
			},

			_rectPath: function(rect) {
				var left = parseInt(rect.left);
				var top = parseInt(rect.top);
				var right = parseInt(rect.left + rect.width);
				var bottom = parseInt(rect.top + rect.height);

				return h5format('m {0} {1} l {2} {3} {4} {5} {6} {7} {8} {9} e', left, top, right,
						top, right, bottom, left, bottom, left, top);
			}
		};

		$.extend(ChartRendererBase.prototype, prototype);
		return new ChartRendererBase(rootElement, dataSource, chartSetting, seriesSetting, schema);
	}

	/**
	 * ローソク表示用データを保持するモデル
	 * 
	 * @name chartModel
	 */
	var candleStickSchema = {
		id: {
			id: true,
			type: 'integer'
		},
		rectX: {
			type: 'number',
			depend: {
				on: ['rectWidth', 'lineX'],
				calc: function() {
					return this.get('lineX') - this.get('rectWidth') / 2;
				}
			}
		},
		rectY: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		rectWidth: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		rectHeight: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		fill: {
			type: 'string'
		},
		lineX: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		lineY1: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		lineY2: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		time: {
			type: 'string'
		}
	};

	/**
	 * ローソクチャートレンダラ―を生成します。
	 * 
	 * @private
	 * @param {Element} rootElement このラインチャートのルート要素
	 * @param {DataSource} dataSource このラインチャートのデータソース
	 * @param {Object} chartSetting 設定
	 * @param {Object} seriesSetting この種別の設定
	 * @returns CandleStickChartRenderer
	 */
	function createCandleStickChartRenderer(rootElement, dataSource, chartSetting, seriesSetting) {
		/**
		 * ローソクチャートのレンダラ―
		 */
		var CandleStickChartRenderer = {

			_getCentralPos: function(chartItem) {
				return {
					x: chartItem.get('rectX') + (chartItem.get('rectWidth') / 2),
					y: chartItem.get('rectY') + (chartItem.get('rectHeight') / 2)
				};
			},

			_createCandleStickDataItems: function() {
				this.chartDataSource.removeAll();

				if (!this.chartDataSource.dataSource) {
					return;
				}

				var candleStickData = [];
				var current = this.chartDataSource.dataSource.sequence.current();
				for ( var id in this.chartDataSource.dataSource.dataMap) {
					if (id >= current - this.chartSetting.get('dispDataSize')) {
						// 描画範囲のローソクは座標情報を計算する
						var obj = this.chartDataSource.getDataObj(id);
						//						var obj = this.dataSource.dataModel.dataMap[id];
						var data = this.toData(obj);
						candleStickData.push(data);
					}
				}
				return this.chartDataSource.create(candleStickData);
			},

			/**
			 * ローソクを描画するためのチャートアイテムを生成します
			 * 
			 * @pararm {Object} data 元データオブジェクトの配列
			 * @return {ChartItem[]} 描画用のチャートアイテムの配列
			 * @memberOf CandleStickRenderer
			 */
			createChartDataItem: function(data) {
				return this.chartDataSource.create(this.toData(data));
			},

			/**
			 * DataItemをチャート描画用のオブジェクトをを取得します
			 * 
			 * @param {Object} data データ
			 * @returns {Object} 描画用のオブジェクト
			 * @memberOf CandleStickChartRenderer
			 */
			toData: function(data) {
				var id = data.id;
				var open = data.open;
				var close = data.close;
				var time = data[this.chartDataSource.xProp];

				return $.extend(this._calcCandleYValues(data), {
					id: id,
					rectWidth: this.chartSetting.get('dx') * 0.8,
					fill: open > close ? 'blue' : open === close ? 'black' : 'red',
					lineX: id * this.chartSetting.get('dx') + this.chartSetting.get('width'),
					time: time
				});
			},

			_calcCandleYValues: function(data) {
				var open = data.open;
				var close = data.close;
				var min = this.chartSetting.get('rangeMin');
				var max = this.chartSetting.get('rangeMax');
				var height = this.chartSetting.get('height');

				return {
					rectY: calcYPos(Math.max(open, close), min, max, height),
					rectHeight: open !== close ? calcYDiff(open, close, min, max, height) : 1,
					lineY1: calcYPos(data.low, min, max, height),
					lineY2: calcYPos(data.high, min, max, height)
				};
			},

			/**
			 * この系列のローソクチャートを描画します
			 * 
			 * @memberOf CandleStickChartRenderer
			 */
			draw: function() {
				$(this.rootElement).empty();
				this._createCandleStickDataItems();
				if (graphicRenderer.isSvg) {
					this._showSVGCandleSticks(); // ローソクを描画
				} else {
					this._showVMLCandleSticks(); // ローソクを描画
				}
			},

			_showSVGCandleSticks: function() {
				var candleSticks = this.chartDataSource.toArray();
				for (var i = 0, len = candleSticks.length; i < len; i++) {
					this._appendCandleStick(candleSticks[i], this.rootElement);
				}
			},

			_appendChart: function(items) {
				if (graphicRenderer.isSvg) {
					this._appendCandleStick(items[0], this.rootElement);
				} else {
					this._updateCandleStickForVML();
				}
			},

			_appendCandleStick: function(candleStickItem, parent) {
				var $parent = $(parent);

				this._appendCandleStickInner(candleStickItem, $parent, '#000', {
					id: h5format(LINE_ELM_ID_FORMAT, candleStickItem.get('id')),
					'class': 'candleStickChart chartElm'
				}, candleStickItem.get('fill'), {
					id: h5format(RECT_ELM_ID_FORMAT, candleStickItem.get('id'), this.name),
					'class': 'candleStickChart chartElm'
				});
			},

			_appendHighLight: function(candleStickItem, $tooltip) {
				if (graphicRenderer.isSvg) {
					this._appendCandleStickInner(candleStickItem, $tooltip, 'yellow', {
						'class': 'highlight_candle',
						'stroke-width': '1px'
					}, candleStickItem.get('fill'), {
						'class': 'highlight_candle',
						stroke: 'yellow',
						'stroke-width': '2px'
					});
				} else {
					// ハイライト
					var highlightShape = graphicRenderer.createShapeElm({
						coordsize: this.COORDSIZE,
						path: this._rectPath(this._dataToRect(candleStickItem)),
						'class': 'candleStickChart'
					});
					graphicRenderer.css(highlightShape, {
						zoom: '1',
						width: this.chartSetting.get('width'),
						height: this.chartSetting.get('height')
					});

					// 塗りつぶし
					graphicRenderer.fill(highlightShape, {
						color: candleStickItem.get('fill')
					});

					// 枠線
					graphicRenderer.stroke(highlightShape, {
						color: 'yellow',
						weight: 2,
						on: true
					});

					$tooltip[0].appendChild(highlightShape);
				}
			},

			_appendCandleStickInner: function(candleStickItem, $parent, lineColor, lineProp,
					rectColor, rectProp) {
				graphicRenderer.appendLineElm(candleStickItem.get('lineX'), candleStickItem
						.get('lineY1'), candleStickItem.get('lineX'),
						candleStickItem.get('lineY2'), lineColor, lineProp, $parent);

				graphicRenderer.appendRectElm(candleStickItem.get('rectX'), candleStickItem
						.get('rectY'), candleStickItem.get('rectWidth'), candleStickItem
						.get('rectHeight'), rectColor, rectProp, $parent);
			},

			_chartModelChangeListener: function(ev) {
				var $root = $(this.rootElement);

				// 表示範囲が広がった時に、左端のidを探す
				for (var i = 0, len = ev.created.length; i < len; i++) {
					if (ev.created[i].get('id') < this._leftEndChartItemId) {
						this._leftEndChartItemId = ev.created[i].get('id');
					}
				}

				// 座標情報が変更されたときに、表示に反映する
				for (var i = 0, len = ev.changed.length; i < len; i++) {
					var changed = ev.changed[i];
					if (changed.props.rectY == null && changed.props.rectHeight == null
							&& changed.props.lineY1 == null && changed.props.lineY2 == null) {
						return;
					}

					var item = changed.target;
					var $line = $root.find('#' + h5format(LINE_ELM_ID_FORMAT, item.get('id')));
					$line.attr({
						y1: item.get('lineY1'),
						y2: item.get('lineY2')
					});
					var $rect = $root.find('#' + h5format(RECT_ELM_ID_FORMAT, item.get('id')));
					$rect.attr({
						y: item.get('rectY'),
						height: item.get('rectHeight')
					});
				}
			},

			// VML用

			_showVMLCandleSticks: function() {
				this._updateCandleStickForVML();
			},

			_updateCandleStickForVML: function(newCandleStick, removeId) {
				var data = this._getShapePaths();
				this._updateHighLowShape(data);
				this._updateOpenCloseShape(data);
			},

			_getShapePaths: function() {
				var lines = [];
				var rects = {}; // fillの種類ごとに配列を持つ(1shapeにつき1色しか持てないため)
				var cdata = {};

				for ( var id in this.chartDataSource.getItems()) {
					var data = this.chartDataSource.get(id);

					var lineSubpath = this._linePath(data); // path (m始まり, e終わり)を指定
					lines.push(lineSubpath);

					var rectType = this._getRectType(data);
					if (!rects[rectType]) {
						rects[rectType] = [];
						cdata[rectType] = [];
					}

					var pos = this._dataToRect(data); // left, top, width, height, fillを指定
					var rectSubpath = this._rectPath(pos); // rect表示のpathを取得
					rects[rectType].push(rectSubpath);
					cdata[rectType].push(pos);
				}

				return {
					lines: lines,
					rects: rects,
					data: cdata
				};
			},

			_updateHighLowShape: function(shapePaths) {
				var highlowLineShape = $(this.rootElement).find('.candleStickChart.chartElm')[0];

				if (highlowLineShape == null) {
					highlowLineShape = graphicRenderer.createShapeElm({
						'class': 'candleStickChart chartElm',
						coordsize: this.COORDSIZE
					});

					graphicRenderer.css(highlowLineShape, {
						zoom: '1',
						width: this.chartSetting.get('width'),
						height: this.chartSetting.get('height')
					});

					graphicRenderer.stroke(highlowLineShape, {
						on: true,
						weight: 1
					});

					this.rootElement.appendChild(highlowLineShape);
				}

				highlowLineShape.path = shapePaths.lines.join(',');
			},

			_updateOpenCloseShape: function(shapePaths) {
				var rects = shapePaths.rects;

				// fillの種類ごとに開始・終了値の四角形を描画
				for ( var rectPaths in rects) {
					if (!rects.hasOwnProperty(rectPaths)) {
						continue;
					}

					var rectShape = $(this.rootElement).find('.candleStickChart.' + rectPaths)[0];
					if (rectShape == null) {
						var rectShape = graphicRenderer.createShapeElm({
							coordsize: this.COORDSIZE,
							'class': 'candleStickChart chartElm ' + rectPaths
						});

						graphicRenderer.css(rectShape, {
							zoom: '1',
							width: this.chartSetting.get('width'),
							height: this.chartSetting.get('height')
						});

						graphicRenderer.fill(rectShape, {
							color: rectPaths
						});

						graphicRenderer.stroke(rectShape, {
							opacity: 0.01,
							on: true
						});
						this.rootElement.appendChild(rectShape);
					}
					rectShape.path = rects[rectPaths].join(' ');
				}
			},

			_getRectType: function(data) {
				return data.get('fill');
			},


			_dataToRect: function(data) {
				return {
					id: data.get('id'),
					left: data.get('rectX'),
					top: data.get('rectY'),
					width: data.get('rectWidth'),
					height: data.get('rectHeight'),
					fill: data.get('fill')
				};
			},

			_linePath: function(line) {
				var x = parseInt(line.get('lineX'));
				var y1 = parseInt(line.get('lineY1'));
				var y2 = parseInt(line.get('lineY2'));

				return h5format('m {0} {1} l {0} {2} e', x, y1, y2);
			},

			_getRectPos: function(item) {
				return {
					sx: parseInt(item.get('rectX')),
					sy: parseInt(item.get('rectY')),
					ex: parseInt(item.get('rectX') + item.get('rectWidth')),
					ey: parseInt(item.get('rectY') + item.get('rectHeight'))
				};
			}
		};

		return createChartRenderer(rootElement, dataSource, chartSetting, seriesSetting,
				candleStickSchema, CandleStickChartRenderer);
	}

	var lineSchema = {
		id: {
			id: true,
			type: 'integer'
		},
		fromX: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		toX: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		fromY: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		toY: {
			type: 'number',
			constraint: {
				notNull: true
			}
		}
	};

	/**
	 * ラインチャートレンダラ―を生成します。
	 * 
	 * @private
	 * @param {Element} rootElement このラインチャートのルート要素
	 * @param {DataSource} dataSource このラインチャートのデータソース
	 * @param {Object} chartSetting 設定
	 * @param {Object} seriesSetting この種別の設定
	 * @returns LineChartRenderer
	 */
	function createLineChartRenderer(rootElement, dataSource, chartSetting, seriesSetting) {

		/**
		 * ラインチャートレンダラ―
		 */
		var lineChartRenderer = {

			/**
			 * @private
			 * @memberOf LineChartRenderer
			 */
			_getCentralPos: function(chartItem) {
				return {
					x: chartItem.get('toX'),
					y: chartItem.get('toY')
				};
			},

			/**
			 * 系列の左端のアイテムのIDを取得します
			 * 
			 * @return {Number} 系列の左端のアイテムのID
			 * @memberOf LineChartRenderer
			 */
			getLeftEndItemId: function() {
				return this._leftEndChartItemId;
			},

			/**
			 * この系列の描画をされます
			 * 
			 * @param {Boolean} animate アニメーションするか
			 * @param {ChartModel} preRendererChartModel この系列より１つ前の系列のChartModel
			 * @memberOf LineChartRenderer
			 */
			draw: function(animate, preRendererChartModel) {
				$(this.rootElement).empty();
				this.$path = null;

				this._createLineDataItems(preRendererChartModel);

				var count = 0;
				var animateNum = this.seriesSetting.animateNum;
				if (!animate || animateNum < 1) {
					count = 1;
					animateNum = 1;
				}

				var that = this;
				function doAnimation() {
					that._appendLines(that.chartDataSource.toArray(), preRendererChartModel, count
							/ animateNum);
					count++;
					if (count <= animateNum) {
						requestAnimationFrame(doAnimation);
					} else {
						// 描画完了時にイベントをあげる
						$(that.rootElement).trigger('finishDrawing');
					}
				}
				requestAnimationFrame(doAnimation);
			},

			_appendChart: function(elms) {
				this._appendLines();
			},

			_appendLines: function(lines, preRendererChartModel, rate) {
				graphicRenderer.isSvg ? this._appendLinesForSvg(lines, preRendererChartModel, rate)
						: this._appendLinesForVml();
			},

			_appendLinesForSvg: function(lines, preRendererChartModel, rate) {
				var $root = $(this.rootElement);
				var chartItems = sortById(lines || this.chartDataSource.toArray());

				if (!chartItems || !chartItems.length) {
					return;
				}

				var item0 = chartItems[0];
				var height = this.chartSetting.get('height')
				var d = 'M' + item0.get('fromX') + ' '
						+ calcY(item0, 'fromY', preRendererChartModel, height, rate) + ' ';
				var len = chartItems.length;
				for (var i = 0; i < len; i++) {
					d += h5format(PATH_LINE_FORMAT, chartItems[i].get('toX'), calcY(chartItems[i],
							'toY', preRendererChartModel, height, rate));
				}
				var fill = graphicRenderer.getFill(this.seriesSetting.fillColor, this.rootElement);
				if (fill != null) {
					d += h5format(PATH_LINE_FORMAT, chartItems[len - 1].get('toX'),
							this.chartSetting.get('height'))
							+ h5format(PATH_LINE_FORMAT, item0.get('fromX'), this.chartSetting
									.get('height')) + ' Z';
				}

				if (this.$path != null) {
					this.$path.attr('d', d);
				} else {
					var attrs = {
						stroke: this.seriesSetting.color || '#000',
						'class': 'LineChart chartElm',
						'stroke-width': this.seriesSetting['stroke-width'],
						fill: fill || 'none'
					};
					var $path = $(graphicRenderer.createPathElm(d, attrs));
					// iOS7対応
					window.scrollTo(window.scrollX, window.scrollY);
					$root.append($path);
					this.$path = $path;
				}
			},

			// TODO: きっとSVG版と統合できるはず(svg/vmlレイヤーで吸収できるはず)
			_appendLinesForVml: function() {
				var $root = $(this.rootElement);
				$root.empty();

				var lineData = this.chartDataSource.toArray();
				var lineShape = graphicRenderer.createShapeElm();
				graphicRenderer.css(lineShape, {
					width: this.chartSetting.get('width'),
					height: this.chartSetting.get('height'),
					position: 'absolute'
				});
				var fill = this.graphicRenderer.getFill(this.seriesSetting.fillColor,
						this.rootElement);
				graphicRenderer.stroke(lineShape, {
					on: true,
					color: this.seriesSetting.color || '#000'
				});
				if (fill) {
					graphicRenderer.fill(lineShape, fill);
				} else {
					graphicRenderer.fill(lineShape, {
						on: false
					});
				}
				lineShape.className = 'LineChart chartElm';
				lineShape.coordsize = this.COORDSIZE;

				var lineShapePath = '';

				var len = lineData.length;
				for (var i = 0; i < len; i++) {
					if (i === 0) {
						var x1 = parseInt(lineData[i].get('fromX'));
						var y1 = parseInt(lineData[i].get('fromY'));
						lineShapePath += h5format('m {0},{1} l{0}, {1}', x1, y1);
					}
					var x2 = parseInt(lineData[i].get('toX'));
					var y2 = parseInt(lineData[i].get('toY'));

					lineShapePath += h5format(',{0},{1}', x2, y2);
				}
				if (fill) {
					var firstX = parseInt(lineData[0].get('fromX'));
					var lastX = parseInt(lineData[len - 1].get('toX'));
					var height = this.chartSetting.get('height');
					lineShapePath += h5format(',{0},{1}', lastX, height);
					lineShapePath += h5format(',{0},{1}', firstX, height);
					lineShapePath += h5format(',{0},{1}', firstX,
							parseInt(lineData[0].get('fromY')));
				}
				lineShape.path = lineShapePath + 'e';
				$root[0].appendChild(lineShape);
			},

			_getFill: function() {
				var color = this.seriesSetting.fillColor;
				if (!color) {
					return null;
				}

				if (typeof color === 'object') {
					// グラデーションの定義オブジェクト
					return graphicRenderer.gradient(color.id, color, $(this.rootElement));
				}
				if (typeof color === 'string') {
					return color;
				}
				// TODO: エラー
				return null;
			},

			/**
			 * データアイテムをチャートアイテムに変換します
			 * 
			 * @param {DataItem} dataItem データアイテム
			 * @returns {ChartItem} 変換後のChartItem
			 * @memberOf LineChartRenderer
			 */
			createChartDataItem: function(dataItem) {
				var chartData = this.toData(dataItem);
				if (!chartData) {
					return null;
				}
				return this.chartDataSource.create(chartData);
			},

			_createLineDataItems: function(preRendererChartModel) {
				this.chartDataSource.removeAll();

				if (!this.chartDataSource) {
					return;
				}

				var lineData = [];
				var current = this.chartDataSource.dataSource.sequence.current()
						- chartSetting.get('movedNum');
				var dispDataSize = this.chartSetting.get('dispDataSize');
				for ( var id in this.chartDataSource.dataSource.dataMap) {
					var intId = parseInt(id);
					if (intId < current - dispDataSize || intId >= current) {
						continue;
					}

					// 描画範囲の点について座標情報を計算する
					var item = this.chartDataSource.getDataObj(intId);
					var chartData = this.toData(item);
					if (chartData) {
						// y座標の点があるもののみ表示する
						lineData.push(chartData);
					}
				}
				this.chartDataSource.create(lineData);
			},

			/**
			 * DataItemをチャート描画用のオブジェクトをを取得します
			 * 
			 * @param {Object} dataObj データアイテム
			 * @returns {Object} 描画用のオブジェクト
			 * @memberOf LineChartRenderer
			 */
			toData: function(dataObj) {
				// TODO: xの位置がデータに依存しない
				var id = dataObj.id;
				var pre = this.chartDataSource.getDataObj(id - 1);

				var min = this.chartSetting.get('rangeMin');
				var max = this.chartSetting.get('rangeMax');
				var height = this.chartSetting.get('height');

				var yProp = this.chartDataSource.propNames.y;
				var toY = dataObj[yProp];
				if (toY == null) {
					return null;
				}

				// preがnullのときは、データとしても端であり、このときはただの点を表示する
				var isPoint = pre == null || pre[yProp] == null;
				var fromY = isPoint ? dataObj[yProp] : pre[yProp];

				if ($.inArray(this.seriesSetting.type, STACKED_CHART_TYPES) !== -1) {
					fromY += this.chartDataSource.dataSource.getStackedData(pre.id, yProp)[yProp];
					toY += this.chartDataSource.dataSource.getStackedData(dataObj.id, yProp)[yProp];
				}

				var dx = this.chartSetting.get('dx');
				var toX = id * dx + this.chartSetting.get('width');

				return {
					id: id,
					fromX: !isPoint ? toX - dx : toX,
					toX: toX,
					fromY: calcYPos(fromY, min, max, height),
					toY: calcYPos(toY, min, max, height)
				};
			},

			/**
			 * X座標を取得します
			 * 
			 * @param {Number|ChartItem} idOrItem 取得対象のIDまたはチャートアイテム
			 * @returns {Number} x座標
			 * @memberOf LineChartRenderer
			 */
			getXCoord: function(idOrItem) {
				if (idOrItem == null) {
					return null;
				}
				var item;
				if (idOrItem instanceof Object) {
					item = idOrItem;
				} else {
					item = this.chartDataSource.get(idOrItem);
				}
				return item.get('toX');
			},

			/**
			 * X方向の実データの値を取得します
			 * 
			 * @param {Number|ChartItem} idOrItem 取得対象のIDまたはチャートアイテム
			 * @returns {Number} X方向の実データの値
			 * @memberOf LineChartRenderer
			 */
			getXVal: function(idOrItem) {
				return this.chartDataSource.getXVal(idOrItem);
			},

			_chartModelChangeListener: function(ev) {
				// 表示範囲が広がった時に、左端のidを探す
				for (var i = 0, len = ev.created.length; i < len; i++) {
					if (ev.created[i].get('id') < this._leftEndChartItemId) {
						this._leftEndChartItemId = ev.created[i].get('id');
					}
				}

				// // 座標情報が変更されたときに、表示に反映する
				if (ev.changed.length > 0) {
					this._appendLines();
				}
			},

			_getRectPos: function(item) {
				var sx = 0;
				var sy = 0;
				var ex = 0;
				var ey = 0;

				if (item.get('fromX') < item.get('toX')) {
					sx = item.get('fromX');
					ex = item.get('toX');
				} else {
					sx = item.get('toX');
					ex = item.get('fromX');
				}

				if (item.get('fromY') < item.get('toY')) {
					sy = item.get('fromY');
					ey = item.get('toY');
				} else {
					sy = item.get('toY');
					ey = item.get('fromY');
				}

				return {
					sx: sx,
					sy: sy,
					ex: ex,
					ey: ey
				};
			},

			_dataToRect: function(data) {
				return {
					id: data.get('id'),
					left: parseInt(data.get('fromX')),
					top: parseInt(data.get('fromY')),
					width: parseInt(data.get('toX') - data.get('fromX')),
					height: parseInt(data.get('toY') - data.get('fromY'))
				};
			},

			_appendHighLight: function() {
			// ラインチャートではハイライトする対象がない
			}
		};
		return createChartRenderer(rootElement, dataSource, chartSetting, seriesSetting,
				lineSchema, lineChartRenderer);
	}

	var barSchema = {
		id: {
			id: true,
			type: 'integer'
		},
		x: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		upperBase: {
			type: 'number'
		},
		rectHeight: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		fill: {
			type: 'string'
		}
	};

	/**
	 * バーチャートレンダラ―を生成します。
	 * 
	 * @private
	 * @param {Element} rootElement このラインチャートのルート要素
	 * @param {DataSource} dataSource このラインチャートのデータソース
	 * @param {Object} chartSetting 設定
	 * @param {Object} seriesSetting この種別の設定
	 * @returns BarChartRenderer
	 */
	function createBarChartRenderer(rootElement, dataSource, chartSetting, seriesSetting) {
		/**
		 * バーチャートのレンダラ―
		 */
		var barChartRenderer = {
			/**
			 * この系列の描画をします
			 * 
			 * @param {Boolean} animate アニメーションするか
			 * @param {ChartModel} preRendererChartModel この系列より１つ前の系列のChartModel
			 * @memberOf BarChartRenderer
			 */
			draw: function(animate, preRendererChartModel) {
				$(this.rootElement).empty();
				this.$path = null;

				this._createBarDataItems(preRendererChartModel);

				var count = 1;
				var animateNum = this.seriesSetting.animateNum;
				if (!animate || !animateNum) {
					animateNum = 1;
				}

				function doAnimation() {
					var rate = count / animateNum;
					if (count == 1) {
						this._appendBars(this.chartDataSource.toArray(), preRendererChartModel,
								rate);
					} else if (count > 1) {
						this._updateBars(this.chartDataSource.toArray(), preRendererChartModel,
								rate);
					}

					count++;

					if (count <= animateNum) {
						requestAnimationFrame(this.own(doAnimation));
					} else {
						// 描画完了時にイベントをあげる
						$(this.rootElement).trigger('finishDrawing');
					}
				}
				requestAnimationFrame(this.own(doAnimation));
			},

			_createBarDataItems: function(preRendererChartModel) {
				this.chartDataSource.removeAll();

				var barData = [];
				var current = this.chartDataSource.dataSource.sequence.current()
						- chartSetting.get('movedNum');
				var dispDataSize = this.chartSetting.get('dispDataSize');
				for ( var id in this.chartDataSource.dataSource.dataMap) {
					var intId = parseInt(id);
					if (intId < current - dispDataSize || intId >= current) {
						continue;
					}

					// 描画範囲の点について座標情報を計算する
					var item = this.chartDataSource.getDataObj(intId);
					var chartData = this.toData(item);
					if (chartData) {
						// y座標の点があるもののみ表示する
						barData.push(chartData);
					}
				}
				this.chartDataSource.create(barData);
			},

			// TODO: ChartDataSourceを拡張したクラスに移動する

			/**
			 * データオブジェクトをチャート描画用のオブジェクトに変換する
			 * 
			 * @param {Object} dataObj データオブジェクト
			 * @returns {Object} チャート描画用のオブジェクト
			 */
			toData: function(dataObj) {
				var id = dataObj.id;

				var max = this.chartSetting.get('rangeMax');
				var height = this.chartSetting.get('height');

				var yProp = this.chartDataSource.propNames.y;
				var y = dataObj[yProp];
				if (y == null) {
					return null;
				}

				var stackedVal = 0;
				if ($.inArray(this.seriesSetting.type, STACKED_CHART_TYPES) !== -1) {
					stackedVal += this.chartDataSource.dataSource.getStackedData(dataObj.id,
							yProp)[yProp];
					y += stackedVal;
				}

				var dx = this.chartSetting.get('dx');

				return {
					id: id,
					x: id * dx + this.chartSetting.get('width') - dx / 2,
					upperBase: calcYPos(y, 0, max, height),
					rectHeight: calcYDiff(y, stackedVal, 0, max, height),
					fill: graphicRenderer.getFill(this.seriesSetting.color, this.rootElement)
							|| 'none'
				};
			},

			_appendBars: function(chartItems, preRendererChartModel, rate) {
				var height = this.chartSetting.get('height');
				for (var i = 0, len = chartItems.length; i < len; i++) {
					var chartItem = chartItems[i];
					var chartObj = chartItem.get();
					chartObj.y = calcY(chartItem, 'upperBase', preRendererChartModel, height, rate);
					this._appendBar(chartObj, $(this.rootElement), chartItem.get('fill'), {
						id: h5format(RECT_ELM_ID_FORMAT, chartItem.get('id'), this.name),
						'class': 'barChart chartElm'
					});
				}
			},

			_appendBar: function(chartObj, $elm, color, prop) {
				var width = this.chartSetting.get('dx') * 0.5;
				graphicRenderer.appendRectElm(chartObj.x, chartObj.upperBase, width,
						chartObj.rectHeight, color, prop, $elm);
			},

			_updateBars: function(chartItems, preRendererChartModel, rate) {
				for (var i = 0, len = chartItems.length; i < len; i++) {
					var chartItem = chartItems[i];
					var height = this.chartSetting.get('height');
					var width = this.chartSetting.get('dx') * 0.5;
					this._updateBar(chartItem.get('id'), calcY(chartItem, 'upperBase',
							preRendererChartModel, height, rate), chartItem.get('rectHeight'));
				}
			},

			_updateBar: function(id, y, height) {
				var $rect = $(this.rootElement).find(
						'#' + h5format(RECT_ELM_ID_FORMAT, id, this.name));
				$rect.attr({
					y: y,
					height: height
				});
			},

			_chartModelChangeListener: function(ev) {
				// 表示範囲が広がった時に、左端のidを探す
				for (var i = 0, len = ev.created.length; i < len; i++) {
					if (ev.created[i].get('id') < this._leftEndChartItemId) {
						this._leftEndChartItemId = ev.created[i].get('id');
					}
				}

				// 座標情報が変更されたときに、表示に反映する
				for (var i = 0, len = ev.changed.length; i < len; i++) {
					var changed = ev.changed[i];
					if (changed.props.upperBase == null && changed.props.rectHeight == null) {
						return;
					}

					var item = changed.target;
					this._updateBar(item.get('id'), item.get('upperBase'), item.get('rectHeight'));
				}
			},

			_getCentralPos: function(chartItem) {
				return {
					x: chartItem.get('x'),
					y: chartItem.get('upperBase') + (chartItem.get('rectHeight') / 2)
				};
			},

			_appendHighLight: function(chartItem, $tooltip) {
				// FIXME: ツールチップの色の出し方
				this._appendBar(chartItem.get(), $tooltip, /*chartItem.get('fill')*/'yellow', {
					'class': 'highlight_bar',
					stroke: 'yellow',
					'stroke-width': '2px'
				});
			},
			_showAdditionalLine: function() {
			// do nothing
			}
		};

		return createChartRenderer(rootElement, dataSource, chartSetting, seriesSetting, barSchema,
				barChartRenderer);
	}

	var PIE_PATH_FORMAT = 'M {0},{0} L {1},{2} A {0},{0} 0 {5},1 {3},{4}';

	var pieSchema = {
		id: {
			id: true,
			type: 'integer'
		},
		sum: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		total: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		radius: {
			type: 'number',
			depend: {
				on: ['sum', 'total'],
				calc: function(ev) {
					return this.get('sum') / this.get('total') * Math.PI * 2;
				}
			}
		},
		radian: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		x: {
			type: 'number',
			depend: {
				on: ['radius'],
				calc: function(ev) {
					var radian = this.get('radian');
					return radian + radian * Math.sin(this.get('radius'));
				}
			}
		},
		y: {
			type: 'number',
			depend: {
				on: ['radius'],
				calc: function(ev) {
					var radian = this.get('radian');
					return radian - radian * Math.cos(this.get('radius'));
				}
			}
		},
		largeArcFlg: {
			type: 'integer',
			constraint: {
				notNull: true
			}
		},
		preX: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		preY: {
			type: 'number',
			constraint: {
				notNull: true
			}
		},
		stroke: {
			type: 'string'
		},
		fill: {
			type: 'string'
		}
	};

	/**
	 * パイチャートレンダラ―を生成します。
	 * 
	 * @private
	 * @param {Element} rootElement このラインチャートのルート要素
	 * @param {DataSource} dataSource このラインチャートのデータソース
	 * @param {Object} chartSetting 設定
	 * @param {Object} seriesSetting この種別の設定
	 * @returns PieChartRenderer
	 */
	function createPieChartRenderer(rootElement, dataSource, chartSetting, seriesSetting) {
		/**
		 * パイチャートのレンダラ―
		 */
		var pieChartRenderer = {
			/**
			 * この系列の描画をします
			 * 
			 * @param {Boolean} animate アニメーションするか
			 * @memberOf PieChartRenderer
			 */
			draw: function(animate) {
				$(this.rootElement).empty();
				this.$path = null;

				this._radian = this.chartSetting.get('height') * 0.4;

				this._createPieDataItems();

				var count = 1;
				var animateNum = this.seriesSetting.animateNum;
				if (!animate || !animateNum) {
					animateNum = 1;
				}

				function doAnimation() {
					var rate = count / animateNum;
					if (count == 1) {
						this._appendPies(this.chartDataSource.toArray(), rate);
					} else if (count > 1) {
						this._updateBars(this.chartDataSource.toArray(), rate);
					}

					count++;

					if (count <= animateNum) {
						requestAnimationFrame(this.own(doAnimation));
					} else {
						// 描画完了時にイベントをあげる
						$(this.rootElement).trigger('finishDrawing');
					}
				}
				requestAnimationFrame(this.own(doAnimation));
			},

			_createPieDataItems: function() {
				this.chartDataSource.removeAll();

				var pieData = [];
				var current = this.chartDataSource.dataSource.sequence.current()
						- chartSetting.get('movedNum');
				var dispDataSize = this.chartSetting.get('dispDataSize');

				var total = 0;

				for ( var id in this.chartDataSource.dataSource.dataMap) {
					var intId = parseInt(id);
					if (intId < current - dispDataSize || intId >= current) {
						continue;
					}

					// 描画範囲の点について座標情報を計算する
					var item = this.chartDataSource.getDataObj(intId);
					total += item[this.chartDataSource.propNames.y];
				}

				this._total = total;

				for ( var id in this.chartDataSource.dataSource.dataMap) {
					var intId = parseInt(id);
					if (intId < current - dispDataSize || intId >= current) {
						continue;
					}

					// 描画範囲の点について座標情報を計算する
					var item = this.chartDataSource.getDataObj(intId);
					var chartData = this.toData(item);
					this.chartDataSource.create(chartData);
					// 					if (chartData) {
					// 						// y座標の点があるもののみ表示する
					// 						pieData.push(chartData);
					// 					}
				}
			},

			// TODO: ChartDataSourceを拡張したクラスに移動する

			/**
			 * データオブジェクトをチャート描画用のオブジェクトに変換する
			 * 
			 * @param {Object} dataObj データオブジェクト
			 * @returns {Object} チャート描画用のオブジェクト
			 */
			toData: function(dataObj) {
				var id = dataObj.id;

				var yProp = this.chartDataSource.propNames.y;
				var value = dataObj[yProp];

				var pre = this.chartDataSource.get(id - 1);
				var sum = value;
				if (pre) {
					sum += pre.get('sum');
				}

				return {
					id: id,
					radian: this._radian,
					sum: sum,
					total: this._total,
					preX: pre ? pre.get('x') : this._radian,
					preY: pre ? pre.get('y') : 0,
					largeArcFlg: value < 0.5 * this._total ? 0 : 1,
					fill: this._getColor(id),
					stroke: this.seriesSetting.stroke || '#000'
				};
			},

			_getColor: function(id) {
				var colors = this.seriesSetting.colors;
				return graphicRenderer.getFill(colors[id % colors.length], this.rootElement)
						|| 'none';
			},

			_appendPies: function(chartItems, preRendererChartModel, rate) {
				var height = this.chartSetting.get('height');
				for (var i = 0, len = chartItems.length; i < len; i++) {
					var chartItem = chartItems[i];
					this._appendPie(chartItem, $(this.rootElement), {
						id: h5format(PIE_ELM_ID_FORMAT, chartItem.get('id'), this.name),
						'class': 'pieChart chartElm',
						fill: chartItem.get('fill'),
						stroke: chartItem.get('stroke')
					});
				}
			},

			_appendPie: function(chartItem, $elm, prop) {
				var d = h5.u.str.format(PIE_PATH_FORMAT, chartItem.get('radian'), chartItem
						.get('preX'), chartItem.get('preY'), chartItem.get('x'),
						chartItem.get('y'), chartItem.get('largeArcFlg'));
				graphicRenderer.appendPathElm(d, prop, $elm);
			},

			_chartModelChangeListener: function(ev) {
			},

			_getCentralPos: function(chartItem) {
				return {
					x: (chartItem.get('x') + chartItem.get('preX') + this._radian) / 3,
					y: (chartItem.get('y') + chartItem.get('preY') + this._radian) / 3,
				};
			},

			_appendHighLight: function(chartItem, $tooltip) {
				// FIXME: ツールチップの色の出し方
				this._appendPie(chartItem, $tooltip, {
					'class': 'highlight_bar',
					fill: 'none',
					stroke: 'yellow',
					'stroke-width': '2px'
				});
			},
			_showAdditionalLine: function() {
			// do nothing
			}
		};

		return createChartRenderer(rootElement, dataSource, chartSetting, seriesSetting, pieSchema,
				pieChartRenderer);
	}

	/**
	 * 軸を描画するレンダラ―
	 * 
	 * @param {Element} axesElm 軸のルート要素
	 * @param {ChartSettingItem} chartSetting 設定アイテム
	 * @param {Object} axesSetting 軸の設定オブジェクト
	 */
	function AxisRenderer(axesElm, chartSetting, axesSettings) {
		this.rootElement = axesElm;
		this.$horizLines = null;
		this.$vertLines = null;

		this.chartSetting = chartSetting;

		this.setAxesSetting(axesSettings);

		var that = this;
		function scaling(min, max) {
			if (min === Infinity && max === -Infinity) {
				// 点が存在しない場合は、rangeにnullを設定
				chartSetting.set({
					rangeMax: null,
					rangeMin: null
				});
				return;
			}
			var range;
			if (that.autoScale) {
				range = that.autoScale(min, max);
			} else {
				range = that._defaultAutoScale(min, max);
			}
			chartSetting.set(range);
		}

		scaling(chartSetting.get('minVal'), chartSetting.get('maxVal'));

		chartSetting.addEventListener('change', function(ev) {
			if (ev.props.minVal != null || ev.props.maxVal != null) {
				var minVal = ev.target.get('minVal');
				var maxVal = ev.target.get('maxVal');
				scaling(minVal, maxVal);
			}
			if (ev.props.rangeMin != null || ev.props.rangeMax != null) {
				// rangeが変更されたので、水平方向の補助線を引き直す
				that._drawHorizLines();
			}
		});
	}

	AxisRenderer.prototype = {

		_defaultAutoScale: function(min, max) {
			return {
				rangeMin: min,
				rangeMax: max
			};
		},

		/**
		 * X軸のラベル領域の高さを取得します
		 * 
		 * @memberOf AxisRenderer
		 * @returns X軸のラベル領域の高さ
		 */
		getXLabelHeight: function() {
			if (!this._axesSettings.xaxis || !this._axesSettings.xaxis.height) {
				return DEFAULT_X_LABEL_HEIGHT;
			}

			return this._axesSettings.xaxis.height;
		},

		/**
		 * Y軸のラベル領域の幅を取得します
		 * 
		 * @memberOf AxisRenderer
		 * @returns Y軸のラベル領域の幅
		 */
		getYLabelWidth: function() {
			if (!this._axesSettings.yaxis || !this._axesSettings.yaxis.width) {
				return DEFAULT_Y_LABEL_WIDTH;
			}

			return this._axesSettings.yaxis.width;
		},

		/**
		 * X軸のラベル領域のマージンを取得します
		 * 
		 * @memberOf AxisRenderer
		 * @returns marginTopとmarginBottomを持つオブジェクト
		 */
		getXLabelMargin: function() {
			var marginTop = getMarginOrPadding(this._axesSettings.xaxis, 'margin', 'Top');
			if (marginTop == null) {
				marginTop = DEFAULT_X_LABEL_MARGIN_TOP;
			}

			var marginBottom = getMarginOrPadding(this._axesSettings.xaxis, 'margin', 'Bottom');
			if (marginBottom == null) {
				marginBottom = DEFAULT_X_LABEL_MARGIN_BOTTOM;
			}

			return {
				marginTop: marginTop,
				marginBottom: marginBottom
			};
		},

		/**
		 * Y軸のラベル領域のマージンを取得します
		 * 
		 * @memberOf AxisRenderer
		 * @returns marginLeftとmarginRightを持つオブジェクト
		 */
		getYLabelMargin: function() {
			var marginLeft = getMarginOrPadding(this._axesSettings.yaxis, 'margin', 'Left');
			if (marginLeft == null) {
				marginLeft = DEFAULT_Y_LABEL_MARGIN_LEFT;
			}

			var marginRight = getMarginOrPadding(this._axesSettings.yaxis, 'margin', 'Right');
			if (marginRight == null) {
				marginRight = DEFAULT_Y_LABEL_MARGIN_RIGHT;
			}

			return {
				marginLeft: marginLeft,
				marginRight: marginRight
			};
		},

		/**
		 * 軸のラベルを表示します
		 * 
		 * @param xLabelArray x軸のラベルの配列
		 */
		showAxisLabels: function(xLabelArray) {
			if (xLabelArray == null) {
				return;
			}
			this.$vertLines.children('.xLabel').remove();
			if (this.xLabelArray !== xLabelArray) {
				this.xLabelArray = xLabelArray;
				var that = this;
				this.xLabelArray.addEventListener('changeBefore', function(ev) {
					var $xLabelTexts = that.$vertLines.children('.xLabel');
					if ($xLabelTexts.length === 0) {
						return;
					}

					var value = ev.args[1].value;
					var index = ev.args[0];
					var orgLabel = this.get(index);
					if (ev.method !== 'set' || (orgLabel && value === orgLabel.value)) {
						return;
					}
					var label = that._getXLabel(ev.args[1], index);
					graphicRenderer.text(label, $xLabelTexts.eq(index));
				});
			}

			var dx = this.chartSetting.get('dx');
			var xInterval = (this.chartSetting.get('width') - dx)
					/ this.chartSetting.get('vertLineNum');
			var x = dx * 0.5;

			var height = this.chartSetting.get('height');
			var textY = graphicRenderer.isSvg ? height + CHARACTER_HEIGHT : height + 5;

			// ラベルの軸からのマージンを取得
			var margin = getMarginOrPadding(this._axesSettings.xaxis, 'margin', 'Top');
			if (margin == null) {
				margin = DEFAULT_X_LABEL_MARGIN_TOP;
			}
			textY += margin;

			for (var i = 0, len = this.xLabelArray.length; i < len; i++) {
				var label = this._getXLabel(this.xLabelArray.get(i), i);
				graphicRenderer.appendTextElm(label, x, textY, null, {
					'class': 'xLabel',
					'text-anchor': 'middle'
				}, this.$vertLines);
				x += xInterval;
			}
		},

		_getXLabel: function(xLabelObj, index) {
			if (!xLabelObj || !xLabelObj.item) {
				// 対象となるデータが存在しないときは空文字を表示
				return '';
			}
			return this._xLabelFormatter(xLabelObj.value, xLabelObj.item, index);
		},

		/**
		 * 格子線を引く
		 * 
		 * @memberOf AxisRenderer
		 */
		drawGridLines: function() {
			this._drawHorizLines(); // 水平方向の補助線を引く
			this._drawVertLines();
		},

		/**
		 * チャートの横の補助線を引く
		 * 
		 * @memberOf AxisRenderer
		 */
		_drawHorizLines: function() {
			if (this.$horizLines == null) {
				this.$horizLines = $(graphicRenderer.createGroupElm({
					id: 'horiz_lines'
				}));
				$(this.rootElement).prepend(this.$horizLines);
			} else {
				this.$horizLines.empty();
			}

			// 指定した数だけ分割して、横のメモリを引く
			var horizLineNum = this.chartSetting.get('horizLineNum');

			var rangeMax = this.chartSetting.get('rangeMax');
			var rangeMin = this.chartSetting.get('rangeMin');
			var width = this.chartSetting.get('width');
			var yInterval = (rangeMax - rangeMin) / horizLineNum;

			for (var i = 0; i <= horizLineNum; i++) {
				var height = this.chartSetting.get('height');
				var y = height - i * height / horizLineNum;

				if (i !== 0 && i !== horizLineNum) {
					graphicRenderer.appendLineElm(0, y, width, y, '#ccc', {
						'class': 'added'
					}, this.$horizLines);
				}

				if (rangeMax == null || rangeMin == null) {
					// 表示する点がない場合は、以下のラベルを表示する処理は行わない
					continue;
				}

				// 目盛を付ける
				var textY = graphicRenderer.isSvg ? y + 2 : y - 7;

				// ラベルの軸からのマージンを取得
				var margin = getMarginOrPadding(this._axesSettings.yaxis, 'margin', 'Right');
				if (margin == null) {
					margin = DEFAULT_Y_LABEL_MARGIN_RIGHT;
				}
				var val = yInterval * i + rangeMin;
				graphicRenderer.appendTextElm(this._yLabelFormatter(val, i), -margin, textY, null,
						{
							'class': 'added',
							'font-size': this._axesSettings.yaxis.fontSize,
							'text-anchor': 'end'
						}, this.$horizLines);
			}
		},

		/**
		 * チャートの縦の補助線を引く
		 * 
		 * @memberOf AxisRenderer
		 */
		_drawVertLines: function(renderer) {
			if (this.$vertLines == null) {
				this.$vertLines = $(graphicRenderer.createGroupElm({
					id: 'vert_lines'
				}));
			} else {
				this.$vertLines.empty();
			}

			var vertLineNum = this.chartSetting.get('vertLineNum');
			if (vertLineNum === 0) {
				return;
			}

			if (renderer == null) {
				$(this.rootElement).prepend(this.$vertLines);


				var dx = this.chartSetting.get('dx');
				var height = this.chartSetting.get('height');
				var width = this.chartSetting.get('width') - dx; // 両脇にdx/2ずつ余白を取る
				var xInterval = width / vertLineNum;

				var paddingRight = this._axesSettings.yaxis.paddingRight;
				var x;
				if (typeof paddingRight == 'string') {
					x = parseInt(paddingRight, 10);
				} else {
					if (paddingRight == null) {
						paddingRight = 0.5;
					}
					x = dx * paddingRight;
				}

				for (var i = 0; i <= vertLineNum; i++) {
					graphicRenderer.appendLineElm(x, 0, x, height, '#CCC', null, this.$vertLines);
					x += xInterval;
				}

				return;
			}
		},

		/**
		 * 軸の設定をセットします
		 * 
		 * @param axesSettings
		 * @memberOf AxisRenderer
		 */
		setAxesSetting: function(axesSettings) {
			this._axesSettings = axesSettings;
			this.chartSetting.set({
				vertLineNum: !axesSettings.xaxis.off ? axesSettings.xaxis.lineNum + 1 : 0,
				horizLineNum: axesSettings.yaxis.lineNum
			});
			this.autoScale = axesSettings.yaxis.autoScale || this._defaultAutoScale;
			this._xLabelFormatter = axesSettings.xaxis.formatter || this._xLabelDefaultFormatter;
			this._yLabelFormatter = axesSettings.yaxis.formatter || this._yLabelDefaultFormatter;
		},

		_xLabelDefaultFormatter: function(value, data, index) {
			return !value ? '' : value.toString();
		},

		_yLabelDefaultFormatter: function(value, index) {
			return value.toString();
		}
	};

	var chartSequense = 0;

	/**
	 * 描画を行うコントローラ
	 * 
	 * @class
	 * @memberOf h5.ui.components.chart
	 * @name ChartController
	 */
	var chartController = {

		__name: 'h5.ui.components.chart.ChartController',

		chartSetting: null,

		_renderers: {},

		_rendererQueue: [],

		axisRenderer: null,

		dataSourceManager: null,

		chartId: null,

		$chart: null,

		$movingGroups: null,

		isInitDraw: false,

		isFirstDraw: true,

		tooltip: {},

		_addedCount: 0,

		_updateLog: {},

		_isInInnerUpdate: false,

		__ready: function() {
			this.chartId = '__h5_chart' + chartSequense;
			chartSequense++;

			this.chartSetting = h5.core.data.createObservableItem(chartSettingsSchema);
			this.chartSetting
					.addEventListener('change', this.own(this._chartSettingChangeListener));

		},

		_chartSettingChangeListener: function(ev) {
			if (this.isInitDraw) {
				return;
			}

			if (ev.props.translateX != null) {
				graphicRenderer.setTranslate(this.$seriesGroup, ev.props.translateX.newValue, 0);
				graphicRenderer.setTranslate(this.$tooltip, ev.props.translateX.newValue, 0);
				this._updateTooltip();
			}

			if (ev.props.width != null || ev.props.height != null) {
				this._appendBorder(this.chartSetting.get('width'), this.chartSetting.get('height'));
			}
			if (ev.props.rangeMin || ev.props.rangeMax) {
				for ( var name in this._renderers) {
					this._renderers[name].updateYVal();
					if (this.tooltip.id != null) {
						this.tooltip.renderer.showToolTip(this.tooltip.id, this.$tooltip);
					}
				}
			}
		},

		/**
		 * チャートの初期表示をされます
		 * 
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		_initChart: function(firstChartRenderer) {
			var paddingRight = 0;
			if (this.settings.plotSetting && this.settings.plotSetting.paddingRight) {
				paddingRight = this.settings.plotSetting.paddingRight;
			}

			if (this.settings.axes) {
				this._appendBorder();
				this._initAxis(firstChartRenderer);
				// TODO: translateXの計算は共通化すべき
				var rightId = firstChartRenderer.chartDataSource.dataSource.sequence.current() - 1;
				this.chartSetting.set('translateX', -this.chartSetting.get('dx')
						* (rightId + paddingRight - this.chartSetting.get('movedNum')));
			}

		},

		_initAxis: function(firstChartRenderer) {
			if (this.axisRenderer == null) {
				var axesElm = graphicRenderer.createGroupElm({
					id: 'axes'
				});
				this.$stickingGroups.append(axesElm);
				this.axisRenderer = new AxisRenderer(axesElm, this.chartSetting, this.settings.axes);
			} else {
				this.axisRenderer.setAxesSetting(this.settings.axes);
			}
			this.axisRenderer.drawGridLines();

			var xLabelArray = firstChartRenderer.getXLabelArray();
			this.axisRenderer.showAxisLabels(xLabelArray);
		},

		_appendBorder: function() {
			this.$borderGroup.empty();
			var w = this.chartSetting.get('width');
			var h = this.chartSetting.get('height');
			graphicRenderer.appendLineElm(0, h, w, h, '#000', {
				id: 'xline'
			}, this.$borderGroup);
			graphicRenderer.appendLineElm(0, 0, 0, h, '#000', {
				id: 'yline'
			}, this.$borderGroup);
			graphicRenderer.appendLineElm(0, 0, w, 0, '#000', {
				id: 'x2line'
			}, this.$borderGroup);
			graphicRenderer.appendLineElm(w, 0, w, h, '#000', {
				id: 'y2line'
			}, this.$borderGroup);
		},

		/**
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		_appendChartElement: function(chartAreaWidth, chartAreaHeight, xStart, yStart) {
			var $graphicRootElm = this.$find('#' + this.chartId);
			if ($graphicRootElm != null && $graphicRootElm.length !== 0) {
				$graphicRootElm.empty();
				$graphicRootElm.attr('width', chartAreaWidth);
				$graphicRootElm.attr('height', chartAreaHeight);
			} else {
				$graphicRootElm = $(graphicRenderer.createGraphicRootElm({
					width: chartAreaWidth,
					height: chartAreaHeight,
					id: this.chartId
				}));

				$(this.rootElement).append($graphicRootElm);
			}

			this.$chart = $(graphicRenderer.createGroupElm({
				id: 'h5_chart'
			}));
			graphicRenderer.setTranslate(this.$chart, xStart, yStart);
			$graphicRootElm.append(this.$chart);

			this.$stickingGroups = $(graphicRenderer.createGroupElm({
				id: 'stickingGroups',
				'class': 'vml_absolute'
			}));
			this.$chart.append(this.$stickingGroups);

			this.$borderGroup = $(graphicRenderer.createGroupElm({
				id: 'borderGroup'
			}));
			this.$stickingGroups.append(this.$borderGroup);

			this.$chart.append(this._createMovingGroup($graphicRootElm));
		},

		_createMovingGroup: function($graphicRootElm) {
			this.$movingGroups = $(graphicRenderer.createGroupElm({
				id: 'movingGroup',
				'class': 'vml_absolute'
			}));

			// クリッピング
			if (graphicRenderer.isSvg) {
				var clipRect = graphicRenderer.createRectElm(0, 0, this.chartSetting.get('width'),
						this.chartSetting.get('height'));
				graphicRenderer.clip(this.$movingGroups, clipRect, 'moving_area_clip',
						$graphicRootElm);
			} else {
				this.$movingGroups.css('clip', 'rect(0px ' + this.chartSetting.get('width') + 'px '
						+ this.chartSetting.get('height') + 'px 0px)');
			}

			this.$tooltip = $(graphicRenderer.createGroupElm({
				id: 'tooltip',
				'font-family': 'Verdana'
			}));

			this.$movingGroups.append(this.$tooltip);

			return this.$movingGroups;
		},

		_updateChartElement: function(chartAreaWidth, chartAreaHeight, xStart, yStart) {
			var $graphicRootElm = this.$find('#' + this.chartId);
			$graphicRootElm.attr('width', chartAreaWidth);
			$graphicRootElm.attr('height', chartAreaHeight);

			graphicRenderer.setTranslate(this.$chart, xStart, yStart);

			// クリッピング
			if (graphicRenderer.isSvg) {
				graphicRenderer.attr(this.$find('#moving_area_clip').find('rect')[0], {
					width: this.chartSetting.get('width'),
					height: this.chartSetting.get('height')
				});
			} else {
				this.$movingGroups.css('clip', 'rect(0px ' + this.chartSetting.get('width') + 'px '
						+ this.chartSetting.get('height') + 'px 0px)');
			}
		},

		/**
		 * チャートの表示をされます
		 * 
		 * @param {Object} 設定オブジェクト
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		draw: function(settings) {
			this.isInitDraw = true;

			this.dataSourceManager = new DataSourceManager(this.chartSetting);

			// チャートのパラメータの設定
			if (settings != null) {
				this.settings = settings;

				var minVal = +Infinity;
				var maxVal = -Infinity;

				var range = settings.seriesDefault.range;
				if (range) {
					if (range.minVal != null) {
						minVal = range.minVal;
					}
					if (range.maxVal != null) {
						maxVal = range.maxVal;
					}
				}

				// TODO: axisRenderの中に移動したい
				var axesSetting = settings.axes;
				var yLabeLWidth;
				if (axesSetting && axesSetting.yaxis && axesSetting.yaxis.width) {
					yLabeLWidth = axesSetting.yaxis.width;
				} else {
					yLabeLWidth = DEFAULT_Y_LABEL_WIDTH;
				}

				if (axesSetting && axesSetting.yaxis) {
					yLabeLWidth += getMarginOrPadding(axesSetting.yaxis, 'margin', 'Right');
				}

				var xLabeLHeight;
				if (axesSetting && axesSetting.xaxis && axesSetting.xaxis.height) {
					xLabeLHeight = axesSetting.xaxis.height;
				} else {
					xLabeLHeight = DEFAULT_X_LABEL_HEIGHT;
				}

				if (axesSetting && axesSetting.xaxis) {
					xLabeLHeight += getMarginOrPadding(axesSetting.xaxis, 'margin', 'Top');
				}

				var chartSetting = settings.chartSetting;
				var plotSetting = settings.plotSetting;
				var width = chartSetting.width - yLabeLWidth
						- getMarginOrPadding(plotSetting, 'margin', 'Right')
						- getMarginOrPadding(chartSetting, 'margin', 'Left');
				var height = chartSetting.height - xLabeLHeight
						- getMarginOrPadding(plotSetting, 'margin', 'Top')
						- getMarginOrPadding(chartSetting, 'margin', 'Bottom');

				// TODO: 定義し直し(ばらす？)
				this.chartSetting.set({
					width: width,
					height: height,
					dispDataSize: settings.seriesDefault.dispDataSize,
					keepDataSize: settings.seriesDefault.keepDataSize,
					timeInterval: settings.timeInterval || 1,
					minVal: minVal,
					maxVal: maxVal,
					additionalLineColor: 'yellow'
				});

				var marginTop = getMarginOrPadding(plotSetting, 'margin', 'Top');
				if (marginTop == null) {
					marginTop = DEFAULT_CHART_MARGIN_TOP;
				}
				if (this.isFirstDraw) {
					this._appendChartElement(chartSetting.width, chartSetting.height, yLabeLWidth,
							marginTop);
				} else {
					this._updateChartElement(chartSetting.width, chartSetting.height, yLabeLWidth,
							marginTop);
				}
			}

			this._renderers = {};
			this._removeToolTip();

			// TODO: データ生成はイベントをあげるようにして、ここは同期的な書き方にしたほうがよいかもしれない
			this._createChartRenderes(this.settings).done(this.own(function() {
				this.isInitDraw = false;
				this._initChart(this._renderers[this.settings.series[0].name]); // チャート表示の初期化
				this._drawChart();// チャート情報の計算
				this.isFirstDraw = false;
			}));
		},

		_beginUpdateInner: function() {
			// 内部的なアップデートセッションを開始するメソッド
			// TODO: publicなものと統合
			this._isInInnerUpdate = true;
		},

		_endUpdateInner: function() {
			var addedMax = -Infinity;
			var addedMin = Infinity;
			var removedMax = -Infinity;
			var removedMin = Infinity;

			for ( var name in this._updateLog) {
				var renderer = this._renderers[name];

				var addedData = this._updateLog[name].add[0];
				var maxAndMinVals = renderer.chartDataSource.getMaxAndMinValsOf(addedData);
				addedMax = Math.max(addedMax, maxAndMinVals.maxVal);
				addedMin = Math.min(addedMin, maxAndMinVals.minVal);

				if (this._updateLog[name].remove.length != 0) {
					var removedData = this._updateLog[name].remove[0];
					var maxAndMinVals = renderer.chartDataSource.getMaxAndMinValsOf(removedData);
					removedMax = Math.max(removedMax, maxAndMinVals.maxVal);
					removedMin = Math.min(removedMin, maxAndMinVals.minVal);
				}
			}

			if (this._isUpdateRange(addedMax, addedMin, removedMax, removedMin)) {
				this._setRange();
			}

			this._isInInnerUpdate = false;
			this._updateLog = {};
		},

		_chartDataChangeListener: function(ev) {
			var name = ev.target.name;
			if (this._isInInnerUpdate) {
				// 内部アップデートセッション中はchartDataの変更をためておく
				if (!this._updateLog[name]) {
					this._updateLog[name] = {
						add: [],
						remove: []
					};
				}

				if (ev.add) {
					for (var i = 0, len = ev.add.length; i < len; i++) {
						this._updateLog[name].add.push(ev.add[i]);
					}
				}
				if (ev.remove) {
					for (var i = 0, len = ev.remove.length; i < len; i++) {
						this._updateLog[name].remove.push(ev.remove[i]);
					}
				}
			}
		},

		_isUpdateRange: function(adderdMax, addedMin, removedMax, removedMin) {
			var maxVal = this.chartSetting.get('maxVal');
			var minVal = this.chartSetting.get('minVal');
			return adderdMax > maxVal || addedMin < minVal || removedMax === maxVal
					|| removedMin === minVal;
		},

		/**
		 * アップデートセッションを開始します
		 * 
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		beginUpdate: function() {
			this._isInUpdate = true;
		},

		/**
		 * アップデートセッションを終了し、更新を反映します
		 * 
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		endUpdate: function() {
			this._isInUpdate = false;
			this._redraw();
		},

		_createChartRenderes: function(settings) {
			if (this.$seriesGroup == null) {
				this.$seriesGroup = $(graphicRenderer.createGroupElm({
					id: 'series_group'
				}));
				this.$movingGroups.prepend(this.$seriesGroup);
			} else {
				this.$seriesGroup.empty();
			}

			return this._addSeriesWithAsync(settings.series);
		},

		_createChartRenderer: function(g, dataSource, seriesOption) {
			var name = seriesOption.name;
			switch (seriesOption.type.toLowerCase()) {
			case 'ohlc':
				this._renderers[name] = createCandleStickChartRenderer(g, dataSource,
						this.chartSetting, seriesOption);
				break;
			case 'stacked_line':
			case 'line':
				this._renderers[name] = createLineChartRenderer(g, dataSource, this.chartSetting,
						seriesOption);
				break;
			case 'bar':
			case 'stacked_bar':
				this._renderers[name] = createBarChartRenderer(g, dataSource, this.chartSetting,
						seriesOption);
				break;
			case 'pie':
				this._renderers[name] = createPieChartRenderer(g, dataSource, this.chartSetting,
						seriesOption);
				break;
			default:
				break;
			}
			return this._renderers[name];
		},

		_getPreRenderer: function(currentRenderer) {
			var series = this.settings.series;
			if (!series || series.length == 1) {
				return null;
			}

			var name = currentRenderer.name;
			for (var i = 0, len = series.length; i < len; i++) {
				if (name === series[i].name) {
					return this._renderers[series[i - 1].name];
				}
			}
			return null;
		},

		_drawByRenderer: function(renderer) {
			var preRenderer = this._getPreRenderer(renderer);
			var preChartModel = preRenderer ? preRenderer.chartDataSource.chartModel : null;
			renderer.draw(true, preChartModel);
		},

		/**
		 * このチャートに設定した設定オブジェクトを取得します
		 * 
		 * @returns {Object} 設定オブジェクト
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		getSettings: function() {
			return this.settings;
		},

		/**
		 * チャート全体に影響する設定をセットします
		 * 
		 * @param {Object} チャート全体に関わる設定オブジェクト
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		setChartSetting: function(chartSetting) {
			var obj = {};
			if (chartSetting.width) {
				var yLabelMargin = this.axisRenderer.getYLabelMargin();
				obj.width = chartSetting.width - this.axisRenderer.getYLabelWidth()
						- yLabelMargin.marginRight - yLabelMargin.marginLeft;
			}
			if (chartSetting.height) {
				var xLabelMargin = this.axisRenderer.getXLabelMargin();
				obj.height = chartSetting.height - this.axisRenderer.getXLabelHeight()
						- xLabelMargin.marginTop - xLabelMargin.marginBottom;
			}

			this.chartSetting.set(obj);

			var firstRenderer = this._renderers[this.settings.series[0].name];
			this._initChart(firstRenderer); // チャート表示の初期化
			this._drawChart();// チャート情報の計算
		},


		_addSeriesWithAsync: function(series) {
			var promises = [];
			for (var i = 0, len = series.length; i < len; i++) {
				var seriesSettings = $.extend({}, this.settings.seriesDefault, series[i]);
				var g = graphicRenderer.createGroupElm({
					id: SERIES_PREFIX + series[i].name
				});
				if ($.inArray(series[i].type, STACKED_CHART_TYPES) === -1) {
					this.$seriesGroup.append(g);
				} else {
					this.$seriesGroup.prepend(g);
				}
				var dataSource = this.dataSourceManager.createDataSource(seriesSettings);
				var renderer = this._createChartRenderer(g, dataSource, seriesSettings);

				renderer.chartDataSource.addEventListener('dataChange', this
						.own(this._chartDataChangeListener));
				promises.push(renderer.chartDataSource.loadData(seriesSettings));
			}
			return $.when.apply($, promises);
		},

		/**
		 * 系列を追加します。
		 * 
		 * @param {Object} series 系列の設定オブジェクト
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		addSeries: function(series) {
			var thisSeries = this.settings.series;
			this._addSeriesWithAsync(series).done(this.own(function() {
				for (var i = 0, len = series.length; i < len; i++) {
					thisSeries.push(series[i]);
					var renderer = this._renderers[series[i].name];
					if (this._rendererQueue.length === 0) {
						// 描画中のものがなければ描画を開始する。
						this._drawByRenderer(renderer);
					}
					this._rendererQueue.push(renderer);
				}
			}));
		},

		/**
		 * 指定した名前の系列を削除します。
		 * 
		 * @param {String} name 系列名
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		removeSeries: function(names) {
			var array = $.isArray(names) ? names : [names];

			var seriesSettings = [];
			for (var i = 0, len = array.length; i < len; i++) {
				$(this._renderers[array[i]].rootElement).remove();
				this.dataSourceManager.removeDataSource(array[i]);
				delete this._renderers[array[i]];
				for (var j = 0, jLen = this.settings.series.length; j < jLen; j++) {
					if (this.settings.series[j].name === array[i]) {
						seriesSettings.push(this.settings.series.splice(j, 1)[0]);
						break;
					}
				}
			}

			// 再描画
			this._drawChart();

			return $.isArray(names) ? seriesSettings : seriesSettings[0];
		},

		_drawChart: function() {
			for ( var name in this._renderers) {
				this._renderers[name].draw();
			}
		},

		/**
		 * データを追加します。追加するデータは配列で指定し、各要素が持つname属性を使用して付加する系列を判定します。<br>
		 * dataで指定されなかった系列はcommonDataが挿入されます。
		 * 
		 * @param {Array} data 追加するデータの配列
		 * @param {Object} commonData 系列共通で指定するデータ
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		addData: function(data, commonData) {
			var individualSeries = [];

			this._beginUpdateInner();

			for (var i = 0, len = data.length; i < len; i++) {
				var name = data[i].name;
				individualSeries.push(name);
				this._renderers[name].addData(data[i].data);
			}

			var renderers = this._renderers;
			for ( var name in renderers) {
				if ($.inArray(name, individualSeries) !== -1) {
					continue;
				}
				renderers[name].addData(commonData);
			}

			this._endUpdateInner();

			// チャートを左にスライドする
			var translateX = this.chartSetting.get('translateX');
			this.chartSetting.set('translateX', translateX - this.chartSetting.get('dx'));

			this._addedCount++;
		},

		/**
		 * 表示位置を指定した数だけ進行方向にずらす。それ以上データが存在しない場合は、そこで停止します。
		 * 
		 * @param {Number} num 進行するデータ数
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		go: function(num) {
			var movedNum = this.chartSetting.get('movedNum');
			var move = Math.min(movedNum, num);

			this._beginUpdateInner();

			for ( var name in this._renderers) {
				var chartDataSource = this._renderers[name].chartDataSource;
				var rightEndId = chartDataSource.dataSource.sequence.current() - movedNum;
				var leftEndId = rightEndId - this.chartSetting.get('dispDataSize');
				for (var i = 0; i < move; i++) {
					var item = chartDataSource.getDataObj(rightEndId + i);
					chartDataSource.add(item);
					this._renderers[name].updateChart(item, leftEndId, false);
				}
			}

			this._endUpdateInner();

			var translateX = this.chartSetting.get('translateX');
			this.chartSetting.set('translateX', translateX - this.chartSetting.get('dx') * move);
			this.chartSetting.set('movedNum', movedNum - move);

			return move;
		},

		/**
		 * 表示位置を指定した数だけ進行方向と逆方向にずらす。それ以上データが存在しない場合は、そこで停止します。
		 * 
		 * @param {Number} num 進行するデータ数
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		back: function(num) {
			var movedNum = this.chartSetting.get('movedNum');

			this._beginUpdateInner();

			for ( var name in this._renderers) {
				var chartDataSource = this._renderers[name].chartDataSource;
				var rightEndId = chartDataSource.dataSource.sequence.current() - movedNum - 1;
				var leftEndId = rightEndId - this.chartSetting.get('dispDataSize');
				for (var i = 0; i < num; i++) {
					var item = chartDataSource.getDataObj(leftEndId - i);
					chartDataSource.add(item);
					this._renderers[name].updateChart(item, rightEndId, true);
				}
			}

			this._endUpdateInner();

			var translateX = this.chartSetting.get('translateX');
			this.chartSetting.set('translateX', translateX + this.chartSetting.get('dx') * num);
			this.chartSetting.set('movedNum', movedNum + num);
			return movedNum;
		},

		/**
		 * 系列共通の設定情報をセットします
		 * 
		 * @param {Object} obj 系列共通の設定オブジェクト
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		setSeriesDefault: function(obj) {
			if (obj.dispDataSize == null && obj.keepDataSize) {
				return;
			}

			for ( var name in obj) {
				this.chartSetting.set(name, obj[name]);
			}

			if (this.chartSetting.get('keepDataSize') < this.chartSetting.get('dispDataSize')) {
				this.chartSetting.set('dispDataSize', this.chartSetting.get('keepDataSize'));
			}

			this._redraw();
		},

		/**
		 * 軸の設定をセットします
		 * 
		 * @param{Object} axesSettings 軸の設定
		 */
		setAxesSetting: function(axesSettings) {
			$.extend(true, this.settings.axes, axesSettings);
			this._redraw();
		},

		_redraw: function() {
			if (this._isInUpdate) {
				return;
			}

			this._leftEndChartItemId = Infinity;
			this.isInitDraw = true;

			var firstRenderer = this._renderers[this.settings.series[0].name];
			this._setRange();
			this.isInitDraw = false;
			this._initChart(firstRenderer); // チャート表示の初期化
			this._drawChart();// チャート情報の計算
		},

		_setRange: function() {
			var maxAndMinVals = {
				maxVal: -Infinity,
				minVal: Infinity
			};
			for ( var name in this._renderers) {
				var renderer = this._renderers[name];
				var vals = renderer.chartDataSource.getMaxAndMinVals(this.chartSetting
						.get('dispDataSize'), this.chartSetting.get('movedNum'));
				maxAndMinVals = {
					maxVal: Math.max(vals.maxVal, maxAndMinVals.maxVal),
					minVal: Math.min(vals.minVal, maxAndMinVals.minVal)
				};
			}
			this.chartSetting.set(maxAndMinVals);
		},

		// １系列の描画が完了するごとに上がるイベント。次の系列の描画を開始する
		'#series_group finishDrawing': function() {
			this._rendererQueue.shift();
			var renderer = this._rendererQueue[0];
			if (renderer != null) {
				this._drawByRenderer(renderer);
			}
		},

		// 現在マウスがある位置のデータのツールバーを表示する
		'.chartElm mousemove': function(context, $el) {
			var seriesName = $el.parent().attr('id').slice(SERIES_PREFIX.length);
			var renderer = this._renderers[seriesName];
			var type = renderer.seriesSetting.type;

			var leftCorrect = 0;
			if (this.axisRenderer) {
				var yLabelMargin = this.axisRenderer.getYLabelMargin();
				leftCorrect = this.axisRenderer.getYLabelWidth() + yLabelMargin.marginRight + yLabelMargin.marginLeft;
			}
						
			// 補正項
			var correct = {
				left: this.chartSetting.get('translateX') + leftCorrect,
				top: DEFAULT_CHART_MARGIN_TOP
			};
			var tooltipId = renderer.getTargetId(context, type, correct);


			if (tooltipId == null) {
				return;
			}

			this.tooltip.id = tooltipId;
			this.tooltip.renderer = renderer;
			renderer.showToolTip(tooltipId, this.$tooltip);
		},

		_updateTooltip: function() {
			if (!this.tooltip.renderer) {
				return;
			}
			this.tooltip.renderer.updateTooltip(this.tooltip.id, this.$tooltip);
		},

		// ツールバーを除去する
		'#movingGroup removeTooltip': function(context) {
			if (context.evArg == this.tooltip.id) {
				this._removeToolTip();
			}
		},

		_removeToolTip: function() {
			this.$tooltip.empty();
			this.tooltip.id = null;
			this.tooltip.renderer = null;
		},

		// チャートの任意の点をクリックするとツールバーを除去する
		'{rootElement} click': function() {
			this.$tooltip.empty();
		}
	};

	h5.core.expose(chartController);
})(jQuery);