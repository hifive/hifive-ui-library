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
		horizontalDBController: h5.ui.container.DividedBox,
		yellowSBController: h5.ui.container.StateBox,
		greenSBController: h5.ui.container.StateBox,
		purpleSBController: h5.ui.container.StateBox,
		blueSBController: h5.ui.container.StateBox,
		orangeSBController: h5.ui.container.StateBox,
		__meta: {
			verticalDBController: {
				rootElement: '._dividedBox.horizontal'
			},
			horizontalDBController: {
				rootElement: '._dividedBox.vertical'
			},
			yellowSBController: {
				rootElement: '.state-container.yellow'
			},
			greenSBController: {
				rootElement: '.state-container.green'
			},
			purpleSBController: {
				rootElement: '.state-container.purple'
			},
			blueSBController: {
				rootElement: '.state-container.blue'
			},
			orangeSBController: {
				rootElement: '.state-container.orange'
			}
		},

		__init: function() {
			var methods = ['fitToContents', 'minimize', 'maximize', 'hide'];
			this.$find('.box').each(
					function() {
						var $this = $(this);
						for (var i = 0, l = methods.length; i < l; i++) {
							$(this).append(
									'<button style="display:block!important;position:absolute;left:3px;top:'
											+ (30 + i * 30) + 'px" class="btn btn-xs ' + methods[i]
											+ '">' + methods[i] + '</div>');
						}
					});
		},

		_getTargetDvidedBoxCtrlAndIndexByBox: function($box) {
			var $element = $box.parent('._dividedBox');
			var index = $element.find('>.dividedbox-managed:not(.divider)').index($box);
			var targetDbCtrl;
			if ($element[0] === this.verticalDBController.rootElement) {
				targetDbCtrl = this.verticalDBController;
			} else if ($element[0] === this.horizontalDBController.rootElement) {
				targetDbCtrl = this.horizontalDBController;
			}
			return {
				targetDbCtrl: targetDbCtrl,
				index: index
			};
		},

		_getResizeOption: function() {
			var partition = this.$find('[name="partition"]:checked').val();
			return {
				partition: partition
			};
		},

		'.fitToContents click': function(context, $el) {
			var $box = $el.parent('.box');
			var target = this._getTargetDvidedBoxCtrlAndIndexByBox($box);
			var opt = this._getResizeOption();
			target.targetDbCtrl.fitToContents(target.index, opt);
		},

		'.minimize click': function(context, $el) {
			var $box = $el.parent('.box');
			var target = this._getTargetDvidedBoxCtrlAndIndexByBox($box);
			var opt = this._getResizeOption();
			target.targetDbCtrl.minimize(target.index, opt);
		},

		'.maximize click': function(context, $el) {
			var $box = $el.parent('.box');
			var target = this._getTargetDvidedBoxCtrlAndIndexByBox($box);
			var opt = this._getResizeOption();
			target.targetDbCtrl.maximize(target.index, opt);
		},

		'.hide click': function(context, $el) {
			var $box = $el.parent('.box');
			var target = this._getTargetDvidedBoxCtrlAndIndexByBox($box);
			var opt = this._getResizeOption();
			target.targetDbCtrl.hide(target.index, opt);
		},

		'.set-state click': function(context, $el) {
			var $ctrlGroup = $el.parents('.control-group');
			var targetController = this[$ctrlGroup.find('[name="target"]').val() + 'SBController'];
			var state = this.$find('[name="state"]').val();
			targetController.setState(state);
		},

		'.show-box click': function(context, $el) {
			var $ctrlGroup = $el.parents('.control-group');
			var $box = this.$find('.box.' + $ctrlGroup.find('[name="target"]').val());
			var target = this._getTargetDvidedBoxCtrlAndIndexByBox($box);
			var opt = this._getResizeOption();
			target.targetDbCtrl.show(target.index, opt);
		},

		'.hide-divider click': function(context, $el){
			var $ctrlGroup = $el.parents('.control-group');
			var targetController = this[$ctrlGroup.find('[name="target"]').val() + 'DBController'];
			var index = $ctrlGroup.find('[name="index"]').val();
			targetController.hideDivider(parseInt(index));
		},

		'.show-divider click': function(context, $el){
			var $ctrlGroup = $el.parents('.control-group');
			var targetController = this[$ctrlGroup.find('[name="target"]').val() + 'DBController'];
			var index = $ctrlGroup.find('[name="index"]').val();
			targetController.showDivider(parseInt(index));
		}
	};
	h5.core.expose(sampleController);
})();
$(function() {
	h5.core.controller('.sample', sample.sampleController);
});