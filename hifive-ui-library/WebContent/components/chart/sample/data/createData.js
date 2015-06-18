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
(function() {

	var COLORS = ['#1BA466', '#1E98B9', '#B2CF3E', '#7379AE', '#C23685', '#E06A3B', '#91DBB9',
			'#EEF5D3', '#FFFBD5', '#FCF1D3', '#F6D4D8', '#F3D1E5', '#EDD0E5', '#DEDFEF', '#CBE6F3',
			'#C9E8F1', '#68CFC3', '#81D674', '#EBF182', '#FBE481', '#EDA184', '#DF81A2', '#D27EB3',
			'#B492CC', '#8BA7D5', '#6CBAD8'];
	
	h5.u.obj.expose('ui.sample.chart', {
		/**
		 * データ生成関数
		 */
		createChartDummyData: function(dataSize, median, vibration) {
			var ret = [];
			for (var i = 0; i < dataSize; i++) {
				ret.push({
					label: 'データ' + (i+1),
					val: median + (Math.random() - 0.5) * vibration * 2
				});
			}
			return ret;
		},

		/**
		 * 色をランダムに指定
		 */
		getRandomColor: function () {
			return COLORS[parseInt(Math.random() * COLORS.length)];
		},

		createFillObj: function (name) {
			return {
				id: 'grad_' + name,
				x1: '0%',
				y1: '0%',
				x2: '0%',
				y2: '100%',
				stops: [{
					offset: '0%',
					color: ui.sample.chart.getRandomColor()
				}, {
					offset: '100%',
					color: '#fff'
				}]
			};
		}		
	});
})();