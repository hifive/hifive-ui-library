/*
 * Copyright (C) 2016 NS Solutions Corporation
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
	'use strict';

	var LAYER_ID_MAIN = 'main';

	var BasicDisplayUnit = h5.ui.components.stage.BasicDisplayUnit;
	var DisplayUnitContainer = h5.ui.components.stage.DisplayUnitContainer;
	var Layer = h5.ui.components.stage.Layer;
	var Rect = h5.ui.components.stage.Rect;

	var stageInitParam = {
		layers: [{
			id: LAYER_ID_MAIN
		}]
	};

	var controller = {
		/**
		 * @memberOf hifive.ui.components.sample.stage.AppController
		 */
		__name: 'h5.ui.components.stage.SampleAppController',

		__meta: {
			_stageController: {
				rootElement: '#stageRoot'
			}
		},

		_stageController: h5.ui.components.stage.StageController,

		'[name="moveTo"] click': function(context, $el) {
			this._units[2].moveTo(100, 100);
		},

		'[name="moveBy"] click': function(context, $el) {
			this._units[1].moveBy(50, 50);
		},

		'[name="stageScrollTo"] click': function(context) {
			this._stageController.scrollTo(100, 50);
		},

		'[name="stageScrollBy"] click': function(context) {
			//y軸は下向きが正なので、-10すると見た目的には
			//オブジェクトは下に動いたように見える
			this._stageController.scrollBy(-10, -10);
		},

		'[name="scaleX"] change': function(context, $el) {
			var val = $el.val() / 100;
			this._stageController.setScale(val, val);
		},

		'[name="scaleY"] change': function(context, $el) {
			var val = $el.val();
			this._stageController.setScaleY(val / 100);
		},

		'[name="getScrollPosition"] click': function() {
			var pos = this._stageController.getScrollPosition();
			var str = pos.x + ', ' + pos.y;
			this.$find('#scrollPos').text(str);
		},

		_createDU: function(rect) {
			var unit = BasicDisplayUnit.create();
			unit.setRect(rect);
			unit.extraData = {
				userText: 'User-defined text'
			};

			//TODO 引数はsvgではなくこのUnitインスタンス
			unit.setRenderer(function(graphics, du) {
				var rect2 = graphics.drawRect();
				rect2.setAttributes({
					x: 10,
					y: 0,
					width: 20,
					height: 20
				});

				//				var vLayout = VerticalLayout.create();
				//				vLyaout.add(rect1, rect2, rect3).align();

				var rect2 = graphics.drawRect();
				rect2.setAttributes({
					x: 30,
					y: 0,
					width: 20,
					height: 20
				});

				var text = graphics.drawText();
				text.setText(du.extraData.userText);
				text.setAttributes({
					x: 0,
					y: 10,
					'font-fize': 10
				});
			});

			return unit;
		},

		_units: [],

		__ready: function() {
			this._stageController.setup(stageInitParam);

			var container = DisplayUnitContainer.create();
			container.setRect(Rect.create(0, 100, 1000, 200));

			for (var i = 0, len = 5; i < len; i++) {
				var rect = Rect.create(i * 80 + 4, 10, 80, 40);
				var unit = this._createDU(rect);
				container.addDisplayUnit(unit);
				this._units.push(unit);
			}

			this._stageController.getLayer(LAYER_ID_MAIN).addDisplayUnit(container);
		}
	};


	$(function() {
		h5.core.controller('#appRoot', controller);
	});

})(jQuery);
