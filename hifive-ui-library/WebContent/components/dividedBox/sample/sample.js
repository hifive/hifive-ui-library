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
$(function() {

	var sampleController = {

		__name: 'sampleController',

		dividedBoxController: h5.ui.container.DividedBox,

		__meta: {
			dividedBoxController: {
				rootElement: '> ._dividedBox'
			},
		},

		'.insert click': function() {
			this.dividedBoxController.insert(1,
					'<div class="box" style="/*width:500px;*/background-color:orange;"></div>');
		},

		'.addDiv click': function() {
			var dividedBox = $(this.dividedBoxController.rootElement);
			var last = dividedBox.find('.box:last').width('-=100px;');
			var addDiv = $('<div class="box" style="width:100px;background-color:orange;"></div>')
					.css({
						left: last.position().left + last.width()
					});
			dividedBox.append(addDiv);
		},

		'.refresh click': function() {
			this.dividedBoxController.refresh();
		}
	};
	$('.sample').each(function() {
		h5.core.controller(this, sampleController);
	});

});