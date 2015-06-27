/*
 * Copyright (C) 2015 NS Solutions Corporation
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
(function() {

	var DUMMY_DATA_SIZE = 8;

	/**
	 * @class
	 * @memberOF ui.sample.chart
	 */
	var pageController = {
		/**
		 * @memberOf ui.sample.chart.pageController
		 */
		__name: 'ui.sample.chart.pageController',

		/**
		 * データ内の右端のインデックス
		 *
		 * @memberOf ui.sample.chart.pageController
		 */
		_dataIndex: 0,

		/**
		 * 初期幅
		 *
		 * @memberOf ui.sample.chart.pageController
		 */
		_width: 600,

		/**
		 * 初期高さ
		 *
		 * @memberOf ui.sample.chart.pageController
		 */
		_height: 480,

		_series: [],

		// チャートライブラリ
		_chart1Controller: h5.ui.components.chart.ChartController,
		_chart2Controller: h5.ui.components.chart.ChartController,

		__meta: {
			_chart1Controller: {
				rootElement: '#chart1'
			},
			_chart2Controller: {
				rootElement: '#chart2'
			}
		},

		__ready: function(context) {
			this._chart1Controller.draw({
				chartSetting: {
					width: this._width,
					height: this._height
				},
				axes: {
					axis: {
						interval: 2,
						num: DUMMY_DATA_SIZE,
						shape: 'polygon'
					}
				},
				seriesDefault: { // すべての系列のデフォルト設定
					// 表示データ数
					mouseover: {
						tooltip: {
							content: this.own(this._getTooltipContent)
						}
					},
					range: {
						minVal: 0,
						maxVal: 10
					}
				},
				series: [this._createNewSeries()]
			// 系列データ
			});

			this._chart2Controller.draw({
				chartSetting: {
					width: this._width,
					height: this._height
				},
				axes: {
					axis: {
						interval: 2,
						num: DUMMY_DATA_SIZE,
						shape: 'circle'
					}
				},
				seriesDefault: { // すべての系列のデフォルト設定
					// 表示データ数
					mouseover: {
						tooltip: {
							content: this.own(this._getTooltipContent)
						}
					},
					range: {
						minVal: 0,
						maxVal: 10
					}
				},
				series: [this._createNewSeries()]
			// 系列データ
			});
		},

		/**
		 * 系列の定義オブジェクトを生成する
		 *
		 * @memberOf ui.sample.chart.pageController
		 * @returns {Object} 系列の定義オブジェクト
		 */
		_createNewSeries: function() {
			var data = ui.sample.chart.createChartDummyData(DUMMY_DATA_SIZE, 5, 5); // ダミーデータを生成

			var name = 'rader_series' + this._series.length;
			var color = ui.sample.chart.getRandomColor();
			// 系列定義
			return {
				name: name, //系列名(キーとして使用する)
				type: 'radar',
				data: data, // データ
				color: color,
				fillColor: color
			};
		},

		_getTooltipContent: function(data) {
			return data.label + ':' + data.val.toString();
		}
	};

	h5.core.expose(pageController);
})();

$(function() {
	h5.core.controller('body', ui.sample.chart.pageController);
});