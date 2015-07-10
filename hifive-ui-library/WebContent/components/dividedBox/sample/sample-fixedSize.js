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

	var sampleController = {
		__name: 'sample.sampleController',

		verticalDBController: h5.ui.container.DividedBox,
		__meta: {
			verticalDBController: {
				rootElement: '._dividedBox.vertical'
			}
		},

		__init: function() {
			this
					.$find('.box')
					.each(
							function() {
								var $this = $(this);
								$(this)
										.prepend(
												'<button class="btn btn-xs fixSize">fixSize()</div><button class="btn btn-xs unfixSize">unfixSize()</div>');
							});
		},

		_getTargetIndex: function($box) {
			var $element = $box.parent('._dividedBox');
			return $element.find('>.dividedbox-managed:not(.divider)').index($box);
		},

		'.fixSize click': function(context, $el) {
			var $box = $el.parent('.box');
			var index = this._getTargetIndex($box);
			this.verticalDBController.fixSize(index);
		},

		'.unfixSize click': function(context, $el) {
			var $box = $el.parent('.box');
			var index = this._getTargetIndex($box);
			this.verticalDBController.unfixSize(index);
		}
	};
	h5.core.expose(sampleController);
})();
$(function() {
	h5.core.controller('.sample', sample.sampleController);
});