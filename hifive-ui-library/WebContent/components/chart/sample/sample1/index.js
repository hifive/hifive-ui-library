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
(function() {

	var DUMMY_DATA_SIZE = 300;


	/**
	 * データ生成関数
	 */
	function createChartDummyData(median, vibration) {
		var ret = [];
		for (var i = 0; i < DUMMY_DATA_SIZE; i++) {
			ret.push({
				val: median + (Math.random() - 0.5) * vibration * 2
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
	 */
	function getRandomColor() {
		return colors[parseInt(Math.random() * colors.length)];
	}

	function createFillObj(name) {
		return {
			id: 'grad_' + name,
			x1: '0%',
			y1: '0%',
			x2: '0%',
			y2: '100%',
			stops: [{
				offset: '0%',
				color: getRandomColor()
			}, {
				offset: '100%',
				color: '#fff'
			}]
		};
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
		 * チャートに表示している系列の配列
		 *
		 * @memberOf ui.sample.chart.pageController
		 */
		_series: [],

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

		_chartController: h5.ui.components.chart.ChartController, // チャートライブラリ

		__meta: {
			_chartController: {
				rootElement: '#chart'
			}
		},

		__ready: function(context) {
			// 初期では、2系列表示
			for (var i = 0; i < 2; i++) {
				this._series.push(this._createNewSeries(true));
			}

			// 取得したデータをもとにチャートを表示
			this._chartController.draw({
				chartSetting: {
					width: this._width,
					height: this._height
				},
				axes: { // 軸の設定
					xaxis: { // x軸
						off: true
					//x軸に垂直な線を引かない
					},
					yaxis: { // y軸
						lineNum: 10, // y軸の補助線の数(上部は含む)
						fontSize: '7pt', // ラベルのフォントサイズ
						autoScale: function(min, max) { // オートスケールの定義
							return {
								rangeMax: Math.ceil(max / 500) * 500,
								rangeMin: 0
							};
						},
						range: { //Y軸の表示領域
							min: 0,
							max: 500
						}
					}
				},
				seriesDefault: { // すべての系列のデフォルト設定
					dispDataSize: 100,
					// 表示データ数
					mouseover: {
						tooltip: false
					}
				},
				series: this._series
			// 系列データ
			});
		},

		/**
		 * Goボタンを押下すると、データを(右に)１つ進める
		 */
		'#go click': function() {
			this.go();
		},

		go: function() {
			var movedNum = this._chartController.go(1);
			if (movedNum === 1) {
				return;
			}

			// 右端が最新のデータのときは、新しくデータを追加してあげる必要がある
			var addData = [];
			for (var j = 0, len = this._series.length; j < len; j++) {
				// すべての系列にデータを追加する
				// 内部では、nameをキーにしてdataを登録する
				addData.push({
					name: this._series[j].name,
					data: this._series[j].data[this._dataIndex % DUMMY_DATA_SIZE]
				});
			}

			// チャートにデータを追加する
			this._chartController.addData(addData);
			this._dataIndex++;
		},

		/**
		 * Backボタンを押下すると、1つ(左に)戻す (データの左端まで行くと、それ以上は戻らない)
		 */
		'#back click': function() {
			this._chartController.back(1);
		},

		/**
		 * チャートのサイズを縦横2倍ずつする
		 */
		'#expand click': function() {
			this._setChartSetting(this._width *= 2, this._height *= 2);
		},

		/**
		 * チャートのサイズを縦横1/2ずつする
		 */
		'#shrink click': function() {
			this._setChartSetting(this._width /= 2, this._height /= 2);
		},

		_setChartSetting: function(width, height) {
			this._chartController.setChartSetting({
				width: width,
				height: height
			});
		},

		/**
		 * 系列追加ボタンを押下すると、新しい系列を2倍にする
		 */
		'#addSeries click': function() {
			// 系列を追加する(配列で系列を指定)
			var newSeries = [this._createNewSeries(true)];
			this._chartController.addSeries(newSeries);
			this._series.concat(newSeries);
		},
		
		'#removeSeries click': function() {
		    var series = this._series.pop();
		    if (series != null) {
		    	this._chartController.removeSeries(series.name);		    	
		    }
		},

		'#start click': function() {
			if (this.interval != null) {
				clearInterval(this.interval);
				this.interval = null;
			}

			this.interval = setInterval(this.own(function() {
				this.go(1);
			}), 100);
		},

		'#stop click': function() {
			clearInterval(this.interval);
			this.interval = null;
		},

		/**
		 * 系列の定義オブジェクトを生成する
		 *
		 * @memberOf ui.sample.chart.pageController
		 * @returns {Object} 系列の定義オブジェクト
		 */
		_createNewSeries: function(isStacked) {
			var data = createChartDummyData(400, 100); // ダミーデータを生成

			// Goボタンを押し続けてダミーデータの最後までインデックスが進と、
			// 最初に戻ってデータを表示するので、系列ごとの保持するデータサイズ長を
			// 揃えるために、ループした分のデータを追加する。
			var newData = [];
			for (var i = 0, len = parseInt(this._dataIndex / DUMMY_DATA_SIZE) + 1; i < len; i++) {
				newData = newData.concat(data);
			}
			newData = newData.concat(data.slice(0, this._dataIndex % data.length));

			var name = 'series_' + this._series.length;
			// 系列定義
			return {
				name: name, //系列名(キーとして使用する)
				type: isStacked ? 'stacked_line' : 'line', // 線種(line, stacked_line, candleStick)
				data: newData, // データ
				propNames: { // チャートに表示するときに使用するプロパティ名
					y: 'val' // lineチャートのときは、yのプロパティ名を指定する(デフォルトはy)
				},
				fillColor: isStacked ? createFillObj(name) : undefined, // stacked_lineのときの塗りつぶす色の指定
				color: isStacked ? getRandomColor() : 'black', // 線の色
				animateNum: 20
			// 系列を追加するときのアニメーションの回数(何分割するか)
			};
		}
	};

	h5.core.expose(pageController);
})();

$(function() {
	h5.core.controller('body', ui.sample.chart.pageController);
})