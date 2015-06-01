(function($) {

	// =========================================================================
	//
	// 外部定義のインクルード
	//
	// =========================================================================

	// =========================================================================
	//
	// スコープ内定数
	//
	// =========================================================================

	// =========================================================================
	//
	// スコープ内静的プロパティ
	//
	// =========================================================================

	// =============================
	// スコープ内静的変数
	// =============================

	// =============================
	// スコープ内静的関数
	// =============================

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================
	// ロジック
	var pageLogic = {
		__name: 'ui.sample.chart.PageLogic',

		_getDataFromServer: function(url) {
			return h5.ajax({
				url: url,
				type: 'GET',
				cache: false,
				dataType: 'json'
			});
		},

		getChartData: function(dataNum) {
			var dfd = this.deferred();
			this._getDataFromServer('../data/chartData.json').done(this.own(function(data) {
				this._data = data;
				dfd.resolve({
					data: data.slice(0, dataNum),
					ave: data.slice(0, dataNum - 3)
				});
			}));
			return dfd.promise();
		},

		getUpdateChartData: function(index) {
			var dfd = this.deferred();
			var ret = {
				data: this._getData(index),
				ave: this._getData(index - 3)
			};
			return dfd.resolve(ret).promise();
		},

		_getData: function(index) {
			return this._data[index % this._data.length];
		},


		/**
		 * チャートデータの最小値と最大値からグラフの描画範囲を取得し *
		 * 
		 * @memberOf ui.sample.chart.PageLogic
		 * @param min {Number} チャートデータの最小値
		 * @param max {Number} チャートデータの最大値
		 * @returns {Object} 最小値と最大値を持つオブジェクト
		 */
		getScaleRange: function(min, max) {
			return {
				rangeMax: max,
				rangeMin: min
			};
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(pageLogic);
})(jQuery);
(function($) {

	// =========================================================================
	//
	// 外部定義のインクルード
	//
	// =========================================================================
	var h5format = h5.u.str.format;

	// =========================================================================
	//
	// スコープ内定数
	//
	// =========================================================================
	var DISP_SIZE_ARRAY = [2, 4, 6, 8, 12, 24]; // 表示データ数

	var VERT_PARTITION_NUM = 12;

	var KEEP_DATA_SIZE = 24 * VERT_PARTITION_NUM + 1; // メモリ上に保持するデータ量

	var WIDTH = 640;
	var HEIGHT = 260;

	var DATE_FORMAT = '{0}.{1}.{2}';

	var TOOLTIP_DAYTIME_FORMAT = '{0} {1} - {2}';

	// =========================================================================
	//
	// スコープ内静的プロパティ
	//
	// =========================================================================

	// =============================
	// スコープ内静的変数
	// =============================

	// =============================
	// スコープ内静的関数
	// =============================
	function formatDate(date) {
		var splitedStr = date.split('-');
		return h5format(DATE_FORMAT, splitedStr[0], splitedStr[1], splitedStr[2]);
	}

	function getDate(openTm) {
		return formatDate(openTm.split(' ')[0]);
	}

	function getTime(openTm) {
		return openTm.split(' ')[1];
	}

	function getTooltipTimeStr(openTm, closeTm, interval) {
		var date = getDate(openTm);
		return h5format(TOOLTIP_DAYTIME_FORMAT, date, getTime(openTm), getTime(closeTm));
	}

	function getLabel(time, interval) {
		return getTime(time);
	}

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================

	// コントローラ定義
	var pageController = {
		__name: 'ui.sample.chart.PageController',

		__templates: 'chart.ejs',

		_chartBoxLogic: ui.sample.chart.PageLogic,

		_chartController: h5.ui.components.chart.ChartController, // チャートライブラリ

		_currentDispSizeIndex: 1, // 表示データ数の配列で現在指定しているインデックス

		_series: [], // 表示データの系列の配列

		__meta: {
			_chartController: {
				// チャートを#chartにバインド
				rootElement: '#chart'
			}
		},

		__ready: function(context) {
			this._draw();
		},

		_draw: function() {
			var dataNum = this.$find('#initDataNum').val();
			var type = this.$find('#type').val();
			var aveNum = this.$find('#aveNum').val();
			this._chartBoxLogic.getChartData(dataNum).done(this.own(function(resp) {
				this._index = resp.data.length;
				// サーバからチャートの初期値を取得
				var series = this._createSeries(resp, type, aveNum);
				this._drawChart(series);
			}));
		},

		/**
		 * チャート
		 * 
		 * @memberOf ui.sample.chart.PageController
		 * @param series 表示する系列のデータと設定
		 */
		_drawChart: function(series) {
			this._chartController.draw({
				chartSetting: {
					// チャートの幅(ラベルも含む)
					width: WIDTH,
					// チャートの高さ(ラベルも含む)
					height: HEIGHT
				},
				plotSetting: {
					paddingRight: 0.5,
					marginRight: 30
				},
				axes: {
					xaxis: {
						// 縦軸の補助線の数(枠線、両端の線を含まない)
						lineNum: VERT_PARTITION_NUM - 1,
						formatter: this.own(this._formateXLabel),
						height: 50
					},
					yaxis: {
						// 横軸の補助線の数(枠線を含まない)
						lineNum: 7,
						// オートスケールの戦略
						autoScale: this._chartBoxLogic.getScaleRange,
						fontSize: 10,
						marginRight: 5,
						width: 85
					}
				},
				seriesDefault: {
					// (チャート全体の)表示データ数
					dispDataSize: DISP_SIZE_ARRAY[this._currentDispSizeIndex] * VERT_PARTITION_NUM
							+ 1,
					// 保持データ数(表示するデータの最大数を指定する)
					keepDataSize: KEEP_DATA_SIZE,
					mouseover: {
						tooltip: {
							content: this.own(this._getTooltipContent)
						}
					}
				},
				// 表示する系列のデータと設定
				series: series
			});
		},

		_createSeries: function(resp, type, aveNum) {
			this._series = [];
			this._series.push({
				name: 'data',
				type: type,
				data: resp.data,
				// 表示に指定するプロパティ名を指定する
				// 線種(type)がlineのときはxとy
				propNames: type !== 'line' ? null : {
					x: 'closeTm', // x軸のラベルに使用するプロパティ名
					y: 'close' // y座標の値として使用するプロパティ名
				}
			});
			if (aveNum == 1) {
				this._series.push({
					name: 'ave',
					type: 'line',
					data: resp.ave,
					propNames: {
						x: 'time',
						y: 'high'
					},
					color: 'green', // 折れ線の色
					mouseover: {
						tooltip: false
					// falseを指定するとその系列はツールチップを表示しない
					},
					axis: {
						yaxis: {
							autoscale: false
						// falseを指定するとその系列はオートスケールの対象としない
						}
					}
				});
			}
			return this._series;
		},

		/**
		 * 日付が変わって最初のデータかを判定する(日中足用)
		 * 
		 * @memberOf ui.sample.chart.PageController
		 * @param closeTm
		 * @returns {Boolean}
		 */
		_isFirstOfDay: function(closeTm) {
			var currentDate = getDate(closeTm);
			var preDataDay = this._preDataDate; // 前のデータの日付(一番最初はnull)

			this._preDataDate = currentDate;

			return preDataDay !== currentDate;
		},

		/**
		 * ツールチップの内容を作成する
		 * 
		 * @memberOf ui.sample.chart.PageController
		 * @param data
		 * @returns
		 */
		_getTooltipContent: function(data) {
			return this.view.get('tooltip', {
				open: data.open,
				close: data.close,
				high: data.high,
				low: data.low,
				time: getTooltipTimeStr(data.openTm, data.closeTm, this._interval)
			});
		},

		/**
		 * x軸のラベルを設定する(日中足用)
		 * 
		 * @memberOf ui.sample.chart.PageController
		 * @param value
		 * @param data
		 * @param index
		 * @returns
		 */
		_formateXLabel: function(value, data, index) {
			if (this._isFirstOfDay(data.closeTm)) {
				// 改行は<br>であらわす
				return getDate(data.closeTm) + '<br>' + getTime(data.closeTm);
			}
			return getLabel(data.closeTm, this._interval);
		},

		/**
		 * チャートの拡縮(表示データ数の増加・減少)をする。 チャート部品では、データ数を指定できるだけなので、実際の拡縮は表示データ数の指定を変
		 * 
		 * @memberOf ui.sample.chart.PageController
		 * @param context
		 * @param $elm
		 */
		'div.buttons button click': function(context, $elm) {
			var id = $elm.attr('id'); // idでplus/minusを指定

			if (id === 'minus' && this._currentDispSizeIndex < DISP_SIZE_ARRAY.length - 1) {
				// -ボタンを押してインデックスが最大値に達していないとき
				// 縮小する = 表示数を増やす
				this._currentDispSizeIndex++;
			} else if (id === 'plus' && this._currentDispSizeIndex > 0) {
				// +ボタンを押してインデックスが最小値(0)に達していないとき
				// 拡大する = 表示数を減らす
				this._currentDispSizeIndex--;
			} else {
				return;
			}

			// x軸のラベルの書き換えが起こるので、フラグを初期化
			this._preDataDate = null;

			// 新しい表示数を設定する
			this._chartController.setSeriesDefault({
				dispDataSize: DISP_SIZE_ARRAY[this._currentDispSizeIndex] * 12 + 1
			});
		},

		'#add click': function() {
			this._chartBoxLogic.getUpdateChartData(this._index).done(this.own(function(resp) {
				var addData = [];
				// すべての系列にデータを追加する
				// 内部では、nameをキーにしてdataを登録する
				addData.push({
					name: 'data',
					data: resp.data
				});

				addData.push({
					name: 'ttm',
					data: {
						x: null,
						y: this._ttm
					}
				});

				if (this.$find('#aveNum').val() == 1) {
					addData.push({
						name: 'ave',
						data: resp.ave
					});
				}

				// チャートにデータを追加する
				this._chartController.addData(addData);

				this._index++;
			}));

		},

		'#draw submit': function(context) {
			context.event.preventDefault();
			this._draw();
		},

		'#sc_buttons button click': function(context, $el) {
			var $target = $(context.event.target);
			this.$find('#initDataNum').val($target.data('initNum'));
			this.$find('#type').val($target.data('type'));
			this.$find('#aveNum').val($target.data('aveNum'));
			this._draw();
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(pageController);
})(jQuery);

$(function() {
	h5.core.controller('body', ui.sample.chart.PageController);
});