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

	//var inst = Operation.create();

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

		_stageController: h5.ui.components.stage.StageController,

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

		__ready: function() {
			this._stageController.setup(stageInitParam);

			var container = DisplayUnitContainer.create();
			container.setRect(Rect.create(0, 100, 1000, 200));

			for (var i = 0, len = 5; i < len; i++) {
				var rect = Rect.create(i * 80 + 4, 10, 80, 40);
				var unit = this._createDU(rect);
				container.addDisplayUnit(unit);
			}

			this._stageController.getLayer(LAYER_ID_MAIN).addDisplayUnit(container);
		}
	};


	$(function() {
		h5.core.controller('#appRoot', controller);

		var obj = {
			_rp: 10
		};
		Object.defineProperty(obj, "rp", {
			configurable: false,
			enumerable: true,
			get: function() {
				return this._rp;
			}
//			set: function(value) {
//				this[PROPERTY_BACKING_STORE_PREFIX + p] = value;
//			}
		});

//		var a = obj.rp;
//		obj.rp = 30;

	});

})(jQuery);
