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

		dividedBoxController: h5.ui.components.DividedBox.DividedBox,

		__meta: {
			dividedBoxController: {
				rootElement: '> .dividedBox'
			}
		},

		__init: function() {
			var $root = $(this.rootElement);
			if ($root.hasClass('fixedSizeSample')) {
				this.$find('.box').each(this.ownWithOrg(function(orgThis) {
					this.view.append(orgThis, 'fixedSize-box-contents-template');
				}));
			}
			if ($root.hasClass('insertSample')) {
				for (var i = 0; i < 3; i++) {
					this.view.append(this.$find('.dividedBox'), 'insert-box-template');
				}
			}
		},

		__ready: function() {
			this.$dividedBox = $(this.dividedBoxController.rootElement);
			// 入れ子になっているdividedBox要素にもバインド
			var childDividedBoxControllers = this._childDividedBoxControllers = [];
			this.$dividedBox.find('.dividedBox').each(function() {
				var c = h5.core.controller(this, h5.ui.components.DividedBox.DividedBox);
				childDividedBoxControllers.push(c);
			});
		},

		'.fixSize click': function(context, $el) {
			this.dividedBoxController.fixSize($el.closest('.box'));
		},

		'.unfixSize click': function(context, $el) {
			this.dividedBoxController.unfixSize($el.closest('.box'));
		},

		'.appendDiv click': function() {
			this.view.append(this.$dividedBox, 'appendSample-box-template');
		},

		'.insert click': function(context, $el) {
			var $target = $el.parent('.box');
			var index = this.$dividedBox.find('.box').index($target);
			if ($el.hasClass('after')) {
				index++;
			}
			this.dividedBoxController.insert(index, this.view.get('insert-box-template'));
		},

		'.remove click': function(context, $el) {
			var $target = $el.parent('.box');
			var index = this.$dividedBox.find('.box').index($target);
			this.dividedBoxController.remove(index);
		},

		'[name="size"] change': function(ctx, $el) {
			var size = $el.val();
			var tmp = size.split('*');
			this.$dividedBox.css({
				width: tmp[0],
				height: tmp[1]
			});
		},

		'.refresh click': function() {
			for (var i = 0, l = this._childDividedBoxControllers.length; i < l; i++) {
				this._childDividedBoxControllers[i].refresh();
			}
			this.dividedBoxController.refresh();
		},

		'.showIndicator click': function(ctx, $el) {
			var $target = $(this.dividedBoxController.rootElement);
			this.currentIndicator = this.indicator({
				target: $target
			});
			this.currentIndicator.show();
			this.$find('.hideIndicator').css('display', 'inline-block');
			$el.css('display', 'none');
		},
		'.hideIndicator click': function(ctx, $el) {
			if (this.currentIndicator) {
				this.currentIndicator.hide();
			}
			this.$find('.showIndicator').css('display', 'inline-block');
			$el.css('display', 'none');
		}
	};
	$('.sample').each(function() {
		h5.core.controller(this, sampleController);
	});

});