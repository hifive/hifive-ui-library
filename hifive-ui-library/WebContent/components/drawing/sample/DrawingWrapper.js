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
	var DEFAULT_SETTING = {
		color: '#0000ff',
		width: '3',
		drawable: true
	};
	var controller = {
		/**
		 * @memberOf sample.DrawingWrapperController
		 */
		__name: 'sample.DrawingWrapperController',

		drawingController: h5.ui.components.drawing.DrawingController,

		__ready: function() {
			// デフォルト値設定
			this.$find('[name=drawable]').prop('checked', DEFAULT_SETTING.drawable);
			this.$find('[name=width]').val(DEFAULT_SETTING.width);
			this.$find('[name=color]').val(DEFAULT_SETTING.color);

			this.drawingController.isDrawMode = DEFAULT_SETTING.drawable;
			this.drawingController.lineWidth = DEFAULT_SETTING.width;
			this.drawingController.lineColor = DEFAULT_SETTING.color;
		},

		'[name=drawable] change': function(context, $el) {
			this.drawingController.isDrawMode = $el.prop('checked');
		},
		'[name=color] keyup': function(context, $el) {
			this.drawingController.lineColor = $el.val();
		},
		'[name=width] keyup': function(context, $el) {
			this.drawingController.lineWidth = $el.val();
		}
	};
	h5.core.expose(controller);
})();