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

// ---- Logic ---- //
(function($) {
	var DATA_URL = './sample1.json';

	var gridSample1Logic = {
		__name: 'h5.ui.components.datagrid.sample1.GridSample1Logic',

		loadData: function() {
			return h5.ajax(DATA_URL, {
				dataType: 'json'
			});
		}
	};

	h5.core.expose(gridSample1Logic);

})(jQuery);


// ---- Controller ---- //
(function($) {
	var gridSample1Controller = {

		// --- コントローラの設定 --- //

		__name: 'h5.ui.components.datagrid.sample1.GridSample1Controller',

		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},


		// --- プロパティ --- //

		_gridSample1Logic: h5.ui.components.datagrid.sample1.GridSample1Logic,

		_gridController: h5.ui.components.datagrid.ComplexHeaderGridController,


		// --- ライフサイクル関連のメソッド --- //

		__ready: function() {
			this._gridSample1Logic.loadData().done(this.own(function(data) {

				this._gridController.init({

					// データの ID を取得するためのプロパティ名
					idKey: 'id',

					// データの配列
					data: data,

					// 各列にどのプロパティをどんな順で表示するか
					columns: [{
						propertyName: 'col20xx04Sum'
					}, {
						propertyName: 'col20xx04'
					}, {
						propertyName: 'col20xx05Sum'
					}, {
						propertyName: 'col20xx05'
					}, {
						propertyName: 'col20xx06Sum'
					}, {
						propertyName: 'col20xx06'
					}, {
						propertyName: 'col20xx07Sum'
					}, {
						propertyName: 'col20xx07'
					}, {
						propertyName: 'col20xx08Sum'
					}, {
						propertyName: 'col20xx08'
					}, {
						propertyName: 'col20xx09Sum'
					}, {
						propertyName: 'col20xx09'
					}, {
						propertyName: 'colAllSum'
					}, {
						propertyName: 'colAll'
					}],

					// 各セルは <a> タグで表現する
					defaultFormatter: function(cellData) {
						if (cellData.value == null) {
							return '';
						}
						var text = h5.u.str.escapeHtml(cellData.value);
						return '<a href="#">' + text + '</a>';
					}
				});
			}));
		}
	};

	h5.core.expose(gridSample1Controller);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', h5.ui.components.datagrid.sample1.GridSample1Controller);
});