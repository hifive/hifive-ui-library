/*
 * Copyright (C) 2012-2014 NS Solutions Corporation
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
	var RECT_ELM_ID_FORMAT = 'rect_{0}';

	var VERT_LINE_ELM_ID_FORMAT = 'vert_line_{0}';
	var X_LABEL_ELM_ID_FORMAT = 'x_label_{0}';

	var TOOLTIP_TIME_FORMAT = '{0}-{1}';
	var TOOLTIP_OPEN_CLOSE_FORMAT = 'Open/Close= {0}/{1}';
	var TOOLTIP_HIGH_LOW_FORMAT = 'High/Low= {0}/{1}';

	var TOOLTIP_WIDTH = 150;
	var TOOLTIP_HEIGHT = 50;

	var PATH_LINE_FORMAT = 'L {0} {1} ';

	var SEQUENCE_START_INDEX = 1;

	var REFRESH_SIZE = 2;

	var X_LABEL_HEIGHT = 32;
	var Y_LABEL_WIDTH = 70;

	var TOOLTIP_MARGIN = {
		TOP: 10,
		LEFT: 10
	};

	var SERIES_PREFIX = '_series';

	var COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']; // TODO: デフォルトカラー決める

	var CHART_TYPES = ['line', 'ohlc', 'bar', 'stacked_line', 'stacked_bar'];

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


	/**
	 * ローソク表示用データを保持するモ
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
	 * グループ内でのY座標の位置を計算します
	 * 
	 * @param val
	 * @returns {Number}
	 */
	function calcYPos(val, rangeMin, rangeMax, height) {
		return -(val * 1000 - rangeMin * 1000) / (rangeMax * 1000 - rangeMin * 1000) * height
				+ height;
	}

	/**
	 * ２つの値からグループ内でのY座標の位置の差を計算します
	 * 
	 * @param val1
	 * @param val2
	 * @returns {Number}
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

	var dataSourceCounter = 0;

	function DataSource(name, seriesSetting, number) {
		this.name = name;
		this.seriesSetting = seriesSetting;
		this.number = number;
		this.sequence = h5.core.data.createSequence(SEQUENCE_START_INDEX);
		this.xLabelArray = null;
	}

	DataSource.prototype = {
		getData: function(series) {
			var that = this;
			this._getData(series).done(function(data) {
				that.convertToModel(series.type, data, series.propNames);
			});
		},

		/**
		 * チャート 行
		 * 
		 * @memberOf
		 * @returns Promiseオブジェクト
		 */
		_getData: function(series) {
			var dfd = $.Deferred();

			if (series.data == null) {
				// 初期表示データの取得
				h5.ajax({
					type: 'GET',
					dataType: 'text',
					url: series.url
				}).done(function(data) {
					dfd.resolve();
				});
			} else {
				var len = series.data.length;

				var keepDataSize = this.manager.chartSetting.get('keepDataSize');
				var _data = keepDataSize == null ? series.data : series.data.slice(len
						- keepDataSize);

				if (this.manager.chartSetting.get('dispDataSize') == null) {
					this.manager.chartSetting.set('dispDataSize', _data.length);
				}
				dfd.resolve(_data);
			}
			return dfd.promise();
		},

		convertToModel: function(type, data, propNames) {
			var modelBaseName = 'dataModel';
			this._type = type.toLowerCase();
			var schema;
			// var schema = rateDataSchema;
			switch (this._type) {
			case 'ohlc':
				this.propNames = propNames || {};
				this.highProp = this.propNames.high || 'high';
				this.lowProp = this.propNames.low || 'low';
				this.xProp = this.propNames.time || 'time';
				schema = this._createSchema(data[0]);
				break;
			case 'stacked_line':
			case 'line':
				this.propNames = propNames || {
					x: 'x',
					y: 'y'
				};
				// this.highProp = this.propNames.y || 'y';
				// this.lowProp = this.propNames.y || 'y';
				this.xProp = this.propNames.x || 'x';
				this.highProp = 'y';
				this.lowProp = 'y';
				// this.xProp = 'x';
				schema = this._createSchema(data[0]);
				break;
			default:
				modelBaseName = '';
				schema = '';
				break;
			}

			var modelName = modelBaseName + '_' + this.name + '_' + dataSourceCounter;
			dataSourceCounter++;

			if (this.dataModel != null) {
				chartDataModelManager.dropModel(this.dataMode.name);
			}

			this.dataModel = chartDataModelManager.createModel({
				name: modelName,
				schema: schema
			});

			this._calcDataItem(data, propNames);
		},

		getDataObj: function(id) {
			var item = this.dataModel.get(id);
			if (!item) {
				return null;
			}
			var obj = item.get();
			delete obj.id;
			for ( var name in obj) {
				if (this.propNames[name]) {
					obj[this.propNames[name]] = obj[name];
					delete obj[name];
				}
			}
			return obj;
		},

		createItem: function(data, chartSetting) {
			// if (chartSetting.get('keepDataSize') != null) {
			// this.dataModel.remove(this.sequence.current() - chartSetting.get('keepDataSize'));
			// }
			return this._calcDataItem([data], this.propNames)[0];
		},

		_createSchema: function(data) {
			var schema = {};
			for ( var name in data) {
				if (data.hasOwnProperty(name)) {
					var propName = name;
					for ( var key in this.propNames) {
						if (this.propNames[key] === name) {
							// propName = key;
							schema[key] = null;
						}
					}
					schema[propName] = null;
				}
			}
			schema.id = {
				id: true,
				type: 'integer'
			};
			return schema;
		},

		_calcDataItem: function(data, prop) {
			var arr = [];

			var chartSetting = this.manager.chartSetting;
			var dispDataSize = chartSetting.get('dispDataSize');
			var minVal = Infinity;
			var maxVal = -Infinity;

			for (var i = 0, len = data.length; i < len; i++) {
				var obj = this._toData(data[i], prop);
				arr.push(obj);
				if (len - dispDataSize <= i) {
					minVal = Math.min(minVal, this._getStackedVal(obj, this.lowProp));
					maxVal = Math.max(maxVal, this._getStackedVal(obj, this.highProp));
				}
			}

			if (!this.seriesSetting.axis || !this.seriesSetting.axis.yaixs
					|| this.seriesSetting.axis.yaxis.autoScale !== false) {
				chartSetting.set({
					minVal: Math.min(minVal, chartSetting.get('minVal')),
					maxVal: Math.max(maxVal, chartSetting.get('maxVal'))
				});
			}

			return this.dataModel.create(arr);
		},

		_getStackedVal: function(obj, propName) {
			if ($.inArray(this._type, STACKED_CHART_TYPES) === -1) {
				return obj[propName];
			}
			return obj[propName]
					+ this.manager.getStackedData(obj.id, propName, this.number)[propName];
		},

		_toData: function(data, prop) {
			// switch (this._type) {
			// case 'line':
			// return {
			// id: this.sequence.next(),
			// x: data[prop.x],
			// y: data[prop.y]
			// };
			// case 'candlestick':
			var ret = {
				id: this.sequence.next()
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

			// return $.extend({}, data, {
			// id: this.sequence.next()
			// });
			// }
		},

		getStackedData: function(item) {
			return this.manager.getStackedData(item.get('id'), this.propNames.y, this.number);
		},

		getMaxAndMinVals: function(rightEndId, dispDataSize) {
			var maxVal = -Infinity;
			var minVal = Infinity;

			var current = rightEndId || this.sequence.current();
			var item = null;
			// 表示対象の中で、最大・最小を求める
			for (var i = current - dispDataSize + 1; i <= current; i++) {
				item = this.dataModel.get(i);
				if (item === null) {
					continue;
				}

				var high = item.get(this.highProp);
				var low = item.get(this.lowProp);

				if (high > maxVal) {
					maxVal = high;
				}
				if (low < minVal) {
					minVal = low;
				}
			}
			return {
				maxVal: maxVal,
				minVal: minVal
			};
		},

		getXVal: function(idOrItem) {
			if (idOrItem == null) {
				return null;
			}
			var item;
			if (typeof (idOrItem.getModel) === 'function' && idOrItem.getModel() === this.dataModel) {
				item = idOrItem;
			} else {
				item = this.dataModel.get(idOrItem);
			}
			return item.get(this.xProp);
		},

		checkRange: function(addedItem, removedItem, dispDataSize, rightEndId) {
			if (this.seriesSetting.axis && this.seriesSetting.axis.yaixs
					&& this.seriesSetting.axis.yaxis.autoScale === false) {
				return;
			}

			this.manager.checkRange(addedItem.get(this.highProp), addedItem.get(this.lowProp),
					removedItem.get(this.highProp), removedItem.get(this.lowProp), rightEndId,
					dispDataSize);
		}
	};

	/**
	 * @class
	 * @name dataSourceManager
	 */
	function DataSourceManager(chartSetting) {
		this._count = 0;
		this._map = {};
		this.chartSetting = chartSetting;
	}

	DataSourceManager.prototype = {
		checkRange: function(adderdMax, addedMin, removedMax, removedMin, rightEndId) {
			if (this._isUpdateRange(adderdMax, addedMin, removedMax, removedMin)) {
				this.setRange(rightEndId);
			}
		},

		setRange: function(rightEndId) {
			this.chartSetting.set(this.getMaxAndMinVals(rightEndId, this.chartSetting
					.get('dispDataSize')));
		},

		_isUpdateRange: function(adderdMax, addedMin, removedMax, removedMin) {
			var maxVal = this.chartSetting.get('maxVal');
			var minVal = this.chartSetting.get('minVal');
			return adderdMax > maxVal || addedMin < minVal || removedMax === maxVal
					|| removedMin === minVal;
		},

		getAllDataSources: function() {
			return this._map;
		},

		getStackedData: function(id, yProp, number) {
			var stackedVal = 0;
			for ( var name in this._map) {
				var dataSource = this._map[name];
				if (dataSource.number < number) {
					stackedVal += dataSource.dataModel.get(id).get(yProp);
				}
			}

			var ret = {};
			ret.id = id;
			ret[yProp] = stackedVal;
			return ret;
		},

		createDataSource: function(seriesSetting) {
			var name = seriesSetting.name;
			this._map[name] = new DataSource(name, seriesSetting, this._count);
			this._map[name].manager = this;
			this._count++;
			return this._map[name];
		},

		removeDataSource: function(name) {
			delete this._map[name];
		},

		getDataSource: function(name) {
			return this._map[name];
		},

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
		}
	};


	// チャートレンダラ―の定義

	var rendererNum = 0;

	function getDefaultTooltip(data) {
		var time = h5format(TOOLTIP_TIME_FORMAT, data.openTime, data.closeTime);
		var open_close = h5format(TOOLTIP_OPEN_CLOSE_FORMAT, data.open, data.close);
		var high_low = h5format(TOOLTIP_HIGH_LOW_FORMAT, data.high, data.low);
		return time + '<br>' + open_close + '<br>' + high_low;
	}


	function createChartRenderer(rootElement, dataSource, chartSetting, seriesSetting, schema,
			prototype) {

		function ChartRendererBase(rootElement, dataSource, chartSetting, seriesSetting, schema) {
			this.dataSource = dataSource;
			this.name = dataSource.name;
			this.chartSetting = chartSetting;
			this.rootElement = rootElement;
			this.seriesSetting = seriesSetting;
			this.isReadyToAdd = false;

			if (!graphicRenderer.isSvg) {
				this.COORDSIZE = this.chartSetting.get('width') + ' '
						+ this.chartSetting.get('height');
			}

			this.chartModel = chartDataModelManager.createModel({
				name: 'chartModel_' + rendererNum + '_' + this.name,
				schema: schema
			});

			rendererNum++;

			var that = this;
			this.chartModel.addEventListener('itemsChange', function(ev) {
				that._chartModelChangeListener.apply(that, [ev]);
			});

			this.leftEndCandleStickId = Infinity;
		}

		ChartRendererBase.prototype = {
			addData: function(data) {
				// this.seriesSetting.data.push(data);
				var dataSource = this.dataSource;

				// データを1つ分受け取って、チャートを更新する
				var item = dataSource.createItem(data, this.chartSetting);

				this.updateChart(item);

				dataSource.dataModel.remove(item.get('id') - this.chartSetting.get('keepDataSize'));
			},

			updateChart: function(addedItem, removedItemId, isRightEndRemove) {
				// ローソク情報を計算する
				var chartItem = this.createItem(addedItem);

				this.getXLabelArray();

				// チャートのローソクを更新する
				var dispDataSize = this.chartSetting.get('dispDataSize');
				if (removedItemId == null) {
					// 表示範囲の左端のIDを取得
					removedItemId = addedItem.get('id') - dispDataSize
							- this.chartSetting.get('movedNum');
					isRightEndRemove = false;
				}
				this.removeChartElm(removedItemId);

				var removedItem = this.dataSource.dataModel.get(removedItemId);

				var rightEndId = isRightEndRemove ? removedItemId - 1 : addedItem.get('id');
				this.dataSource.checkRange(addedItem, removedItem, dispDataSize, rightEndId);

				this._appendChart([chartItem]);
			},


			updateYVal: function() {
				chartDataModelManager.beginUpdate();
				for ( var id in this.chartModel.items) {
					var intId = parseInt(id);
					// 描画範囲のローソクは座標情報を計算する
					var item = this.dataSource.dataModel.get(intId);
					var chartItem = this.chartModel.get(intId);
					if (chartItem != null) {
						chartItem.set(this.toData(item));
					}
				}
				chartDataModelManager.endUpdate();
			},

			removeChartElm: function(id) {
				var $root = $(this.rootElement);

				this.chartModel.remove(id);

				$(this.rootElement).trigger('removeTooltip', id);

				// TODO: ID体系、DOM構成見直し. ローソクには同じクラス名あてたほうがよいかも。
				$root.find('#' + h5format(LINE_ELM_ID_FORMAT, id)).remove();
				$root.find('#' + h5format(RECT_ELM_ID_FORMAT, id)).remove();
				$root.find('#' + h5format(VERT_LINE_ELM_ID_FORMAT, id)).remove();
				$root.find('#' + h5format(X_LABEL_ELM_ID_FORMAT, id)).remove();
			},

			getTargetId: function(context, type) {
				if (graphicRenderer.isSvg && type !== 'line') {
					return context.event.target.id.split('_')[1];
				}
				var ev = context.event;
				var t = ev.currentTarget;

				var top = t.offsetTop || t.clientTop;
				var left = t.offsetLeft || t.clientLeft;

				if (graphicRenderer.isSvg && !h5.env.ua.isIE) {
					top -= 10;
					left -= this.chartSetting.get('translateX') + Y_LABEL_WIDTH / 2;
				}

				var oy = ev.offsetY;
				var ox = ev.offsetX;

				var items = this.chartModel.toArray();
				for (var i = items.length - 1; 0 <= i; i--) {
					var r = this.getRectPos(items[i]);
					if (r.sx - left <= ox && ox <= r.ex - left && r.sy - top - 1 <= oy
							&& oy <= r.ey - top + 1) {
						return items[i].get('id');
					}
				}
			},

			showToolTip: function(tooltipId, $tooltip) {
				if (this.seriesSetting.mouseover && this.seriesSetting.mouseover.tooltip === false) {
					return;
				}

				var dataItem = this.dataSource.dataModel.get(tooltipId);
				var chartItem = this.chartModel.get(tooltipId);

				if (chartItem == null) {
					return;
				}

				$tooltip.empty();

				var coord = this._getCentralPos(chartItem);

				if (coord.x + TOOLTIP_WIDTH + TOOLTIP_MARGIN.LEFT > -this.chartSetting
						.get('translateX')
						+ this.chartSetting.get('width')) {
					coord.x -= (TOOLTIP_WIDTH + TOOLTIP_MARGIN.LEFT);
				} else {
					coord.x += TOOLTIP_MARGIN.LEFT;
				}

				if (coord.y + TOOLTIP_HEIGHT + TOOLTIP_MARGIN.TOP > this.chartSetting.get('height')) {
					coord.y -= (TOOLTIP_HEIGHT + TOOLTIP_MARGIN.TOP);
				} else {
					coord.y += TOOLTIP_MARGIN.TOP;
				}

				var showTooltip = this.seriesSetting.mouseover.tooltip.content || getDefaultTooltip;
				var content = showTooltip(dataItem.get());
				var rect = graphicRenderer.createRectElm(coord.x, coord.y, TOOLTIP_WIDTH,
						TOOLTIP_HEIGHT, '#eee', {});

				$tooltip.append(rect);
				graphicRenderer.appendTextElm(content, coord.x, coord.y + 20, '#000', {
					'font-size': 11
				}, graphicRenderer.isSvg ? $tooltip : $(rect)); // VMLの場合はTEXT要素をRECT要素にappendする

				this._appendHighLight(chartItem, $tooltip);
				this.showAdditionalLine(tooltipId, $tooltip);
			},

			showAdditionalLine: function(tooltipId, $tooltip) {
				var chartItem = this.chartModel.get(tooltipId);
				var pos = this._getCentralPos(chartItem);
				var startX = Math.abs(this.chartSetting.get('translateX'));
				var lineColor = this.chartSetting.get('additionalLineColor');

				// Y軸に補助線を引く
				$tooltip.prepend(graphicRenderer.createLineElm(startX, pos.y, startX
						+ (this.chartSetting.get('width') * 2), pos.y, lineColor, null));
				// X軸に補助線を引く
				$tooltip.prepend(graphicRenderer.createLineElm(pos.x, 0, pos.x, this.chartSetting
						.get('height'), lineColor, null));
			},

			getXLabelArray: function() {
				var vertLineNum = this.chartSetting.get('vertLineNum');

				if (vertLineNum === 0) {
					return;
				}

				if (this.xLabelArray == null) {
					this.xLabelArray = h5.core.data.createObservableArray();
				}
				var rightItemId = this.dataSource.sequence.current() - 1;

				var dispSizeNum = this.chartSetting.get('dispDataSize');

				var itemInterval = (dispSizeNum - 1) / vertLineNum;
				var id = rightItemId - dispSizeNum + 1;
				for (var i = 0; i <= vertLineNum; i++) {
					var item = this.dataSource.getDataObj(id);
					this.xLabelArray.set(i, {
						value: item[this.dataSource.xProp],
						item: item
					});
					id += itemInterval;
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

	// ローソクチャートのレンダラ―
	function createCandleStickChartRenderer(rootElement, dataSource, chartSetting, seriesSetting) {
		return createChartRenderer(
				rootElement,
				dataSource,
				chartSetting,
				seriesSetting,
				candleStickSchema,
				{
					_getCentralPos: function(chartItem) {
						return {
							x: chartItem.get('rectX') + (chartItem.get('rectWidth') / 2),
							y: chartItem.get('rectY') + (chartItem.get('rectHeight') / 2)
						};
					},

					/**
					 * ーソク を生成する
					 * 
					 * @memberOf candleStickRenderer
					 */
					createCandleStickDataItems: function() {
						this.chartModel.removeAll();

						var candleStickData = [];
						var current = this.dataSource.sequence.current();
						for ( var id in this.dataSource.dataModel.items) {
							if (id >= current - this.chartSetting.get('dispDataSize')) {
								// 描画範囲のローソクは座標情報を計算する
								var dataItem = this.dataSource.dataModel.items[id];
								candleStickData.push(this.toData(dataItem));
							}
						}
						this.chartModel.create(candleStickData);
					},

					createItem: function(dataItem) {
						return this.chartModel.create(this.toData(dataItem));
					},

					/**
					 * * ロ ータを取得す
					 * 
					 * @memberOf candleStickRenderer
					 * @param {object} chart チャート情報
					 * @returns {object} ローソクの座標情報
					 */
					toData: function(chartDataItem) {
						var id = chartDataItem.get('id');
						var open = chartDataItem.get('open');
						var close = chartDataItem.get('close');
						var time = chartDataItem.get(this.dataSource.xProp);

						return $.extend(this._calcCandleYValues(chartDataItem), {
							id: id,
							rectWidth: this.chartSetting.get('dx') * 0.8,
							fill: open > close ? 'blue' : open === close ? 'black' : 'red',
							lineX: id * this.chartSetting.get('dx')
									+ this.chartSetting.get('width'),
							time: time
						});
					},

					_calcCandleYValues: function(chartDataItem) {
						var open = chartDataItem.get('open');
						var close = chartDataItem.get('close');
						var min = this.chartSetting.get('rangeMin');
						var max = this.chartSetting.get('rangeMax');
						var height = this.chartSetting.get('height');

						return {
							rectY: calcYPos(Math.max(open, close), min, max, height),
							rectHeight: open !== close ? calcYDiff(open, close, min, max, height)
									: 1,
							lineY1: calcYPos(chartDataItem.get('low'), min, max, height),
							lineY2: calcYPos(chartDataItem.get('high'), min, max, height)
						};
					},

					draw: function() {
						$(this.rootElement).empty();
						this.createCandleStickDataItems();
						if (graphicRenderer.isSvg) {
							this._showSVGCandleSticks(); // ローソクを描画
						} else {
							this._showVMLCandleSticks(); // ローソクを描画
						}
					},

					_showSVGCandleSticks: function() {
						var candleSticks = this.chartModel.toArray();
						for (var i = 0, len = candleSticks.length; i < len; i++) {
							this.appendCandleStick(candleSticks[i], this.rootElement);
						}
					},

					_appendChart: function(items) {
						if (graphicRenderer.isSvg) {
							this.appendCandleStick(items[0], this.rootElement);
						} else {
							this.updateCandleStick();
						}
					},

					appendCandleStick: function(candleStickItem, parent) {
						var $parent = $(parent);

						this._appendCandleStick(candleStickItem, $parent, '#000', {
							id: h5format(LINE_ELM_ID_FORMAT, candleStickItem.get('id')),
							'class': 'candleStickChart chartElm'
						}, candleStickItem.get('fill'), {
							id: h5format(RECT_ELM_ID_FORMAT, candleStickItem.get('id')),
							'class': 'candleStickChart chartElm'
						});
					},

					_appendHighLight: function(candleStickItem, $tooltip) {
						if (graphicRenderer.isSvg) {
							this._appendCandleStick(candleStickItem, $tooltip, 'yellow', {
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

					_appendCandleStick: function(candleStickItem, $parent, lineColor, lineProp,
							rectColor, rectProp) {
						graphicRenderer.appendLineElm(candleStickItem.get('lineX'), candleStickItem
								.get('lineY1'), candleStickItem.get('lineX'), candleStickItem
								.get('lineY2'), lineColor, lineProp, $parent);

						graphicRenderer.appendRectElm(candleStickItem.get('rectX'), candleStickItem
								.get('rectY'), candleStickItem.get('rectWidth'), candleStickItem
								.get('rectHeight'), rectColor, rectProp, $parent);
					},

					_chartModelChangeListener: function(ev) {
						var $root = $(this.rootElement);

						// 表示範囲が広がった時に、左端のidを探す
						for (var i = 0, len = ev.created.length; i < len; i++) {
							if (ev.created[i].get('id') < this.leftEndCandleStickId) {
								this.leftEndCandleStickId = ev.created[i].get('id');
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
							var $line = $root.find('#'
									+ h5format(LINE_ELM_ID_FORMAT, item.get('id')));
							$line.attr({
								y1: item.get('lineY1'),
								y2: item.get('lineY2')
							});
							var $rect = $root.find('#'
									+ h5format(RECT_ELM_ID_FORMAT, item.get('id')));
							$rect.attr({
								y: item.get('rectY'),
								height: item.get('rectHeight')
							});
						}
					},

					// VML用

					_showVMLCandleSticks: function() {
						this.updateCandleStick();
					},

					updateCandleStick: function(newCandleStick, removeId) {
						var data = this._getShapePaths();
						this._updateHighLowShape(data);
						this._updateOpenCloseShape(data);
					},

					_getShapePaths: function() {
						var lines = [];
						var rects = {}; // fillの種類ごとに配列を持つ(1shapeにつき1色しか持てないため)
						var cdata = {};

						for ( var id in this.chartModel.items) {
							var data = this.chartModel.get(id);

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
						var highlowLineShape = $(this.rootElement).find(
								'.candleStickChart.chartElm')[0];

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
						for (rectPaths in rects) {
							if (!rects.hasOwnProperty(rectPaths)) {
								continue;
							}

							var rectShape = $(this.rootElement).find(
									'.candleStickChart.' + rectPaths)[0];
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

					getRectPos: function(item) {
						return {
							sx: parseInt(item.get('rectX')),
							sy: parseInt(item.get('rectY')),
							ex: parseInt(item.get('rectX') + item.get('rectWidth')),
							ey: parseInt(item.get('rectY') + item.get('rectHeight'))
						};
					}
				});
	}

	/**
	 * ラインチャートレンダラ―を生成する。
	 * 
	 * @private
	 * @returns LineChartRenderer
	 */
	function createLineChartRenderer(rootElement, dataSource, chartSetting, seriesSetting) {
		return createChartRenderer(rootElement, dataSource, chartSetting, seriesSetting,
				lineSchema, {

					_getCentralPos: function(chartItem) {
						return {
							x: chartItem.get('toX'),
							y: chartItem.get('toY')
						};
					},

					getLeftEndItemId: function() {
						return this.leftEndCandleStickId;
					},

					draw: function(preRendererChartModel) {
						$(this.rootElement).empty();
						this.$path = null;

						this.createLineDataItems(preRendererChartModel);

						var count = 0;
						var animateNum = this.seriesSetting.animateNum;
						if (preRendererChartModel == null || animateNum < 1) {
							animateNum = 1;
						}

						var that = this;
						function doAnimation() {
							that.appendLines(that.chartModel.toArray(), preRendererChartModel,
									count / animateNum);
							count++;
							if (count < animateNum) {
								requestAnimationFrame(doAnimation);
							} else {
								// 描画完了時にイベントをあげる
								$(that.rootElement).trigger('finishDrawing');
							}
						}
						requestAnimationFrame(doAnimation);
					},

					_appendChart: function(elms) {
						// this.appendLines(elms);
						this.appendLines();
					},

					_calcY: function(item, prop, preRendererChartModel, rate) {
						if (!preRendererChartModel || rate === 1) {
							return item.get(prop);
						}

						return (1 - rate) * preRendererChartModel.get(item.get('id')).get(prop)
								+ rate * item.get(prop);
					},

					appendLines: function(lines, preRendererChartModel, rate) {
						graphicRenderer.isSvg ? this._appendLinesForSvg(lines,
								preRendererChartModel, rate) : this._appendLinesForVml();
					},

					_appendLinesForSvg: function(lines, preRendererChartModel, rate) {
						var $root = $(this.rootElement);
						var chartItems = sortById(lines || this.chartModel.toArray());
						var item0 = chartItems[0];
						var d = 'M' + item0.get('fromX') + ' '
								+ this._calcY(item0, 'fromY', preRendererChartModel, rate) + ' ';
						var len = chartItems.length;
						for (var i = 0; i < len; i++) {
							d += h5format(PATH_LINE_FORMAT, chartItems[i].get('toX'), this._calcY(
									chartItems[i], 'toY', preRendererChartModel, rate));
						}
						var fill = this._getFill();
						if (fill != null) {
							d += h5format(PATH_LINE_FORMAT, chartItems[len - 1].get('toX'),
									this.chartSetting.get('height'))
									+ h5format(PATH_LINE_FORMAT, item0.get('fromX'),
											this.chartSetting.get('height')) + ' Z';
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

						var lineData = this.chartModel.toArray();
						var lineShape = graphicRenderer.createShapeElm();
						graphicRenderer.css(lineShape, {
							width: this.chartSetting.get('width'),
							height: this.chartSetting.get('height'),
							position: 'absolute'
						});
						var fill = this._getFill();
						//						if (!fill) {
						//							fill = {
						//								color: '#000'
						//							};
						//						}
						graphicRenderer.fill(lineShape, fill);
						graphicRenderer.stroke(lineShape, {
							on: true,
							fill: fill.color
						});
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
							lineShapePath += h5format(',{0},{1}', firstX, parseInt(lineData[0]
									.get('fromY')));
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

					createItem: function(dataItem) {
						return this.chartModel.create(this.toData(dataItem));
					},

					createLineDataItems: function(preRendererChartModel) {
						this.chartModel.removeAll();

						var lineData = [];
						var current = this.dataSource.sequence.current()
								- chartSetting.get('movedNum');
						var dispDataSize = this.chartSetting.get('dispDataSize');
						for ( var id in this.dataSource.dataModel.items) {
							var intId = parseInt(id);
							if (intId < current - dispDataSize || intId >= current) {
								continue;
							}

							// 描画範囲のローソクは座標情報を計算する
							var item = this.dataSource.dataModel.get(intId);
							lineData.push(this.toData(item));
						}
						this.chartModel.create(lineData);
					},

					// TODO: xの位置がデータに依存しない
					toData: function(currentItem) {
						var id = currentItem.get('id');
						var pre = this.dataSource.dataModel.get(id - 1);
						if (pre == null) {
							// preがnullのときは、データとしても端であり、このときはただの点を表示する
							pre = currentItem;
						}

						var min = this.chartSetting.get('rangeMin');
						var max = this.chartSetting.get('rangeMax');
						var height = this.chartSetting.get('height');

						var yProp = this.dataSource.propNames.y;
						//var yProp = 'y';
						var fromY = pre.get(yProp);
						var toY = currentItem.get(yProp);

						if ($.inArray(this.seriesSetting.type, STACKED_CHART_TYPES) !== -1) {
							fromY += this.dataSource.getStackedData(pre)[yProp];
							toY += this.dataSource.getStackedData(currentItem)[yProp];
						}

						return {
							id: id,
							fromX: (id - 1) * this.chartSetting.get('dx')
									+ this.chartSetting.get('width'),
							toX: id * this.chartSetting.get('dx') + this.chartSetting.get('width'),
							fromY: calcYPos(fromY, min, max, height),
							toY: calcYPos(toY, min, max, height)
						};
					},

					getXCoord: function(idOrItem) {
						if (idOrItem == null) {
							return null;
						}
						var item;
						if (typeof (idOrItem.getModel) === 'function'
								&& idOrItem.getModel() === this.chartModel) {
							item = idOrItem;
						} else {
							item = this.chartModel.get(idOrItem);
						}
						return item.get('toX');
					},

					getXVal: function(idOrItem) {
						return this.dataSource.getXVal(idOrItem);
					},

					_chartModelChangeListener: function(ev) {
						// 表示範囲が広がった時に、左端のidを探す
						for (var i = 0, len = ev.created.length; i < len; i++) {
							if (ev.created[i].get('id') < this.leftEndCandleStickId) {
								this.leftEndCandleStickId = ev.created[i].get('id');
							}
						}

						// // 座標情報が変更されたときに、表示に反映する
						if (ev.changed.length > 0) {
							this.appendLines();
						}

						// var $root = $(this.rootElement);
						// for ( var i = 0, len = ev.changed.length; i < len; i++) {
						// var changed = ev.changed[i];
						// if (changed.props.fromY == null && changed.props.toY == null) {
						// return;
						// }
						//
						// var item = changed.target;
						// var $line = $root.find('#'
						// + h5format(LINE_ELM_ID_FORMAT, item.get('id')));
						// $line.attr({
						// y1: item.get('fromY'),
						// y2: item.get('toY')
						// });
						// }
					},

					getRectPos: function(item) {
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

					}
				});
	}

	function AxisRenderer(axesElm, chartSetting, axesSettings) {
		this.rootElement = axesElm;
		this.$horizLines = null;
		this.$vertLines = null;

		this.chartSetting = chartSetting;

		this.setAxesSetting(axesSettings);

		var that = this;
		function scaling(min, max) {
			var range;
			if (that.autoScale) {
				range = that.autoScale(min, max);
			} else {
				range = that.defaultAutoScale(min, max);
			}
			chartSetting.set(range);
		}

		scaling(chartSetting.get('minVal'), chartSetting.get('maxVal'));

		chartSetting.addEventListener('change', function(ev) {
			if (ev.props.minVal != null || ev.props.maxVal != null) {
				var minVal = ev.target.get('minVal');
				var maxVal = ev.target.get('maxVal');
				if (minVal === Infinity || maxVal === -Infinity) {
					return;
				}
				scaling(minVal, maxVal);
			}
			if (ev.props.rangeMin != null || ev.props.rangeMax != null) {
				// rangeが変更されたので、水平方向の補助線を引き直す
				that._drawHorizLines();
			}
		});
	}

	AxisRenderer.prototype = {

		defaultAutoScale: function(min, max) {
			return {
				rangeMin: min,
				rangeMax: max
			};
		},

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
					var orgValue = this.get(index).value;
					if (ev.method !== 'set' || value === orgValue) {
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
			if (!graphicRenderer.isSvg) {
				x -= 10;
			}

			for (i = 0, len = this.xLabelArray.length; i < len; i++) {
				var label = this._getXLabel(this.xLabelArray.get(i), i);
				var height = this.chartSetting.get('height');
				var textY = graphicRenderer.isSvg ? height + 11 : height + 5;
				graphicRenderer.appendTextElm(label, x, textY, null, {
					'class': 'xLabel',
					'text-anchor': 'middle'
				}, this.$vertLines);
				x += xInterval;
			}
		},

		_getXLabel: function(xLabelObj, index) {
			return this._xLabelFormatter(xLabelObj.value, xLabelObj.item, index);
		},

		drawGridLines: function() {
			this._drawHorizLines(); // 水平方向の補助線を引く
			this._drawVertLines();
		},

		// _appendVertLine: function(dataItem, chartItem, id, renderer) {
		// var $vertLines = this.$vertLines;
		//
		// if ((id + 1) % (this.chartSetting.get('dispDataSize') /
		// this.chartSetting.get('vertLineNum')) === 0) { //

		// TODO: idでなく時間によって線を表示するように変更する
		// var x = renderer.getXCoord(chartItem);
		// var text = renderer.getXVal(dataItem);
		//
		// graphicRenderer.appendLineElm(x, 0, x, this.chartSetting.get('height'), '#CCC', {
		// id: h5format(VERT_LINE_ELM_ID_FORMAT, id)
		// }, $vertLines);
		//
		// graphicRenderer.appendTextElm(text, x, this.chartSetting.get('height') + 10, null, {
		// 'text-anchor': 'middle',
		// 'font-size': 9,
		// id: h5format(X_LABEL_ELM_ID_FORMAT, id)
		// }, $vertLines);
		// }
		//

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
				var val = yInterval * i + rangeMin;
				var y = calcYPos(val, rangeMin, rangeMax, this.chartSetting.get('height'));

				// 目盛を付ける
				var textY = graphicRenderer.isSvg ? y + 2 : y - 7;

				graphicRenderer.appendTextElm(this._yLabelFormatter(val, i), -30, textY, null, {
					'class': 'added',
					'font-size': this._axesSettings.yaxis.fontSize
				}, this.$horizLines);

				if (val === rangeMin || val === rangeMax) {
					continue;
				}

				graphicRenderer.appendLineElm(0, y, width, y, '#ccc', {
					'class': 'added'
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

				var x = dx * 0.5;
				for (var i = 0; i <= vertLineNum; i++) {
					graphicRenderer.appendLineElm(x, 0, x, height, '#CCC', null, this.$vertLines);
					x += xInterval;
				}

				return;
			}


			// rendererが指定されているとき
			// this.$movingGroups.append(this.$vertLines);
			// for ( var id in renderer.chartModel.items) {
			// var dataItem = renderer.dataSource.dataModel.get(id);
			// var chartItem = renderer.chartModel.get(id);
			// this._appendVertLine(dataItem, chartItem, parseInt(id), renderer);
			// }
		},

		setAxesSetting: function(axesSettings) {
			this._axesSettings = axesSettings;
			this.chartSetting.set({
				vertLineNum: !axesSettings.xaxis.off ? axesSettings.xaxis.lineNum + 1 : 0,
				horizLineNum: axesSettings.yaxis.lineNum
			});
			this.autoScale = axesSettings.yaxis.autoScale || this.defaultAutoScale;
			this._xLabelFormatter = axesSettings.xaxis.formatter || this._xLabelDefaultFormatter;
			this._yLabelFormatter = axesSettings.yaxis.formatter || this._yLabelDefaultFormatter;
		},

		_xLabelDefaultFormatter: function(value, data, index) {
			return value.toString();
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
	chartController = {

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

		__ready: function() {
			this.chartId = '__h5_chart' + chartSequense;
			chartSequense++;

			this.chartSetting = h5.core.data.createObservableItem(chartSettingsSchema);
			this.dataSourceManager = new DataSourceManager(this.chartSetting);
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
		 * * チャートの初期表示を行う
		 * 
		 * @memberOf h5.ui.components.chart.ChartController
		 */
		_initChart: function(firstChartRenderer) {
			this._appendBorder();
			this._initAxis(firstChartRenderer);
			var rightId = firstChartRenderer.dataSource.sequence.current() - 1;
			var paddingRight = this.settings.chartSetting.paddingRight;
			if (paddingRight == null) {
				paddingRight = 0;
			}
			// TODO: translateXの計算は共通化すべき
			this.chartSetting.set('translateX', -this.chartSetting.get('dx')
					* (rightId + paddingRight - this.chartSetting.get('movedNum')));
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
		_appendChartElement: function(props) {
			var w = props.width;
			var h = props.height;

			var xStart = Y_LABEL_WIDTH / 2;
			var yStart = 10;

			var $graphicRootElm = this.$find('#' + this.chartId);
			if ($graphicRootElm != null && $graphicRootElm.length !== 0) {
				$graphicRootElm.empty();
				$graphicRootElm.attr('width', w + Y_LABEL_WIDTH);
				$graphicRootElm.attr('height', h + X_LABEL_HEIGHT);
			} else {
				$graphicRootElm = $(graphicRenderer.createGraphicRootElm({
					width: w + Y_LABEL_WIDTH,
					height: h + X_LABEL_HEIGHT,
					id: this.chartId
				}));

				$(this.rootElement).append($graphicRootElm);
			}

			this.$chart = $(graphicRenderer.createGroupElm({
				id: 'h5_chart',
				transform: 'translate(' + xStart + ', ' + yStart + ')'
			}));
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

			this.$chart.append(this.$movingGroups);

			this.$tooltip = $(graphicRenderer.createGroupElm({
				id: 'tooltip',
				'font-family': 'Verdana'
			}));

			this.$movingGroups.append(this.$tooltip);
		},

		draw: function(settings) {
			this.isInitDraw = true;

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

				// TODO: 定義し直し(ばらす？)
				this.chartSetting.set({
					width: settings.chartSetting.width - Y_LABEL_WIDTH,
					height: settings.chartSetting.height - X_LABEL_HEIGHT,
					dispDataSize: settings.seriesDefault.dispDataSize,
					keepDataSize: settings.seriesDefault.keepDataSize,
					timeInterval: settings.timeInterval || 1,
					minVal: minVal,
					maxVal: maxVal,
					additionalLineColor: 'yellow'
				});
			}

			if (this.isFirstDraw) {
				this._appendChartElement(this.chartSetting.get());
			}

			this.$tooltip.empty();

			// TODO: データ生成はイベントをあげるようにして、ここは同期的な書き方にしたほうがよいかもしれない
			this._createChartRenderes(this.settings).done(this.own(function() {
				this.isInitDraw = false;
				this._initChart(this._renderers[this.settings.series[0].name]); // チャート表示の初期化
				this._drawChart();// チャート情報の計算
				this.isFirstDraw = false;
			}));
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

			// this._renderers = {};
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
			default:
				break;
			}
			return this._renderers[name];
		},

		_getPreRenderer: function(currentRenderer) {
			var name = currentRenderer.name;
			var series = this.settings.series;
			for (var i = 0, len = series.length; i < len; i++) {
				if (name === series[i].name) {
					return this._renderers[series[i - 1].name];
				}
			}
			return null;
		},

		_drawByRenderer: function(renderer) {
			var preRenderer = this._getPreRenderer(renderer);
			var preChartModel = preRenderer.chartModel;
			renderer.draw(preChartModel);
		},

		getSettings: function() {
			return this.settings;
		},

		setChartSetting: function(chartSetting) {
			var w = chartSetting.width ? chartSetting.width - Y_LABEL_WIDTH : this.chartSetting
					.get('width');
			var h = chartSetting.height ? chartSetting.height - X_LABEL_HEIGHT : this.chartSetting
					.get('height');

			this.chartSetting.set({
				width: w,
				height: h
			});
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
				// this.$seriesGroup.prepend(g);
				var dataSource = this.dataSourceManager.createDataSource(seriesSettings);
				this._createChartRenderer(g, dataSource, seriesSettings);
				promises.push(dataSource.getData(seriesSettings, this.chartSetting
						.get('dispDataSize'), this.chartSetting.get('keepDataSize')));
			}
			return $.when.apply($, promises);
		},

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
			// this._startUpdate(settings);
		},

		_startUpdate: function(settings) {
			if (this.interval != null) {
				clearInterval(this.interval);
			}

			if (settings.url != null) {
				this.interval = setInterval(this.own(function() {
					this._updateChart(settings);
				}), 1);
			}
		},

		_updateChart: function(settings) {
			var that = this;
			this.chartLogic.getData(settings.url, true).done(function(data) {
				that.addData('', data);
			});
		},

		addData: function(data, commonData) {
			// if (this._addedCount >= REFRESH_SIZE) {
			// this.draw(); // メモリリーク回避のため、再描画する
			// this._addedCount = 0;
			// }

			var individualSeries = [];

			for (var i = 0, len = data.length; i < len; i++) {
				var name = data[i].name;
				individualSeries.push(name);
				// var series = this.settings.series;
				// for (var j=0, len=series.length; j<len; j++) {
				// if(series[j].name === name) {
				// series[j].data.push(data[i].data);
				// series[j].data.pop();
				// break;
				// }
				// }
				this._renderers[name].addData(data[i].data);
			}

			var renderers = this._renderers;
			for ( var name in renderers) {
				if ($.inArray(name, individualSeries) !== -1) {
					continue;
				}
				renderers[name].addData(commonData);
			}

			// チャートを左にスライドする
			var translateX = this.chartSetting.get('translateX');
			this.chartSetting.set('translateX', translateX - this.chartSetting.get('dx'));

			this._addedCount++;
		},



		go: function(num) {
			var movedNum = this.chartSetting.get('movedNum');
			var move = Math.min(movedNum, num);
			for ( var name in this._renderers) {
				var dataSource = this._renderers[name].dataSource;
				var rightEndId = dataSource.sequence.current() - movedNum;
				var leftEndId = rightEndId - this.chartSetting.get('dispDataSize');
				for (var i = 0; i < move; i++) {
					var item = dataSource.dataModel.get(rightEndId + i);
					this._renderers[name].updateChart(item, leftEndId, false);
				}
			}
			var translateX = this.chartSetting.get('translateX');
			this.chartSetting.set('translateX', translateX - this.chartSetting.get('dx') * move);
			this.chartSetting.set('movedNum', movedNum - move);
			return move;
		},

		back: function(num) {
			var movedNum = this.chartSetting.get('movedNum');
			for ( var name in this._renderers) {
				var dataSource = this._renderers[name].dataSource;
				var rightEndId = dataSource.sequence.current() - movedNum - 1;
				var leftEndId = rightEndId - this.chartSetting.get('dispDataSize');
				for (var i = 0; i < num; i++) {
					var item = dataSource.dataModel.get(leftEndId - i);
					this._renderers[name].updateChart(item, rightEndId, true);
				}
			}
			var translateX = this.chartSetting.get('translateX');
			this.chartSetting.set('translateX', translateX + this.chartSetting.get('dx') * num);
			this.chartSetting.set('movedNum', movedNum + num);
			return movedNum;
		},

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

			this.leftEndCandleStickId = Infinity;

			var firstRenderer = this._renderers[this.settings.series[0].name];
			this.dataSourceManager.setRange(firstRenderer.dataSource.sequence.current());
			this._initChart(firstRenderer); // チャート表示の初期化
			this._drawChart();// チャート情報の計算
		},

		'#series_group finishDrawing': function() {
			this._rendererQueue.shift();
			var renderer = this._rendererQueue[0];
			if (renderer != null) {
				this._drawByRenderer(renderer);
			}
		},

		'.chartElm mousemove': function(context, $el) {
			var seriesName = $el.parent().attr('id').slice(SERIES_PREFIX.length);
			var renderer = this._renderers[seriesName];
			var type = renderer.seriesSetting.type;
			var tooltipId = renderer.getTargetId(context, type);

			if (tooltipId == null) {
				return;
			}

			this.tooltip.id = tooltipId;
			this.tooltip.renderer = renderer;
			renderer.showToolTip(tooltipId, this.$tooltip);
		},

		'#movingGroup removeTooltip': function(context) {
			if (context.evArg == this.tooltip.id) {
				this.$tooltip.empty();
				this.tooltip.id = null;
				this.tooltip.renderer = null;
			}
		},

		'{rootElement} click': function() {
			this.$tooltip.empty();
		}
	};

	h5.core.expose(chartController);
})(jQuery);