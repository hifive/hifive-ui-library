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

	var DUMMY_DATA_SIZE = 5;


	/**
	 * データ生成関数
	 * @return
	 */
	function createChartDummyData(median, vibration) {
		var ret = [];
		for (var i = 0; i < DUMMY_DATA_SIZE; i++) {
			ret.push({
				label: 'データ' + (i + 1),
				val: parseInt(median + (Math.random() - 0.5) * vibration * 2)
			});
		}
		return ret;
	}

	var colors = ['#1BA466', '#1E98B9', '#B2CF3E', '#7379AE', '#C23685', '#E06A3B', '#91DBB9',
			'#EEF5D3', '#FFFBD5', '#FCF1D3', '#F6D4D8', '#F3D1E5', '#EDD0E5', '#DEDFEF', '#CBE6F3',
			'#C9E8F1', '#68CFC3', '#81D674', '#EBF182', '#FBE481', '#EDA184', '#DF81A2', '#D27EB3',
			'#B492CC', '#8BA7D5', '#6CBAD8'];

	/**
	 * 色をランダムに指定
	 * @return 
	 */
	function getRandomColor() {
		return colors[parseInt(Math.random() * colors.length)];
	}

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

		_chartController: h5.ui.components.chart.ChartController, // チャートライブラリ

		__meta: {
			_chartController: {
				rootElement: '#chart'
			}
		},

		__ready: function(context) {
			// 取得したデータをもとにチャートを表示
			var series = this._createNewSeries();

			this._chartController.draw({
				chartSetting: {
					width: this._width,
					height: this._height
				},
				seriesDefault: { // すべての系列のデフォルト設定
					// 表示データ数
					mouseover: {
						tooltip: {
							content: this.own(this._getTooltipContent)
						}
					},
					animateNum: 20
				},
				series: [series]
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
			var data = createChartDummyData(100, 50); // ダミーデータを生成

			var name = 'pie_series' + this._series.length;
			// 系列定義
			return {
				name: name, //系列名(キーとして使用する)
				type: 'pie',
				data: data, // データ
				propNames: { // チャートに表示するときに使用するプロパティ名
					y: 'val' 
				},
				colors: [getRandomColor(),getRandomColor(),getRandomColor(),getRandomColor(),getRandomColor()] 
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